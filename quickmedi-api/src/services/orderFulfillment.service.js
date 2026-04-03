/**
 * orderFulfillment.service.js
 *
 * Core business logic for the partial-vendor-fulfillment system:
 *
 *  1. createPrimaryFulfillment  – called right after a parent Order is created
 *  2. processVendorResponse     – vendor accepts/rejects individual items
 *  3. broadcastRejectedItems    – fan-out rejected items to nearby fallback vendors
 *  4. claimFallbackItems        – atomic "first-vendor-wins" claim for fallback vendors
 *  5. recalcFulfillmentTotals   – recompute subtotal/total after items change status
 *  6. refreshParentFulfillmentStatus – keep Order.fulfillmentStatus in sync
 */

import mongoose from 'mongoose';
import Order from '../models/Order.js';
import VendorFulfillment from '../models/VendorFulfillment.js';
import VendorInventory from '../models/VendorInventory.js';
import Vendor from '../models/Vendor.js';
import { calculateDistance } from '../utils/calculateDistance.js';

// ── 1. Create primary fulfillment ──────────────────────────────────────────────

/**
 * Called immediately after Order.create() in createOrder controller.
 * Builds a VendorFulfillment containing every item in the order (all pending).
 *
 * @param {Object} order  - saved Mongoose Order document
 * @param {Object} vendor - saved Mongoose Vendor document
 * @returns {VendorFulfillment}
 */
export async function createPrimaryFulfillment(order, vendor) {
  const items = order.items.map((item) => ({
    parentItemId: item._id,
    inventoryId: item.inventoryId || undefined,
    medicineId: item.medicineId || undefined,
    medicineName: item.medicineName,
    genericName: item.genericName || '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    mrp: item.mrp,
    discount: item.discount || 0,
    itemStatus: 'pending',
  }));

  const fulfillment = await VendorFulfillment.create({
    parentOrderId: order._id,
    vendorId: vendor._id,
    patientId: order.patientId,
    items,
    status: 'pending_response',
    isFallback: false,
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    totalAmount: order.totalAmount,
    statusHistory: [{ status: 'pending_response', note: 'Order placed by patient' }],
  });

  return fulfillment;
}

// ── 2. Process vendor response ─────────────────────────────────────────────────

/**
 * Vendor supplies two arrays of VendorFulfillment item _ids:
 *   acceptedItemIds  – they can fulfil these
 *   rejectedItemIds  – they cannot fulfil these
 *
 * Side-effects:
 *   - Updates VendorFulfillment item statuses + overall status
 *   - Updates parent Order item statuses
 *   - Triggers broadcastRejectedItems for any rejected items
 *
 * @param {string}   fulfillmentId
 * @param {string}   vendorId          - must own the fulfillment
 * @param {string[]} acceptedItemIds   - fulfillment item _ids
 * @param {string[]} rejectedItemIds   - fulfillment item _ids
 * @param {Object}   [deliveryCoords]  - { lat, lng } of delivery address for broadcast radius
 * @returns {{ fulfillment, broadcastFulfillments }}
 */
export async function processVendorResponse(
  fulfillmentId,
  vendorId,
  acceptedItemIds,
  rejectedItemIds,
  deliveryCoords
) {
  const fulfillment = await VendorFulfillment.findOne({
    _id: fulfillmentId,
    vendorId,
    status: 'pending_response',
  });

  if (!fulfillment) {
    const err = new Error('Fulfillment not found or already responded');
    err.statusCode = 404;
    throw err;
  }

  // Validate all supplied ids belong to this fulfillment
  const fulfillmentItemIds = fulfillment.items.map((i) => i._id.toString());
  const allSupplied = [...acceptedItemIds, ...rejectedItemIds];
  const invalid = allSupplied.filter((id) => !fulfillmentItemIds.includes(id));
  if (invalid.length) {
    const err = new Error(`Item IDs not found in this fulfillment: ${invalid.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // ── Update each item inside VendorFulfillment ──────────────────────────────
  const acceptedSet = new Set(acceptedItemIds.map(String));
  const rejectedSet = new Set(rejectedItemIds.map(String));

  let acceptedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  const rejectedItems = [];

  for (const item of fulfillment.items) {
    const id = item._id.toString();
    if (acceptedSet.has(id)) {
      item.itemStatus = 'accepted';
      acceptedCount++;
    } else if (rejectedSet.has(id)) {
      item.itemStatus = 'rejected';
      rejectedCount++;
      rejectedItems.push(item);
    } else {
      pendingCount++; // vendor left this item unaddressed — stays pending
    }
  }

  // Determine overall fulfillment status
  if (pendingCount > 0) {
    // Vendor only partially responded — keep pending_response for now
    // (allow re-submission for remaining pending items)
    fulfillment.status = 'pending_response';
  } else if (acceptedCount > 0 && rejectedCount > 0) {
    fulfillment.status = 'partially_accepted';
  } else if (acceptedCount > 0) {
    fulfillment.status = 'accepted';
  } else {
    fulfillment.status = 'rejected';
  }

  fulfillment.respondedAt = new Date();
  fulfillment.statusHistory.push({
    status: fulfillment.status,
    note: `Vendor accepted ${acceptedCount}, rejected ${rejectedCount} item(s)`,
  });

  // Recalculate totals for accepted items only
  recalcFulfillmentTotals(fulfillment);

  await fulfillment.save();

  // ── Mirror per-item status onto parent Order ───────────────────────────────
  // Build arrays of parentItemIds to bulk-update
  const acceptedParentIds = fulfillment.items
    .filter((i) => i.itemStatus === 'accepted')
    .map((i) => i.parentItemId);

  const rejectedParentIds = fulfillment.items
    .filter((i) => i.itemStatus === 'rejected')
    .map((i) => i.parentItemId);

  if (acceptedParentIds.length) {
    await Order.updateOne(
      { _id: fulfillment.parentOrderId },
      {
        $set: {
          'items.$[elem].itemStatus': 'accepted',
        },
      },
      { arrayFilters: [{ 'elem._id': { $in: acceptedParentIds } }] }
    );
  }

  if (rejectedParentIds.length) {
    await Order.updateOne(
      { _id: fulfillment.parentOrderId },
      {
        $set: {
          'items.$[elem].itemStatus': 'rejected',
        },
      },
      { arrayFilters: [{ 'elem._id': { $in: rejectedParentIds } }] }
    );
  }

  // ── Broadcast rejected items to fallback vendors ───────────────────────────
  let broadcastFulfillments = [];
  if (rejectedItems.length > 0 && deliveryCoords) {
    const parentOrder = await Order.findById(fulfillment.parentOrderId);
    if (parentOrder) {
      broadcastFulfillments = await broadcastRejectedItems(
        parentOrder,
        rejectedItems,
        fulfillment.vendorId,
        deliveryCoords
      );
    }
  }

  // ── Update parent Order fulfillmentStatus ─────────────────────────────────
  await refreshParentFulfillmentStatus(fulfillment.parentOrderId);

  return { fulfillment, broadcastFulfillments };
}

// ── 3. Broadcast rejected items to nearby fallback vendors ─────────────────────

/**
 * Find active vendors within the order's fallbackRadius (excluding the primary vendor),
 * then create one VendorFulfillment per nearby vendor containing the rejected items.
 *
 * @param {Object}   parentOrder    - Mongoose Order document
 * @param {Array}    rejectedItems  - VendorFulfillment item subdocuments
 * @param {string}   excludeVendorId
 * @param {Object}   deliveryCoords - { lat, lng }
 * @returns {VendorFulfillment[]}
 */
export async function broadcastRejectedItems(
  parentOrder,
  rejectedItems,
  excludeVendorId,
  deliveryCoords
) {
  const radiusKm = parentOrder.fallbackRadius || 10;
  const { lat, lng } = deliveryCoords;

  // Find nearby vendors using MongoDB $nearSphere
  const nearbyVendors = await Vendor.find({
    _id: { $ne: excludeVendorId },
    approvalStatus: 'approved',
    isActive: true,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  })
    .limit(10)
    .select('_id storeName location deliveryAvailable fcmTokens');

  if (!nearbyVendors.length) return [];

  // Build a VendorFulfillment for each nearby vendor
  const fulfillmentDocs = nearbyVendors.map((vendor) => ({
    parentOrderId: parentOrder._id,
    vendorId: vendor._id,
    patientId: parentOrder.patientId,
    isFallback: true,
    status: 'pending_response',
    items: rejectedItems.map((item) => ({
      parentItemId: item.parentItemId,
      inventoryId: item.inventoryId,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      genericName: item.genericName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      mrp: item.mrp,
      discount: item.discount,
      itemStatus: 'pending',
    })),
    subtotal: rejectedItems.reduce((s, i) => s + (i.totalPrice || 0), 0),
    deliveryCharge: 0,
    totalAmount: rejectedItems.reduce((s, i) => s + (i.totalPrice || 0), 0),
    statusHistory: [{ status: 'pending_response', note: 'Broadcast: primary vendor rejected items' }],
  }));

  const created = await VendorFulfillment.insertMany(fulfillmentDocs, { ordered: false });
  return created;
}

// ── 4. Atomic claim for fallback vendors ───────────────────────────────────────

/**
 * A fallback vendor calls this to accept items from their broadcast VendorFulfillment.
 *
 * Uses MongoDB arrayFilters + conditional update to atomically claim items on the
 * parent Order — only succeeds if the item is still in 'rejected' state (not yet
 * claimed by another vendor).
 *
 * @param {string}   fulfillmentId  - the fallback VendorFulfillment
 * @param {string}   vendorId
 * @param {string[]} itemIds        - VendorFulfillment item _ids to accept
 * @returns {{ claimed: string[], alreadyTaken: string[] }}
 */
export async function claimFallbackItems(fulfillmentId, vendorId, itemIds) {
  const fulfillment = await VendorFulfillment.findOne({
    _id: fulfillmentId,
    vendorId,
    isFallback: true,
    status: 'pending_response',
  });

  if (!fulfillment) {
    const err = new Error('Fallback fulfillment not found or already responded');
    err.statusCode = 404;
    throw err;
  }

  const claimed = [];
  const alreadyTaken = [];

  for (const itemId of itemIds) {
    const fulfillmentItem = fulfillment.items.id(itemId);
    if (!fulfillmentItem) continue;

    // Atomic: only update if parent Order item is still 'rejected' (unclaimed)
    const result = await Order.findOneAndUpdate(
      {
        _id: fulfillment.parentOrderId,
        items: {
          $elemMatch: {
            _id: fulfillmentItem.parentItemId,
            itemStatus: 'rejected', // guard — must still be unclaimed
          },
        },
      },
      {
        $set: {
          'items.$[elem].itemStatus': 'reassigned',
          'items.$[elem].claimedByFulfillmentId': fulfillment._id,
        },
      },
      {
        arrayFilters: [
          {
            'elem._id': fulfillmentItem.parentItemId,
            'elem.itemStatus': 'rejected',
          },
        ],
        new: true,
      }
    );

    if (result) {
      // Successfully claimed
      fulfillmentItem.itemStatus = 'accepted';
      claimed.push(itemId);
    } else {
      // Another vendor already claimed this item
      fulfillmentItem.itemStatus = 'rejected';
      alreadyTaken.push(itemId);
    }
  }

  // Determine new fulfillment status
  const acceptedCount = fulfillment.items.filter((i) => i.itemStatus === 'accepted').length;
  const pendingCount = fulfillment.items.filter((i) => i.itemStatus === 'pending').length;

  if (acceptedCount === 0) {
    fulfillment.status = 'rejected';
  } else if (pendingCount === 0) {
    fulfillment.status = 'accepted';
  } else {
    fulfillment.status = 'partially_accepted';
  }

  recalcFulfillmentTotals(fulfillment);
  fulfillment.respondedAt = new Date();
  fulfillment.statusHistory.push({
    status: fulfillment.status,
    note: `Claimed ${claimed.length} item(s); ${alreadyTaken.length} already taken`,
  });

  await fulfillment.save();

  // Update parent fulfillmentStatus
  await refreshParentFulfillmentStatus(fulfillment.parentOrderId);

  return { claimed, alreadyTaken, fulfillment };
}

// ── 5. Recalculate fulfillment totals ─────────────────────────────────────────

/**
 * Mutates the fulfillment document in memory — caller must save().
 * Sums only accepted items.
 */
function recalcFulfillmentTotals(fulfillment) {
  const acceptedItems = fulfillment.items.filter((i) => i.itemStatus === 'accepted');
  fulfillment.subtotal = acceptedItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  fulfillment.totalAmount = fulfillment.subtotal + (fulfillment.deliveryCharge || 0);
}

// ── 6. Refresh parent Order fulfillmentStatus ──────────────────────────────────

/**
 * Derives the parent Order's fulfillmentStatus from the current state of all its items.
 *
 * Rules:
 *  - If every item is accepted or reassigned  → 'fulfilled'
 *  - If some items are accepted/reassigned     → 'partial'
 *  - If every item is rejected (no fallback)  → 'failed'
 *  - Otherwise                                → 'pending'
 */
export async function refreshParentFulfillmentStatus(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return;

  const statuses = order.items.map((i) => i.itemStatus || 'pending');
  const total = statuses.length;
  const resolved = statuses.filter((s) => s === 'accepted' || s === 'reassigned').length;
  const rejected = statuses.filter((s) => s === 'rejected').length;

  let fulfillmentStatus;
  if (resolved === total) {
    fulfillmentStatus = 'fulfilled';
  } else if (resolved > 0) {
    fulfillmentStatus = 'partial';
  } else if (rejected === total) {
    fulfillmentStatus = 'failed';
  } else {
    fulfillmentStatus = 'pending';
  }

  if (order.fulfillmentStatus !== fulfillmentStatus) {
    await Order.updateOne({ _id: orderId }, { $set: { fulfillmentStatus } });
  }
}

// ── 7. Advance fulfillment delivery status ─────────────────────────────────────

const FULFILLMENT_TRANSITIONS = {
  accepted: ['out_for_delivery'],
  partially_accepted: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

/**
 * Vendor advances the delivery pipeline for a fulfillment they own.
 *
 * @param {string} fulfillmentId
 * @param {string} vendorId
 * @param {string} newStatus  - 'out_for_delivery' | 'delivered'
 * @param {string} [note]
 */
export async function advanceFulfillmentStatus(fulfillmentId, vendorId, newStatus, note) {
  const fulfillment = await VendorFulfillment.findOne({ _id: fulfillmentId, vendorId });
  if (!fulfillment) {
    const err = new Error('Fulfillment not found');
    err.statusCode = 404;
    throw err;
  }

  const allowed = FULFILLMENT_TRANSITIONS[fulfillment.status] ?? [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Cannot move fulfillment from "${fulfillment.status}" to "${newStatus}"`
    );
    err.statusCode = 400;
    throw err;
  }

  fulfillment.status = newStatus;
  fulfillment.statusHistory.push({ status: newStatus, note: note || '' });

  if (newStatus === 'delivered') {
    fulfillment.deliveredAt = new Date();

    // Decrement stock for accepted items
    for (const item of fulfillment.items.filter((i) => i.itemStatus === 'accepted')) {
      if (item.inventoryId) {
        await VendorInventory.findByIdAndUpdate(item.inventoryId, {
          $inc: { stock: -item.quantity },
        });
      }
    }
  }

  await fulfillment.save();
  return fulfillment;
}
