import Joi from 'joi';

const VALID_SYMPTOMS = [
  'cramps', 'headache', 'fatigue', 'bloating',
  'mood_swings', 'back_pain', 'acne', 'nausea', 'sleep_issues',
];

const VALID_CONDITIONS = ['pcos', 'endometriosis', 'fibroids', 'thyroid', 'none'];

// ─── Profile setup / update ──────────────────────────────────────────────────

/**
 * PUT /sathi/profile/setup
 * User can configure cycle defaults and known health conditions.
 */
export const setupProfileSchema = Joi.object({
  defaultCycleLength: Joi.number().integer().min(20).max(45),
  defaultPeriodDuration: Joi.number().integer().min(1).max(10),
  knownConditions: Joi.array()
    .items(Joi.string().valid(...VALID_CONDITIONS))
    .min(1),
}).min(1);

// ─── Cycle management ────────────────────────────────────────────────────────

/**
 * POST /sathi/cycle/log-period
 * Log the start of a new menstrual period.
 */
export const logPeriodSchema = Joi.object({
  startDate: Joi.date().max('now').required(),
  flowIntensity: Joi.string().valid('light', 'medium', 'heavy'),
  cycleLength: Joi.number().integer().min(20).max(45),
  periodDuration: Joi.number().integer().min(1).max(10),
  notes: Joi.string().max(500).allow(''),
});

/**
 * PUT /sathi/cycle
 * Edit the active/last cycle record.
 */
export const updateCycleSchema = Joi.object({
  cycleLength: Joi.number().integer().min(20).max(45),
  flowIntensity: Joi.string().valid('light', 'medium', 'heavy'),
  notes: Joi.string().max(500).allow(''),
  endDate: Joi.date(),
}).min(1);

// ─── Daily symptom check-in ──────────────────────────────────────────────────

/**
 * POST /sathi/symptoms
 * Daily symptom check-in — triggers AI analysis async.
 */
export const logSymptomsSchema = Joi.object({
  symptoms: Joi.array()
    .items(Joi.string().valid(...VALID_SYMPTOMS))
    .min(0)
    .max(9)
    .default([]),
  symptomSeverity: Joi.array()
    .items(
      Joi.object({
        symptom: Joi.string().valid(...VALID_SYMPTOMS).required(),
        severity: Joi.number().integer().min(1).max(5).required(),
      })
    )
    .optional(),
  notes: Joi.string().max(1000).allow(''),
  mood: Joi.number().integer().min(1).max(5).allow(null),
  energyLevel: Joi.number().integer().min(1).max(5).allow(null),
  logDate: Joi.date().max('now'),   // defaults to today server-side if omitted
});

// ─── Pregnancy mode ──────────────────────────────────────────────────────────

/**
 * POST /sathi/pregnancy/toggle
 * Enable or disable pregnancy mode.
 */
export const togglePregnancySchema = Joi.object({
  enabled: Joi.boolean().required(),
  estimatedDueDate: Joi.date()
    .min('now')
    .when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  source: Joi.string()
    .valid('manual', 'doctor_confirmed', 'ultrasound', 'lmp_calculated')
    .default('manual'),
});

/**
 * PUT /sathi/pregnancy
 * Update pregnancy details (EDD, week milestones, etc.).
 */
export const updatePregnancySchema = Joi.object({
  estimatedDueDate: Joi.date().min('now'),
  source: Joi.string().valid(
    'manual', 'doctor_confirmed', 'ultrasound', 'lmp_calculated',
  ),
  milestoneEntry: Joi.object({
    week: Joi.number().integer().min(1).max(40).required(),
    notes: Joi.string().max(1000).allow(''),
    weight: Joi.number().positive(),
    bloodPressure: Joi.string().max(20).allow(''),
  }),
}).min(1);

// ─── Reminders ───────────────────────────────────────────────────────────────

/**
 * PUT /sathi/reminders/:reminderId
 * Update a maternal reminder.
 */
export const updateReminderSchema = Joi.object({
  isEnabled: Joi.boolean(),
  notificationTime: Joi.string().pattern(/^\d{2}:\d{2}$/),
  title: Joi.string().min(2).max(120).trim(),
  description: Joi.string().max(300).allow(''),
}).min(1);
