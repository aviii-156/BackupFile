import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

/**
 * Send OTP email
 */
export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: 'Your QuickMedi OTP Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>QuickMedi</h1>
              <p>Verify Your Email Address</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for choosing QuickMedi! Use the following OTP to complete your authentication:</p>
              
              <div class="otp-box">${otp}</div>
              
              <p><strong>This OTP is valid for 10 minutes.</strong></p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. QuickMedi will never ask for your OTP via phone or email.
              </div>
              
              <p>If you didn't request this OTP, please ignore this email.</p>
              
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
            <div class="footer">
              <p>© 2026 QuickMedi. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your QuickMedi OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nThank you,\nTeam QuickMedi`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: 'Welcome to QuickMedi!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to QuickMedi! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Welcome to QuickMedi - your smart medicine savings platform!</p>
              <p>With QuickMedi, you can:</p>
              <ul>
                <li>📸 Scan prescriptions with AI-powered analysis</li>
                <li>💰 Find cheaper generic alternatives</li>
                <li>🏪 Compare prices across nearby pharmacies</li>
                <li>🚨 Get emergency medicine alerts</li>
                <li>💊 Set medicine reminders</li>
              </ul>
              <p>Start scanning your prescriptions today and save money on your medicines!</p>
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
            <div class="footer">
              <p>© 2026 QuickMedi. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Send vendor registration received email
 */
export const sendVendorRegistrationEmail = async (email, storeName) => {
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: 'Vendor Registration Received - QuickMedi',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>QuickMedi Vendor Portal</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear ${storeName},</p>
              <p>Thank you for registering with QuickMedi!</p>
              <p>Your vendor application has been received and is currently under review by our team.</p>
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our team will verify your documents within 24-48 hours</li>
                <li>You'll receive an email once your account is approved</li>
                <li>After approval, you can start managing your inventory</li>
              </ul>
              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending vendor registration email:', error);
    throw error;
  }
};

/**
 * Send vendor approval email
 */
export const sendVendorApprovalEmail = async (email, storeName) => {
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: '🎉 Your Vendor Account is Approved!',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🎉 Congratulations!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear ${storeName},</p>
              <p><strong>Great news! Your vendor account has been approved.</strong></p>
              <p>You can now:</p>
              <ul>
                <li>Add and manage your medicine inventory</li>
                <li>Receive orders from customers</li>
                <li>Track your sales and revenue</li>
                <li>Respond to emergency medicine requests</li>
              </ul>
              <p>Log in to your account and start serving customers today!</p>
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending vendor approval email:', error);
    throw error;
  }
};

/**
 * Send vendor rejection email
 */
export const sendVendorRejectionEmail = async (email, storeName, reason) => {
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: 'Vendor Application Update - QuickMedi',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>Application Update</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Dear ${storeName},</p>
              <p>Thank you for your interest in joining QuickMedi.</p>
              <p>Unfortunately, we are unable to approve your vendor application at this time.</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>If you believe this is an error or would like to reapply after addressing the issues, please contact our support team.</p>
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending vendor rejection email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetUrl, userType = 'patient') => {
  const roleLabel = userType === 'admin' ? 'Admin' : userType === 'vendor' ? 'Vendor' : 'User';
  const mailOptions = {
    from: `"QuickMedi" <${config.email.from}>`,
    to: email,
    subject: 'Reset Your QuickMedi Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .url { word-break: break-all; color: #666; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>QuickMedi</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your QuickMedi <strong>${roleLabel}</strong> account associated with this email address.</p>
              <p>Click the button below to reset your password. This link is valid for <strong>15 minutes</strong>.</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="btn">Reset Password</a>
              </div>
              <p>Or copy and paste this URL into your browser:</p>
              <p class="url">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
              </div>
              <p>Best regards,<br>Team QuickMedi</p>
            </div>
            <div class="footer">
              <p>© 2026 QuickMedi. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Reset your QuickMedi password by visiting:\n\n${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export default {
  sendOTPEmail,
  sendWelcomeEmail,
  sendVendorRegistrationEmail,
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
  sendPasswordResetEmail,
};
