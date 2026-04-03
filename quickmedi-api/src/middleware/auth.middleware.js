import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided', 'NO_TOKEN');
  }

  const token = authHeader.substring(7);

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    
    // Find user based on role
    let user;
    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      user = await Admin.findById(decoded.userId).select('-password');
    } else if (decoded.role === 'vendor') {
      user = await Vendor.findById(decoded.userId);
    } else {
      user = await User.findById(decoded.userId);
    }

    if (!user) {
      throw new ApiError(401, 'User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
    }

    // Check if token was issued before last logout
    if (user.lastLogoutAt && decoded.iat * 1000 < user.lastLogoutAt.getTime()) {
      throw new ApiError(401, 'Token has been invalidated', 'TOKEN_INVALIDATED');
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
    }
    throw error;
  }
});

/**
 * Role authorization middleware
 * Checks if user has required role(s)
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!allowedRoles.includes(req.role)) {
      throw new ApiError(403, 'Access denied. Insufficient permissions');
    }

    next();
  };
};

export default authenticate;
