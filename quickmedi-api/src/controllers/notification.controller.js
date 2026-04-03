import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

/**
 * @route  GET /api/notifications
 * @desc   Get notifications for the authenticated user (paginated, newest first)
 * @access Private (any role)
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const recipientId = req.userId;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipientId }),
  ]);

  const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });

  return apiResponse(res, 200, 'Notifications fetched', {
    notifications,
    unreadCount,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    },
  });
});

/**
 * @route  GET /api/notifications/unread-count
 * @desc   Get unread notification count
 * @access Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipientId: req.userId,
    isRead: false,
  });
  return apiResponse(res, 200, 'Unread count', { count });
});

/**
 * @route  PUT /api/notifications/:id/read
 * @desc   Mark a single notification as read
 * @access Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipientId: req.userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  return apiResponse(res, 200, 'Marked as read', { notification });
});

/**
 * @route  PUT /api/notifications/read-all
 * @desc   Mark all notifications as read for the user
 * @access Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipientId: req.userId, isRead: false },
    { isRead: true }
  );
  return apiResponse(res, 200, 'All marked as read');
});
