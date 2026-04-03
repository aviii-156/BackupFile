import Order from '../models/Order.js';
import Prescription from '../models/Prescription.js';
import VendorInventory from '../models/VendorInventory.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { createPaymentIntent } from '../services/payment.service.js';
import { getIO } from '../config/socket.js';
import { calculateDistance } from '../utils/calculateDistance.js';
import { calculateDeliveryTime } from '../utils/calculateDeliveryTime.js';
import { sendOrderConfirmationSMS, sendOrderDeliveredSMS } from '../services/sms.service.js';
import { sendOrderConfirmedNotification, sendOrderStatusNotification, sendNewOrderNotificationToVendor } from '../services/notification.service.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import { createPrimaryFulfillment } from '../services/orderFulfillment.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    vendorId,
    prescriptionId,
    items,
    deliveryAddressId,
    paymentMethod,
    isEmergencyOrder,
    fallbackRadius = 10,   // NEW: radius (km) for fallback vendor broadcast
  } = req.body;

  // Validate vendor exists and is approved
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.approvalStatus !== 'approved' || !vendor.isActive) {
    throw new ApiError(400, 'Selected pharmacy is not available');
  }

  // Get user and delivery address
  const user = await User.findById(userId);
  const deliveryAddress = user.savedAddresses.id(deliveryAddressId);
  if (!deliveryAddress) {
    throw new ApiError(400, 'Invalid delivery address');
  }

  /**
   * CHANGED: Best-effort inventory check.
   * - If a medicine IS in the vendor's inventory and in stock → use inventory price.
   * - If a medicine is NOT found, out of stock, or expired → accept with client-supplied
   *   price and mark itemStatus 'pending'. The vendor will accept or reject it in their
   *   dashboard, triggering the fallback broadcast for rejected items.
   *
   * This replaces the previous hard-reject behaviour that prevented placing orders
   * containing unavailable medicines.
   */
  let subtotal = 0;
  const validatedItems = [];

  for (const item of items) {
    const inventory = item.inventoryId
      ? await VendorInventory.findOne({
          _id: item.inventoryId,
          vendorId,
          isAvailable: true,
          isExpired: { $ne: true },
        })
      : null;

    if (inventory && inventory.stock >= item.quantity) {
      // ── Available in vendor inventory ───────────────────────────────────────
      const itemTotal = inventory.vendorPrice * item.quantity;
      subtotal += itemTotal;
      validatedItems.push({
        inventoryId: item.inventoryId,
        medicineId: inventory.medicineId || null,
        medicineName: inventory.medicineName,
        genericName: inventory.genericName || item.genericName || '',
        quantity: item.quantity,
        unitPrice: inventory.vendorPrice,
        totalPrice: itemTotal,
        mrp: inventory.mrp || inventory.vendorPrice,
        discount: inventory.discount || 0,
        itemStatus: 'pending',   // awaiting vendor confirmation via fulfillment flow
      });
    } else {
      // ── Not available / not in stock – include with client-provided price ───
      // Client (frontend) must supply unitPrice for unavailable items.
      const unitPrice = item.unitPrice || 0;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;
      validatedItems.push({
        inventoryId: item.inventoryId || null,
        medicineId: item.medicineId || null,
        medicineName: item.medicineName,
        genericName: item.genericName || '',
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
        mrp: item.mrp || unitPrice,
        discount: 0,
        itemStatus: 'pending',   // vendor will accept/reject; triggers fallback on rejection
      });
    }
  }

  // Calculate delivery charge based on distance
  const distance = calculateDistance(
    deliveryAddress.location.coordinates[1],
    deliveryAddress.location.coordinates[0],
    vendor.location.coordinates[1],
    vendor.location.coordinates[0]
  );

  let deliveryCharge = 0;
  if (vendor.deliveryAvailable) {
    if (distance > vendor.deliveryRadius) {
      throw new ApiError(400, 'Delivery address is outside vendor delivery radius');
    }
    deliveryCharge = distance < 2 ? 30 : distance < 5 ? 50 : 80;
  }

  // Apply discount for pro users
  const discount = user.subscription === 'pro' ? subtotal * 0.05 : 0;

  const totalAmount = subtotal + deliveryCharge - discount;

  // Create payment intent for online payments
  let stripePaymentIntentId = null;
  let clientSecret = null;

  if (paymentMethod === 'online') {
    const paymentIntent = await createPaymentIntent(totalAmount, `Order for ${user.name}`);
    stripePaymentIntentId = paymentIntent.id;
    clientSecret = paymentIntent.client_secret;
  }

  // Create order
  const order = await Order.create({
    patientId: userId,
    vendorId,
    prescriptionId: prescriptionId || null,
    items: validatedItems,
    subtotal,
    deliveryCharge,
    discount,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    stripePaymentIntentId,
    deliveryAddress: {
      label: deliveryAddress.label,
      addressLine1: deliveryAddress.addressLine1,
      addressLine2: deliveryAddress.addressLine2,
      city: deliveryAddress.city,
      state: deliveryAddress.state,
      pincode: deliveryAddress.pincode,
      location: deliveryAddress.location,
    },
    isEmergencyOrder: isEmergencyOrder || false,
    estimatedDeliveryTime: calculateDeliveryTime(distance),
    // ── NEW: partial fulfilment fields ──────────────────────────────────────
    fallbackRadius: Math.min(Math.max(parseInt(fallbackRadius) || 10, 1), 50),
    fulfillmentStatus: 'pending',
  });

  // ── NEW: Create primary VendorFulfillment for the selected vendor ──────────
  // This is what appears in the vendor's dashboard. The vendor will respond
  // item-by-item, and rejected items will be broadcast to fallback vendors.
  let primaryFulfillment;
  try {
    primaryFulfillment = await createPrimaryFulfillment(order, vendor);
  } catch (err) {
    // Non-fatal: fulfillment creation failure should not roll back the order.
    // The system can recreate it through a retry or admin action.
    console.error('[createOrder] Failed to create primary fulfillment:', err.message);
  }

  // Update prescription if linked
  if (prescriptionId) {
    await Prescription.findByIdAndUpdate(prescriptionId, {
      $push: { orders: order._id },
    });
  }

  // Send notifications
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('order:created', { orderId: order._id });
    io.to(`vendor:${vendorId}`).emit('order:new', {
      orderId: order._id,
      fulfillmentId: primaryFulfillment?._id,
    });
  } catch (_) { /* socket not initialised in test/standalone mode */ }

  sendOrderConfirmationSMS(user.phone, order._id);
  sendOrderConfirmedNotification(user.fcmTokens, order._id, totalAmount);
  sendNewOrderNotificationToVendor(vendor.fcmTokens, order._id, totalAmount);

  // Persist in-app notifications
  createAndEmitNotification(
    vendorId, 'vendor', 'new_order',
    'New Order Received',
    `New order from ${user.name} — ₹${totalAmount}`,
    { orderId: order._id }
  ).catch(() => {});

  createAndEmitNotification(
    userId, 'patient', 'order_placed',
    'Order Placed Successfully',
    `Your order has been placed. ${order.paymentMethod === 'cod' ? 'Pay on delivery.' : 'Awaiting payment confirmation.'}`,
    { orderId: order._id }
  ).catch(() => {});

  return res.status(201).json(
    new ApiResponse(201, {
      order: {
        _id: order._id,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
      },
      fulfillmentId: primaryFulfillment?._id || null,
      clientSecret: clientSecret || null,
    }, 'Order created successfully')
  );
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(id)
    .populate('vendorId', 'name phone location address')
    .populate('prescriptionId', 'imageUrl detectedMedicines');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to view this order');
  }

  return res.status(200).json(new ApiResponse(200, order, 'Order retrieved successfully'));
});

export const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, status } = req.query;

  const query = { patientId: userId };
  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('vendorId', 'storeName name phone')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    }, 'Order history retrieved successfully')
  );
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const order = await Order.findById(id)
    .populate('vendorId', 'name phone location address')
    .select('status statusHistory riderLocation estimatedDeliveryTime deliveryAddress');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to track this order');
  }

  return res.status(200).json(new ApiResponse(200, order, 'Order tracking retrieved successfully'));
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to cancel this order');
  }

  // Only allow cancellation for pending or confirmed orders
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new ApiError(400, 'Order cannot be cancelled at this stage');
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.statusHistory.push({
    status: 'cancelled',
    note: reason,
  });

  await order.save();

  // Restore inventory stock
  for (const item of order.items) {
    await VendorInventory.findOneAndUpdate(
      { vendorId: order.vendorId, medicineId: item.medicineId },
      { $inc: { stock: item.quantity } }
    );
  }

  // Notify vendor
  io.to(`vendor:${order.vendorId}`).emit('order:cancelled', { orderId: order._id });

  createAndEmitNotification(
    order.vendorId, 'vendor', 'order_cancelled',
    'Order Cancelled',
    `Order #${order._id.toString().slice(-6).toUpperCase()} was cancelled by the customer.`,
    { orderId: order._id }
  ).catch(() => {});

  return res.status(200).json(new ApiResponse(200, order, 'Order cancelled successfully'));
});

export const rateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { rating, review } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to rate this order');
  }

  if (order.status !== 'delivered') {
    throw new ApiError(400, 'You can only rate delivered orders');
  }

  if (order.rating) {
    throw new ApiError(400, 'You have already rated this order');
  }

  order.rating = rating;
  order.review = review;
  order.isRated = true;
  await order.save();

  // Update vendor rating
  const vendor = await Vendor.findById(order.vendorId);
  const allOrders = await Order.find({ vendorId: order.vendorId, rating: { $exists: true } });
  const totalRating = allOrders.reduce((sum, o) => sum + o.rating, 0);
  vendor.rating = totalRating / allOrders.length;
  await vendor.save();

  return res.status(200).json(new ApiResponse(200, order, 'Order rated successfully'));
});
