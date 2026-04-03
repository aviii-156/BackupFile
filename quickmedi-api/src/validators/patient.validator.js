import Joi from 'joi';

/**
 * Validation schema for updating patient profile
 */
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('male', 'female', 'other'),
  profilePhoto: Joi.string().uri(),
}).min(1); // At least one field must be present

/**
 * Validation schema for adding/updating saved address
 * Coordinates come from device location
 */
export const savedAddressSchema = Joi.object({
  addressLine1: Joi.string().required().trim(),
  addressLine2: Joi.string().allow('').trim(),
  street: Joi.string().allow('').trim(),
  city: Joi.string().required().trim(),
  state: Joi.string().required().trim(),
  pincode: Joi.string().required().trim(),
  country: Joi.string().default('India').trim(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  label: Joi.string().valid('home', 'work', 'other').default('home'),
  isDefault: Joi.boolean().default(false),
});

/**
 * Validation schema for changing password
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().allow('', null).optional(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

/**
 * Validation schema for updating emergency contacts
 */
export const updateEmergencyContactsSchema = Joi.object({
  emergencyContacts: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required().trim(),
        phone: Joi.string()
          .required()
          .pattern(/^\+?[1-9]\d{1,14}$/),
        relation: Joi.string().required().trim(),
      })
    )
    .min(0)
    .max(5)
    .required(),
});

/**
 * Validation schema for updating medical information
 */
export const updateMedicalInfoSchema = Joi.object({
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  allergies: Joi.array().items(Joi.string().trim()),
  chronicConditions: Joi.array().items(Joi.string().trim()),
  currentMedications: Joi.array().items(Joi.string().trim()),
}).min(1); // At least one field must be present

/**
 * Validation schema for updating language preference
 */
export const updateLanguageSchema = Joi.object({
  language: Joi.string().valid('en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa').required(),
});

/**
 * Validation schema for FCM token registration
 */
export const registerFCMTokenSchema = Joi.object({
  token: Joi.string().required(),
  device: Joi.string().valid('android', 'ios', 'web').default('unknown'),
});

/**
 * Validation schema for updating specific address by ID
 */
export const updateAddressSchema = Joi.object({
  addressLine1: Joi.string().trim(),
  addressLine2: Joi.string().allow('').trim(),
  street: Joi.string().allow('').trim(),
  city: Joi.string().trim(),
  state: Joi.string().trim(),
  pincode: Joi.string().trim(),
  country: Joi.string().trim(),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  label: Joi.string().valid('home', 'work', 'other'),
  isDefault: Joi.boolean(),
}).min(1); // At least one field to update
