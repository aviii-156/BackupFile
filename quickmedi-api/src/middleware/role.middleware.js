import { ApiError } from '../utils/apiError.js';

/**
 * Role-based authorization middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    if (!allowedRoles.includes(req.role)) {
      throw new ApiError(403, 'Access denied. Insufficient permissions.', 'FORBIDDEN');
    }

    next();
  };
};

/**
 * Middleware to ensure vendor is approved
 */
export const requireApprovedVendor = (req, res, next) => {
  if (req.role !== 'vendor') {
    throw new ApiError(403, 'Access denied. Vendor only.', 'VENDOR_ONLY');
  }

  const vendor = req.user;

  if (vendor.approvalStatus === 'pending') {
    throw new ApiError(403, 'Your account is under review. Please wait for admin approval.', 'ACCOUNT_PENDING');
  }

  if (vendor.approvalStatus === 'rejected') {
    throw new ApiError(403, `Your account was rejected. Reason: ${vendor.approvalNote || 'N/A'}`, 'ACCOUNT_REJECTED');
  }

  if (vendor.approvalStatus !== 'approved') {
    throw new ApiError(403, 'Account not approved', 'ACCOUNT_NOT_APPROVED');
  }

  next();
};

/**
 * Allows patients unconditionally and approved vendors.
 * Use on any route that both roles should access (chatbot, voice, etc.)
 * Blocks: unauthenticated, unknown roles, unapproved / rejected vendors.
 */
export const requirePatientOrApprovedVendor = (req, res, next) => {
  if (!req.user || !req.role) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  if (req.role === 'patient') {
    return next();
  }

  if (req.role === 'vendor') {
    const vendor = req.user;
    if (vendor.approvalStatus === 'pending') {
      throw new ApiError(403, 'Your account is under review. Please wait for admin approval.', 'ACCOUNT_PENDING');
    }
    if (vendor.approvalStatus === 'rejected') {
      throw new ApiError(403, `Your account was rejected. Reason: ${vendor.approvalNote || 'N/A'}`, 'ACCOUNT_REJECTED');
    }
    if (vendor.approvalStatus !== 'approved') {
      throw new ApiError(403, 'Account not approved', 'ACCOUNT_NOT_APPROVED');
    }
    return next();
  }

  throw new ApiError(403, 'Access denied. Insufficient permissions.', 'FORBIDDEN');
};

export default { requireRole, requireApprovedVendor, requirePatientOrApprovedVendor };
