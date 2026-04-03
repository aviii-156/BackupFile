import admin from 'firebase-admin';
import { config } from './env.js';

let firebaseApp;

export const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    }
    return firebaseApp;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    // Don't exit process - allow app to run without push notifications
    return null;
  }
};

export const sendPushNotification = async (tokens, notification, data = {}) => {
  try {
    if (!firebaseApp) {
      console.warn('Firebase not initialized, skipping push notification');
      return null;
    }

    // Filter out invalid tokens
    const validTokens = Array.isArray(tokens) ? tokens : [tokens];
    
    if (validTokens.length === 0) {
      return null;
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      tokens: validTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Log failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(validTokens[idx]);
        }
      });
      console.log('Failed to send to tokens:', failedTokens);
    }

    return response;
  } catch (error) {
    console.error('Push notification error:', error.message);
    return null;
  }
};

export default admin;
