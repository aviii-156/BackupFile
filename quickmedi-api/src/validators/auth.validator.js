import Joi from 'joi';

export const sendOTPSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only numbers',
    }),
});

export const registerPatientSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  phone: Joi.string()
    .pattern(/^[+]?[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
    }),
  language: Joi.string()
    .valid('en', 'hi')
    .default('en'),
  dateOfBirth: Joi.date()
    .optional(),
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    addressLine1: Joi.string().optional(),
    addressLine2: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    country: Joi.string().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
  }).optional(),
  bloodGroup: Joi.string()
    .valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    .optional(),
  emergencyContacts: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        phone: Joi.string()
          .pattern(/^[+]?[0-9]{10,15}$/)
          .required(),
        relation: Joi.string().optional(),
      })
    )
    .optional(),
  allergies: Joi.array()
    .items(Joi.string())
    .optional(),
  chronicConditions: Joi.array()
    .items(Joi.string())
    .optional(),
  currentMedications: Joi.array()
    .items(Joi.string())
    .optional(),
  password: Joi.string()
    .min(6)
    .optional()
    .messages({
      'string.min': 'Password must be at least 6 characters',
    }),
}).or('name', 'fullName');

export const registerVendorSchema = Joi.object({
  storeName: Joi.string().required(),
  ownerName: Joi.string().required(),
  phone: Joi.string()
    .pattern(/^[+]?[0-9]{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
    }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  licenseNumber: Joi.string().required(),
  gstNumber: Joi.string().optional(),
  // Support both flat and nested address format
  address: Joi.object({
    street: Joi.string().optional(),
    addressLine1: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().required(),
    country: Joi.string().default('India'),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).optional(),
  // Flat address fields (for backward compatibility)
  addressLine1: Joi.string().optional(),
  addressLine2: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  pincode: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  deliveryRadius: Joi.number().optional(),
  deliveryAvailable: Joi.boolean().optional(),
  operatingHours: Joi.alternatives().try(
    Joi.string(),
    Joi.object()
  ).optional(),
}).unknown(true); // Allow extra fields like email (will be ignored)

export const checkVendorStatusSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

export const verify2FASchema = Joi.object({
  tempToken: Joi.string().required(),
  token: Joi.string().length(6).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'New password is required',
  }),
});
