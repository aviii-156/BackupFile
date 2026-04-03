import Joi from 'joi';
import { ApiError } from '../utils/apiError.js';

/**
 * Joi validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      throw new ApiError(400, errorMessage, 'VALIDATION_ERROR');
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      throw new ApiError(400, errorMessage, 'VALIDATION_ERROR');
    }

    req.query = value;
    next();
  };
};

/**
 * Validate params
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      throw new ApiError(400, errorMessage, 'VALIDATION_ERROR');
    }

    req.params = value;
    next();
  };
};

export default { validate, validateQuery, validateParams };
