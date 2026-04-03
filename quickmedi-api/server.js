import http from 'http';
import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { initializeSocket } from './src/config/socket.js';
import { initializeFirebase } from './src/config/firebase.js';
import { startReminderScheduler } from './src/services/reminderScheduler.service.js';

// Connect to database
await connectDB();

// Initialize Firebase (optional - app continues if it fails)
initializeFirebase();

// Start medicine reminder push-notification scheduler
startReminderScheduler();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start server
const PORT = config.port || 5000;

server.listen(PORT, () => {
  console.log(`QuickMedi API Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

export default server;
