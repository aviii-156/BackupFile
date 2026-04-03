import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Temporary token authentication middleware
 * Used for new user registration flow (step 3)
 */
export const tempAuth = asyncHandler(async (req, res, next) => {
  // Extract token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No temporary token provided', 'NO_TEMP_TOKEN');
  }

  const token = authHeader.substring(7);

  try {
    // Verify temp token
    const decoded = jwt.verify(token, config.jwt.tempSecret);
    
    // Check purpose
    if (decoded.purpose !== 'registration') {
      throw new ApiError(401, 'Invalid token purpose', 'INVALID_TOKEN_PURPOSE');
    }

    // Attach email to request
    req.tempEmail = decoded.email;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid temporary token', 'INVALID_TEMP_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Temporary token expired. Please verify OTP again.', 'TEMP_TOKEN_EXPIRED');
    }
    throw error;
  }
});

export default tempAuth;
