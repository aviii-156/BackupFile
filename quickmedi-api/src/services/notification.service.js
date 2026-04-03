import { sendPushNotification } from '../config/firebase.js';

/**
 * Notification Service - Firebase Push Notifications
 */

/**
 * Send welcome notification to new user
 */
export const sendWelcomeNotification = async (fcmTokens, userName) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Welcome to QuickMedi!',
      body: `Hi ${userName}, start scanning prescriptions to save on medicines.`,
    },
    {
      type: 'welcome',
    }
  );
};

/**
 * Send prescription ready notification
 */
export const sendPrescriptionReadyNotification = async (fcmTokens, prescriptionId, savings) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Prescription Processed',
      body: `Your prescription is ready! You can save ₹${savings} on medicines.`,
    },
    {
      type: 'prescription_ready',
      prescriptionId: prescriptionId.toString(),
    }
  );
};

/**
 * Send order confirmed notification
 */
export const sendOrderConfirmedNotification = async (fcmTokens, orderId, vendorName) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Order Confirmed',
      body: `${vendorName} has confirmed your order. Preparing for delivery.`,
    },
    {
      type: 'order_confirmed',
      orderId: orderId.toString(),
    }
  );
};

/**
 * Send order status update notification
 */
export const sendOrderStatusNotification = async (fcmTokens, orderId, status, message) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Order Update',
      body: message,
    },
    {
      type: 'order_status',
      orderId: orderId.toString(),
      status,
    }
  );
};

/**
 * Send order delivered notification
 */
export const sendOrderDeliveredNotification = async (fcmTokens, orderId) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Order Delivered',
      body: 'Your order has been delivered. Please rate your experience.',
    },
    {
      type: 'order_delivered',
      orderId: orderId.toString(),
    }
  );
};

/**
 * Send emergency response notification
 */
export const sendEmergencyResponseNotification = async (fcmTokens, vendorName, vendorPhone) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Emergency Response',
      body: `${vendorName} is responding to your emergency. Contact: ${vendorPhone}`,
    },
    {
      type: 'emergency_response',
    }
  );
};

/**
 * Send medicine reminder notification
 */
export const sendMedicineReminderNotification = async (fcmTokens, medicineName, dosage, time) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Medicine Reminder',
      body: `Time to take ${medicineName} - ${dosage}`,
    },
    {
      type: 'reminder',
      medicineName,
      time,
    }
  );
};

/**
 * Send vendor approval notification
 */
export const sendVendorApprovalNotification = async (fcmTokens, storeName) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Account Approved',
      body: `Congratulations! ${storeName} has been approved. Start accepting orders now.`,
    },
    {
      type: 'vendor_approved',
    }
  );
};

/**
 * Send vendor rejection notification
 */
export const sendVendorRejectionNotification = async (fcmTokens, reason) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Application Rejected',
      body: `Your vendor application was rejected. Reason: ${reason}`,
    },
    {
      type: 'vendor_rejected',
    }
  );
};

/**
 * Send new order notification to vendor
 */
export const sendNewOrderNotificationToVendor = async (fcmTokens, orderId, patientName, itemCount) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'New Order Received',
      body: `New order from ${patientName} - ${itemCount} items`,
    },
    {
      type: 'new_order',
      orderId: orderId.toString(),
    }
  );
};

/**
 * Send emergency alert to vendor
 */
export const sendEmergencyAlertToVendor = async (fcmTokens, patientName, medicineNeeded) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: '🚨 Emergency Alert',
      body: `${patientName} needs ${medicineNeeded || 'urgent medicine'}. Respond immediately!`,
    },
    {
      type: 'emergency_alert',
      priority: 'high',
    }
  );
};

/**
 * Send low stock alert to vendor
 */
export const sendLowStockAlert = async (fcmTokens, medicineName, stock) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Low Stock Alert',
      body: `${medicineName} is running low (${stock} remaining). Restock soon.`,
    },
    {
      type: 'low_stock',
    }
  );
};

/**
 * Send expiring medicine alert to vendor
 */
export const sendExpiringMedicineAlert = async (fcmTokens, medicineName, expiryDate) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Medicine Expiring Soon',
      body: `${medicineName} expires on ${expiryDate}. Take action.`,
    },
    {
      type: 'expiring_medicine',
    }
  );
};

/**
 * Send medicine request status to vendor
 */
export const sendMedicineRequestUpdateToVendor = async (fcmTokens, medicineName, status, reason) => {
  const body = status === 'approved' 
    ? `Your request for ${medicineName} has been approved.`
    : `Your request for ${medicineName} was rejected. Reason: ${reason}`;
    
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Medicine Request Update',
      body,
    },
    {
      type: 'medicine_request_update',
      status,
    }
  );
};

/**
 * Send new vendor registration to admin
 */
export const sendNewVendorNotificationToAdmin = async (fcmTokens, storeName, city) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'New Vendor Registration',
      body: `${storeName} from ${city} has registered. Review pending.`,
    },
    {
      type: 'new_vendor',
    }
  );
};

/**
 * Send subscription updated notification
 */
export const sendSubscriptionUpdatedNotification = async (fcmTokens, plan, status) => {
  return await sendPushNotification(
    fcmTokens,
    {
      title: 'Subscription Updated',
      body: `Your subscription has been ${status}. Plan: ${plan}`,
    },
    {
      type: 'subscription_updated',
      plan,
      status,
    }
  );
};

export default {
  sendWelcomeNotification,
  sendPrescriptionReadyNotification,
  sendOrderConfirmedNotification,
  sendOrderStatusNotification,
  sendOrderDeliveredNotification,
  sendEmergencyResponseNotification,
  sendMedicineReminderNotification,
  sendVendorApprovalNotification,
  sendVendorRejectionNotification,
  sendNewOrderNotificationToVendor,
  sendEmergencyAlertToVendor,
  sendLowStockAlert,
  sendExpiringMedicineAlert,
  sendMedicineRequestUpdateToVendor,
  sendNewVendorNotificationToAdmin,
  sendSubscriptionUpdatedNotification,
};
