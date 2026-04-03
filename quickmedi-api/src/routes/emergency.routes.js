import express from 'express';
import {
  triggerEmergency,
  callAmbulance,
  alertFamily,
  getEmergencyStatus,
  resolveEmergency,
  respondToEmergency,
} from '../controllers/emergency.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { authRateLimit, strictRateLimit } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const triggerEmergencySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  type: Joi.string().valid('pharmacy_alert', 'ambulance', 'family_alert').optional(),
  note: Joi.string().max(500).optional(),
});

const respondSchema = Joi.object({
  response: Joi.string().valid('accept', 'decline').required(),
});

router.use(authenticate);

// Patient routes
router.post(
  '/trigger',
  requireRole('patient'),
  strictRateLimit,
  validate(triggerEmergencySchema),
  triggerEmergency
);
router.post('/ambulance', requireRole('patient'), authRateLimit, callAmbulance);
router.post('/family', requireRole('patient'), authRateLimit, alertFamily);
router.get('/:id/status', requireRole('patient'), authRateLimit, getEmergencyStatus);
router.put('/:id/resolve', requireRole('patient'), authRateLimit, resolveEmergency);

// Vendor routes
router.post('/:id/respond', requireRole('vendor'), authRateLimit, validate(respondSchema), respondToEmergency);

export default router;
