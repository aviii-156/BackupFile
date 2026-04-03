import express from 'express';
import {
  getDashboard,
  getPendingVendors,
  getAllVendors,
  approveVendor,
  rejectVendor,
  updateVendorStatus,
  getAllUsers,
  updateUserStatus,
  getAllOrders,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  getAllInventoryMedicines,
  getAllEmergencies,
  getAllSubscriptions,
  getSavingsStats,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole('admin', 'superadmin'));
router.use(authRateLimit);

// Disable caching for all admin endpoints so browsers never return 304
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Dashboard
router.get('/dashboard', getDashboard);

// Vendor Management
router.get('/vendors/pending', getPendingVendors);
router.get('/vendors', getAllVendors);
router.put('/vendors/:id/approve', approveVendor);
router.put('/vendors/:id/reject', rejectVendor);
router.put('/vendors/:id/status', updateVendorStatus);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// Order Management
router.get('/orders', getAllOrders);

// Medicine Management
router.get('/medicines', getAllMedicines);
router.get('/medicines/:productId', getMedicineById);
router.put('/medicines/:productId', updateMedicine);
router.delete('/medicines/:productId', deleteMedicine);
router.get('/inventory', getAllInventoryMedicines);

// Emergency Logs
router.get('/emergencies', getAllEmergencies);

// Subscription Management
router.get('/subscriptions', getAllSubscriptions);

// Savings Analytics
router.get('/savings', getSavingsStats);

export default router;
