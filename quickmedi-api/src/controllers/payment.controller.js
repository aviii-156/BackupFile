import Order from '../models/Order.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import VendorInventory from '../models/VendorInventory.js';
import PlatformStats from '../models/PlatformStats.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { createPaymentIntent, confirmPaymentIntent, verifyWebhookSignature } from '../services/payment.service.js';
import { getIO } from '../config/socket.js';
import { sendOrderStatusNotification } from '../services/notification.service.js';
import { createAndEmitNotification } from '../utils/notificationHelper.js';
import { config } from '../config/env.js';

export const createIntent = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const userId = req.user._id;

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to make payment for this order');
  }

  if (order.paymentStatus === 'completed') {
    throw new ApiError(400, 'Payment already completed for this order');
  }

  const user = await User.findById(userId);
  const paymentIntent = await createPaymentIntent(order.totalAmount, `Order ${order._id}`);

  order.stripePaymentIntentId = paymentIntent.id;
  await order.save();

  return res.status(200).json(
    new ApiResponse(200, {
      clientSecret: paymentIntent.client_secret,
      amount: order.totalAmount,
    }, 'Payment intent created successfully')
  );
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;
  const userId = req.user._id;

  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to confirm this payment');
  }

  const paymentIntent = await confirmPaymentIntent(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    order.paymentStatus = 'completed';
    order.paidAt = new Date();
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      note: 'Payment received',
    });

    await order.save();

    // Deduct inventory stock
    for (const item of order.items) {
      await VendorInventory.findOneAndUpdate(
        { vendorId: order.vendorId, medicineId: item.medicineId },
        { $inc: { stock: -item.quantity } }
      );
    }

    // Update user and vendor stats
    await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1 } });
    await Vendor.findByIdAndUpdate(order.vendorId, {
      $inc: { totalOrders: 1, totalRevenue: order.totalAmount },
    });

    // Update platform stats
    await PlatformStats.findOneAndUpdate(
      {},
      { $inc: { totalOrders: 1 }, $set: { lastUpdated: new Date() } },
      { upsert: true }
    );

    // Send notifications
    const user = await User.findById(userId);
    const io = getIO();
    io.to(`user:${userId}`).emit('order:payment_success', { orderId: order._id });
    io.to(`vendor:${order.vendorId}`).emit('order:new_paid', { orderId: order._id });
    sendOrderStatusNotification(user.fcmTokens, order._id, 'confirmed', 'Payment confirmed! Order is being prepared.');

    createAndEmitNotification(
      userId, 'patient', 'order_confirmed',
      'Payment Successful',
      'Your payment was confirmed! The vendor will prepare your order shortly.',
      { orderId: order._id }
    ).catch(() => {});

    createAndEmitNotification(
      order.vendorId, 'vendor', 'new_order',
      'New Paid Order',
      'A new paid order has arrived. Check your orders.',
      { orderId: order._id }
    ).catch(() => {});
  }

  return res.status(200).json(
    new ApiResponse(200, {
      status: paymentIntent.status,
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    }, 'Payment confirmed successfully')
  );
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const rawBody = req.rawBody;

  let event;
  try {
    event = verifyWebhookSignature(rawBody, sig, config.stripe.webhookSecretOrders);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    throw new ApiError(400, 'Webhook signature verification failed');
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });

      if (order && order.paymentStatus !== 'completed') {
        order.paymentStatus = 'completed';
        order.paidAt = new Date();
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          note: 'Payment received via webhook',
        });

        await order.save();

        // Deduct inventory stock
        for (const item of order.items) {
          await VendorInventory.findOneAndUpdate(
            { vendorId: order.vendorId, medicineId: item.medicineId },
            { $inc: { stock: -item.quantity } }
          );
        }

        // Update stats
        await User.findByIdAndUpdate(order.patientId, { $inc: { totalOrders: 1 } });
        await Vendor.findByIdAndUpdate(order.vendorId, {
          $inc: { totalOrders: 1, totalRevenue: order.totalAmount },
        });
        await PlatformStats.findOneAndUpdate(
          {},
          { $inc: { totalOrders: 1 }, $set: { lastUpdated: new Date() } },
          { upsert: true }
        );

        // Notify
        const user = await User.findById(order.patientId);
        const io = getIO();
        io.to(`user:${order.patientId}`).emit('order:payment_success', { orderId: order._id });
        io.to(`vendor:${order.vendorId}`).emit('order:new_paid', { orderId: order._id });
        sendOrderStatusNotification(user.fcmTokens, order._id, 'confirmed', 'Payment confirmed! Order is being prepared.');
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });

      if (order) {
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'payment_failed',
          note: 'Payment failed',
        });
        await order.save();

        // Notify user
        const io = getIO();
        io.to(`user:${order.patientId}`).emit('order:payment_failed', { orderId: order._id });
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return res.status(200).json({ received: true });
});
