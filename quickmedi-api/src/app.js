import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import medicineRoutes from './routes/medicine.routes.js';
import storeRoutes from './routes/store.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import orderRoutes from './routes/order.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import adminRoutes from './routes/admin.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import sathiRoutes from './routes/sathi.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QuickMedi API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/medicine', medicineRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/prescription', prescriptionRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/sathi', sathiRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
