import express from 'express';
import {
  createOrder,
  getOrderById,
  getOrderHistory,
  trackOrder,
  cancelOrder,
  rateOrder,
} from '../controllers/order.controller.js';
import {
  getOrderFulfillments,
} from '../controllers/fulfillment.controller.js';
import {
  createIntent,
  confirmPayment,
  handleWebhook,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createOrderSchema = Joi.object({
  vendorId: Joi.string().required(),
  prescriptionId: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        inventoryId: Joi.string().optional(),         // optional for items unavailable at vendor
        medicineId: Joi.string().optional(),
        medicineName: Joi.string().required(),
        genericName: Joi.string().optional(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).optional(),    // required when inventoryId absent
        mrp: Joi.number().min(0).optional(),
      })
    )
    .min(1)
    .required(),
  deliveryAddressId: Joi.string().required(),
  paymentMethod: Joi.string().valid('cod', 'online').required(),
  isEmergencyOrder: Joi.boolean().optional(),
  fallbackRadius: Joi.number().min(1).max(50).default(10).optional(), // NEW
});

const rateOrderSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().max(500).optional(),
});

// Webhook route (no auth, raw body for signature verification)
router.post(
  '/payment/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Protected routes
router.use(authenticate);
router.use(requireRole('patient'));
router.use(authRateLimit);

router.post('/create', validate(createOrderSchema), createOrder);
router.post('/payment/create-intent', createIntent);
router.post('/payment/confirm', confirmPayment);
router.get('/history', getOrderHistory);
router.get('/:id', getOrderById);
router.get('/:id/track', trackOrder);
router.get('/:id/fulfillments', getOrderFulfillments);  // NEW: patient sees vendor breakdown
router.post('/:id/cancel', cancelOrder);
router.post('/:id/rate', validate(rateOrderSchema), rateOrder);

export default router;
