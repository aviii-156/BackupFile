/**
 * fulfillment.controller.js
 *
 * Vendor-side endpoints:
 *   GET  /api/vendor/fulfillments               – list own fulfillments
 *   GET  /api/vendor/fulfillments/:id           – get one fulfillment with items
 *   POST /api/vendor/fulfillments/:id/respond   – accept / reject items (primary vendor)
 *   POST /api/vendor/fulfillments/:id/claim     – claim items (fallback vendor)
 *   PUT  /api/vendor/fulfillments/:id/status    – advance to out_for_delivery / delivered
 *
 * Patient-side endpoints (mounted on order router):
 *   GET  /api/order/:id/fulfillments            – view all vendor fulfillments for an order
 */

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { apiResponse } from '../utils/apiResponse.js';
import VendorFulfillment from '../models/VendorFulfillment.js';
import Order from '../models/Order.js';
import {
  processVendorResponse,
  claimFallbackItems,
  advanceFulfillmentStatus,
} from '../services/orderFulfillment.service.js';
import { getIO } from '../config/socket.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';

// ── Vendor: list fulfillments ──────────────────────────────────────────────────

/**
 * @route  GET /api/vendor/fulfillments
 * @desc   List all VendorFulfillments assigned to this vendor
 * @access Vendor
 */
export const getVendorFulfillments = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { vendorId };
  if (status && status !== 'all') query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [fulfillments, total] = await Promise.all([
    VendorFulfillment.find(query)
      .populate('patientId', 'name phone email')
      .populate('parentOrderId', 'status paymentMethod paymentStatus totalAmount fallbackRadius')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    VendorFulfillment.countDocuments(query),
  ]);

  return apiResponse(res, 200, 'Fulfillments fetched', {
    fulfillments,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

// ── Vendor: get one fulfillment ───────────────────────────────────────────────

/**
 * @route  GET /api/vendor/fulfillments/:id
 * @desc   Get a single VendorFulfillment with all items and parent order info
 * @access Vendor
 */
export const getVendorFulfillmentById = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;

  const fulfillment = await VendorFulfillment.findOne({ _id: id, vendorId })
    .populate('patientId', 'name phone email')
    .populate('parentOrderId', 'status paymentMethod paymentStatus deliveryAddress totalAmount fallbackRadius fulfillmentStatus');

  if (!fulfillment) throw new ApiError(404, 'Fulfillment not found');

  return apiResponse(res, 200, 'Fulfillment fetched', { fulfillment });
});

// ── Vendor: respond to fulfillment (primary vendor) ────────────────────────────

/**
 * @route  POST /api/vendor/fulfillments/:id/respond
 * @desc   Primary vendor accepts/rejects individual items.
 *         Rejected items are automatically broadcast to nearby fallback vendors.
 * @access Vendor
 *
 * Body: {
 *   acceptedItemIds: string[],  // VendorFulfillment item _ids
 *   rejectedItemIds: string[],  // VendorFulfillment item _ids
 * }
 */
export const respondToFulfillment = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;
  const { acceptedItemIds = [], rejectedItemIds = [] } = req.body;

  if (!acceptedItemIds.length && !rejectedItemIds.length) {
    throw new ApiError(400, 'Provide at least one acceptedItemIds or rejectedItemIds');
  }

  // Fetch delivery coordinates from the parent order for broadcast radius
  const fulfillmentDoc = await VendorFulfillment.findOne({ _id: id, vendorId }).select(
    'parentOrderId isFallback'
  );
  if (!fulfillmentDoc) throw new ApiError(404, 'Fulfillment not found');
  if (fulfillmentDoc.isFallback) {
    throw new ApiError(400, 'Use /claim endpoint for fallback fulfillments');
  }

  const parentOrder = await Order.findById(fulfillmentDoc.parentOrderId).select(
    'deliveryAddress fallbackRadius'
  );

  const deliveryCoords = parentOrder?.deliveryAddress?.location?.coordinates
    ? {
        lng: parentOrder.deliveryAddress.location.coordinates[0],
        lat: parentOrder.deliveryAddress.location.coordinates[1],
      }
    : null;

  const { fulfillment, broadcastFulfillments } = await processVendorResponse(
    id,
    vendorId,
    acceptedItemIds,
    rejectedItemIds,
    deliveryCoords
  );

  // Notify patient
  try {
    const io = getIO();
    io.to(`user:${fulfillment.patientId}`).emit('fulfillment:updated', {
      fulfillmentId: fulfillment._id,
      status: fulfillment.status,
      parentOrderId: fulfillment.parentOrderId,
    });
    // Notify each new fallback vendor
    for (const fb of broadcastFulfillments) {
      io.to(`vendor:${fb.vendorId}`).emit('fulfillment:new', {
        fulfillmentId: fb._id,
        parentOrderId: fb.parentOrderId,
        isFallback: true,
      });
    }
  } catch (_) { /* socket not initialised in test/standalone mode */ }

  // Persist in-app notification to patient
  const acceptedCount = acceptedItemIds.length;
  const rejectedCount = rejectedItemIds.length;
  const notifMsg = acceptedCount > 0 && rejectedCount === 0
    ? 'The vendor has accepted your order and is preparing it.'
    : acceptedCount > 0
      ? `Vendor accepted ${acceptedCount} item(s). ${rejectedCount} item(s) are being sourced from nearby stores.`
      : 'Your items are being sourced from nearby stores.';

  createAndEmitNotification(
    fulfillment.patientId, 'patient', 'order_confirmed',
    'Order Confirmed',
    notifMsg,
    { orderId: fulfillment.parentOrderId, fulfillmentId: fulfillment._id }
  ).catch(() => {});

  // Notify new fallback vendors
  for (const fb of broadcastFulfillments) {
    createAndEmitNotification(
      fb.vendorId, 'vendor', 'new_order',
      'New Order Available',
      `New medicines to fulfil nearby — check your orders.`,
      { orderId: fb.parentOrderId, fulfillmentId: fb._id }
    ).catch(() => {});
  }

  return apiResponse(res, 200, 'Response recorded', {
    fulfillment,
    broadcastedTo: broadcastFulfillments.length,
  });
});

// ── Vendor: claim items (fallback vendor) ─────────────────────────────────────

/**
 * @route  POST /api/vendor/fulfillments/:id/claim
 * @desc   Fallback vendor claims (accepts) specific items from their broadcast fulfillment.
 *         Uses atomic update — if another vendor already claimed an item, returns it in
 *         `alreadyTaken`.
 * @access Vendor
 *
 * Body: { itemIds: string[] }  // VendorFulfillment item _ids to accept
 */
export const claimFulfillmentItems = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;
  const { itemIds = [] } = req.body;

  if (!itemIds.length) {
    throw new ApiError(400, 'Provide at least one itemId to claim');
  }

  const { claimed, alreadyTaken, fulfillment } = await claimFallbackItems(id, vendorId, itemIds);

  // Notify patient of new fallback fulfillment progress
  try {
    const io = getIO();
    io.to(`user:${fulfillment.patientId}`).emit('fulfillment:updated', {
      fulfillmentId: fulfillment._id,
      status: fulfillment.status,
      parentOrderId: fulfillment.parentOrderId,
      isFallback: true,
    });
  } catch (_) { /* socket not initialised in test/standalone mode */ }

  return apiResponse(res, 200, 'Claim processed', {
    claimed,
    alreadyTaken,
    fulfillment,
  });
});

// ── Vendor: advance delivery status ───────────────────────────────────────────

/**
 * @route  PUT /api/vendor/fulfillments/:id/status
 * @desc   Move fulfillment to out_for_delivery or delivered.
 *         Also decrements VendorInventory stock on delivery.
 * @access Vendor
 *
 * Body: { status: 'out_for_delivery' | 'delivered', note?: string }
 */
export const updateFulfillmentStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status) throw new ApiError(400, 'status is required');

  const fulfillment = await advanceFulfillmentStatus(id, vendorId, status, note);

  // Notify patient
  try {
    const io = getIO();
    io.to(`user:${fulfillment.patientId}`).emit('fulfillment:status', {
      fulfillmentId: fulfillment._id,
      status: fulfillment.status,
      parentOrderId: fulfillment.parentOrderId,
    });
  } catch (_) { /* socket not initialised in test/standalone mode */ }

  // Persist in-app notification to patient
  const statusMessages = {
    out_for_delivery: { title: 'Out for Delivery', msg: 'Your order is on the way! 😊' },
    delivered: { title: 'Order Delivered', msg: 'Your order has been delivered. Enjoy your medicines!' },
  };
  const notifData = statusMessages[fulfillment.status];
  if (notifData) {
    createAndEmitNotification(
      fulfillment.patientId, 'patient', 'order_status',
      notifData.title,
      notifData.msg,
      { orderId: fulfillment.parentOrderId, fulfillmentId: fulfillment._id, status: fulfillment.status }
    ).catch(() => {});
  }

  return apiResponse(res, 200, 'Fulfillment status updated', { fulfillment });
});

// ── Patient: view fulfillments for an order ────────────────────────────────────

/**
 * @route  GET /api/order/:id/fulfillments
 * @desc   Patient views a breakdown of all vendor fulfillments for their order.
 *         Shows primary vendor + any fallback vendors, each with their item lists.
 * @access Patient (owner of the order only)
 */
export const getOrderFulfillments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Verify ownership
  const order = await Order.findById(id).select('patientId fulfillmentStatus status items');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden');
  }

  const fulfillments = await VendorFulfillment.find({ parentOrderId: id })
    .populate('vendorId', 'storeName ownerName phone address location')
    .sort({ isFallback: 1, createdAt: 1 }); // primary vendor first

  return apiResponse(res, 200, 'Order fulfillments fetched', {
    order: {
      _id: order._id,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items,
    },
    fulfillments,
  });
});
