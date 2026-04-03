import twilio from 'twilio';
import { config } from '../config/env.js';

let twilioClient;

// Only initialize if valid Twilio credentials are provided
const isValidTwilioConfig = 
  config.twilio.accountSid && 
  config.twilio.authToken && 
  config.twilio.accountSid.startsWith('AC') &&
  !config.twilio.accountSid.includes('your_twilio');

if (isValidTwilioConfig) {
  try {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    console.log('Twilio SMS service initialized successfully');
  } catch (error) {
    console.warn('Twilio initialization failed:', error.message);
  }
} else {
  console.log('Twilio not configured - SMS notifications disabled');
}

/**
 * Send SMS via Twilio
 */
export const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.warn('Twilio not configured, SMS not sent');
      return null;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to: to,
    });

    console.log(`SMS sent to ${to}: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('SMS Error:', error.message);
    throw new Error('Failed to send SMS');
  }
};

/**
 * Send OTP SMS
 */
export const sendOTPSMS = async (phone, otp) => {
  const message = `Your QuickMedi OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
  return await sendSMS(phone, message);
};

/**
 * Send vendor approval SMS
 */
export const sendVendorApprovalSMS = async (phone, storeName) => {
  const message = `Congratulations! Your store "${storeName}" has been approved on QuickMedi. You can now start accepting orders.`;
  return await sendSMS(phone, message);
};

/**
 * Send vendor rejection SMS
 */
export const sendVendorRejectionSMS = async (phone, reason) => {
  const message = `Your QuickMedi vendor application has been rejected. Reason: ${reason}. Please contact support for more information.`;
  return await sendSMS(phone, message);
};

/**
 * Send vendor registration received SMS
 */
export const sendVendorRegistrationReceivedSMS = async (phone, storeName) => {
  const message = `Thank you for registering "${storeName}" on QuickMedi. Your application is pending admin approval. You will be notified once approved.`;
  return await sendSMS(phone, message);
};

/**
 * Send order confirmation SMS
 */
export const sendOrderConfirmationSMS = async (phone, orderId, vendorName) => {
  const message = `Your QuickMedi order #${orderId} has been confirmed by ${vendorName}. Track your order in the app.`;
  return await sendSMS(phone, message);
};

/**
 * Send order delivered SMS
 */
export const sendOrderDeliveredSMS = async (phone, orderId) => {
  const message = `Your QuickMedi order #${orderId} has been delivered. Thank you for your order!`;
  return await sendSMS(phone, message);
};

/**
 * Send emergency alert SMS to vendor
 */
export const sendEmergencyAlertSMS = async (phone, patientName, medicineName, distance) => {
  const message = `EMERGENCY: ${patientName} needs ${medicineName || 'urgent medicine'} approximately ${distance}km away. Open QuickMedi app to respond.`;
  return await sendSMS(phone, message);
};

/**
 * Send emergency alert to family contacts
 */
export const sendFamilyEmergencySMS = async (phone, patientName, contactName) => {
  const message = `ALERT: ${patientName} has triggered an emergency alert on QuickMedi. Please check on them immediately.`;
  return await sendSMS(phone, message);
};

/**
 * Send subscription expiry reminder
 */
export const sendSubscriptionExpirySMS = async (phone) => {
  const message = `Your QuickMedi Pro subscription has expired. Renew now to continue enjoying unlimited scans and premium features.`;
  return await sendSMS(phone, message);
};

export default {
  sendSMS,
  sendOTPSMS,
  sendVendorApprovalSMS,
  sendVendorRejectionSMS,
  sendVendorRegistrationReceivedSMS,
  sendOrderConfirmationSMS,
  sendOrderDeliveredSMS,
  sendEmergencyAlertSMS,
  sendFamilyEmergencySMS,
  sendSubscriptionExpirySMS,
};
