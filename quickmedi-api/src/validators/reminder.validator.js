import Joi from 'joi';

const timePattern = /^\d{2}:\d{2}$/;

/**
 * Create a new reminder
 */
export const createReminderSchema = Joi.object({
  medicineName: Joi.string().min(1).max(200).trim().required(),
  medicineId: Joi.string().hex().length(24).allow('', null).optional(),
  dosage: Joi.string().max(100).trim().allow('').optional(),
  instruction: Joi.string().max(300).trim().allow('').optional(),
  times: Joi.array()
    .items(Joi.string().pattern(timePattern).messages({ 'string.pattern.base': 'Each time must be in HH:MM format' }))
    .min(1)
    .required(),
  frequency: Joi.string()
    .valid('daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom')
    .default('daily'),
  customDays: Joi.when('frequency', {
    is: 'custom',
    then: Joi.array()
      .items(Joi.string().valid('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))
      .min(1)
      .required(),
    otherwise: Joi.array()
      .items(Joi.string().valid('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))
      .optional(),
  }),
  startDate: Joi.date().required(),
  endDate: Joi.alternatives().try(Joi.date().min(Joi.ref('startDate')), Joi.valid(null, '')).optional(),
  isActive: Joi.boolean().default(true),
  prescriptionId: Joi.string().hex().length(24).allow('', null).optional(),
});

/**
 * Update an existing reminder
 */
export const updateReminderSchema = Joi.object({
  medicineName: Joi.string().min(1).max(200).trim(),
  medicineId: Joi.string().hex().length(24).allow('', null),
  dosage: Joi.string().max(100).trim().allow(''),
  instruction: Joi.string().max(300).trim().allow(''),
  times: Joi.array()
    .items(Joi.string().pattern(timePattern))
    .min(1),
  frequency: Joi.string().valid('daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom'),
  customDays: Joi.array()
    .items(Joi.string().valid('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  startDate: Joi.date(),
  endDate: Joi.alternatives().try(Joi.date(), Joi.valid(null, '')).optional(),
  isActive: Joi.boolean(),
  prescriptionId: Joi.string().hex().length(24).allow('', null),
}).min(1);
