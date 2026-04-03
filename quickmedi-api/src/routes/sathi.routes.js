/**
 * Sathi Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes require authentication.
 * Sathi is available to patients only; gender eligibility is enforced in the
 * service layer (getOrCreateProfile throws 403 for non-female users).
 */

import { Router }      from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole }  from '../middleware/role.middleware.js';
import { validate }    from '../middleware/validate.middleware.js';
import {
  setupProfileSchema,
  logPeriodSchema,
  updateCycleSchema,
  logSymptomsSchema,
  togglePregnancySchema,
  updatePregnancySchema,
  updateReminderSchema,
} from '../validators/sathi.validator.js';
import {
  getProfile,
  setupProfile,
  getActiveCycle,
  logPeriod,
  updateCycle,
  logSymptoms,
  getSymptomLogs,
  getRelief,
  getInsights,
  markInsightsRead,
  togglePregnancyMode,
  getPregnancy,
  updatePregnancy,
  getPregnancyTip,
  getReminders,
  updateReminder,
  toggleReminderCompletion,
} from '../controllers/sathi.controller.js';

const router = Router();

// ── Auth guard: every Sathi endpoint requires a logged-in patient ─────────────
router.use(authenticate);
router.use(requireRole('patient'));

// ─── Profile ─────────────────────────────────────────────────────────────────
router.get ('/profile',       getProfile);
router.put ('/profile/setup', validate(setupProfileSchema), setupProfile);

// ─── Cycle ───────────────────────────────────────────────────────────────────
router.get ('/cycle',            getActiveCycle);
router.post('/cycle/log-period', validate(logPeriodSchema),   logPeriod);
router.put ('/cycle',            validate(updateCycleSchema),  updateCycle);

// ─── Symptoms ────────────────────────────────────────────────────────────────
router.post('/symptoms', validate(logSymptomsSchema), logSymptoms);
router.get ('/symptoms', getSymptomLogs);

// ─── Relief & insights ────────────────────────────────────────────────────────
router.get ('/relief',         getRelief);
router.get ('/insights',       getInsights);
router.post('/insights/read',  markInsightsRead);

// ─── Pregnancy ───────────────────────────────────────────────────────────────
router.post('/pregnancy/toggle', validate(togglePregnancySchema), togglePregnancyMode);
router.get ('/pregnancy',        getPregnancy);
router.put ('/pregnancy',        validate(updatePregnancySchema), updatePregnancy);
router.get ('/pregnancy/tip',    getPregnancyTip);

// ─── Reminders ───────────────────────────────────────────────────────────────
router.get ('/reminders',                          getReminders);
router.put ('/reminders/:reminderId',              validate(updateReminderSchema), updateReminder);
router.post('/reminders/:reminderId/complete',     toggleReminderCompletion);

export default router;
