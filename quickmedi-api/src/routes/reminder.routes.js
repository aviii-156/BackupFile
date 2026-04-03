import express from 'express';
import {
  getReminders,
  getReminderStats,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  markDoseTaken,
  markDoseMissed,
} from '../controllers/reminder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import { createReminderSchema, updateReminderSchema } from '../validators/reminder.validator.js';

const router = express.Router();

// All reminder routes require patient authentication
router.use(authenticate);
router.use(requireRole('patient'));
router.use(authRateLimit);

// Stats — must be before /:id to avoid route conflict
router.get('/stats', getReminderStats);

// CRUD
router.get('/', getReminders);
router.post('/', validate(createReminderSchema), createReminder);
router.get('/:id', getReminderById);
router.patch('/:id', validate(updateReminderSchema), updateReminder);
router.delete('/:id', deleteReminder);

// Dose tracking
router.post('/:id/mark-taken', markDoseTaken);
router.post('/:id/mark-missed', markDoseMissed);

export default router;
