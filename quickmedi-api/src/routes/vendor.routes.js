/**
 * vendor.routes.js
 * Vendor self-service routes (profile + inventory management)
 */
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  getMyProfile,
  updateMyProfile,
  getMyInventory,
  getInventoryStats,
  updateInventoryItem,
  deleteInventoryItem,
  getVendorOrders,
  getVendorOrderStats,
  updateVendorOrderStatus,
  getVendorAnalytics,
  getVendorDashboard,
} from '../controllers/vendor.controller.js';
import {
  getVendorFulfillments,
  getVendorFulfillmentById,
  respondToFulfillment,
  claimFulfillmentItems,
  updateFulfillmentStatus,
} from '../controllers/fulfillment.controller.js';

const router = express.Router();

// All vendor routes require auth + vendor role
router.use(authenticate, requireRole('vendor'));

// Profile
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);

// Dashboard
router.get('/dashboard', getVendorDashboard);

// Inventory
router.get('/inventory', getMyInventory);
router.get('/inventory/stats', getInventoryStats);
router.put('/inventory/:id', updateInventoryItem);
router.delete('/inventory/:id', deleteInventoryItem);

// Orders
router.get('/orders/stats', getVendorOrderStats);
router.get('/orders', getVendorOrders);
router.put('/orders/:id/status', updateVendorOrderStatus);

// Analytics
router.get('/analytics', getVendorAnalytics);

// ── Fulfillment routes (partial-vendor-fulfillment system) ───────────────────
// Vendor sees all VendorFulfillments assigned to them (primary + fallback)
router.get('/fulfillments', getVendorFulfillments);
// Single fulfillment detail with all items
router.get('/fulfillments/:id', getVendorFulfillmentById);
// Primary vendor: accept/reject items → triggers broadcast for rejected items
router.post('/fulfillments/:id/respond', respondToFulfillment);
// Fallback vendor: atomically claim items (first-vendor-wins)
router.post('/fulfillments/:id/claim', claimFulfillmentItems);
// Advance fulfillment delivery status (out_for_delivery → delivered)
router.put('/fulfillments/:id/status', updateFulfillmentStatus);

export default router;
