import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';

/**
 * Create a notification in DB and push it via Socket.IO.
 *
 * @param {string|ObjectId} recipientId
 * @param {'patient'|'vendor'|'admin'} recipientRole
 * @param {string} type  - e.g. 'new_order', 'order_confirmed', 'order_status', 'order_delivered'
 * @param {string} title
 * @param {string} message
 * @param {object} metadata  - arbitrary extra data (orderId, fulfillmentId, …)
 * @returns {Promise<Notification>}
 */
export const createAndEmitNotification = async (
  recipientId,
  recipientRole,
  type,
  title,
  message,
  metadata = {}
) => {
  const notification = await Notification.create({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    metadata,
  });

  try {
    const io = getIO();
    let room;
    if (recipientRole === 'patient') room = `user:${recipientId}`;
    else if (recipientRole === 'vendor') room = `vendor:${recipientId}`;
    else room = 'admin';

    io.to(room).emit('notification:new', {
      _id: notification._id,
      type,
      title,
      message,
      metadata,
      isRead: false,
      createdAt: notification.createdAt,
    });
  } catch (_) {
    /* socket not initialised in standalone/test mode — safe to ignore */
  }

  return notification;
};
