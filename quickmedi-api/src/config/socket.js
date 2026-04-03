import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './env.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Admin from '../models/Admin.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      
      // Find user/vendor/admin
      let user;
      if (decoded.role === 'admin' || decoded.role === 'superadmin') {
        user = await Admin.findById(decoded.userId);
      } else if (decoded.role === 'vendor') {
        user = await Vendor.findById(decoded.userId);
        // Block unapproved vendors
        if (user && user.approvalStatus !== 'approved') {
          return next(new Error('Account not approved'));
        }
      } else {
        user = await User.findById(decoded.userId);
      }

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Check if token was issued before last logout
      if (user.lastLogoutAt && decoded.iat * 1000 < user.lastLogoutAt.getTime()) {
        return next(new Error('Token invalidated'));
      }

      socket.userId = decoded.userId;
      socket.role = decoded.role;
      socket.user = user;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.role})`);

    // Join appropriate rooms
    if (socket.role === 'patient') {
      socket.join(`user:${socket.userId}`);
    } else if (socket.role === 'vendor') {
      socket.join(`vendor:${socket.userId}`);
    } else if (socket.role === 'admin' || socket.role === 'superadmin') {
      socket.join('admin');
    }

    // Handle rider location updates
    socket.on('rider:location_update', async (data) => {
      const { orderId, lat, lng } = data;
      // Broadcast to order room
      io.to(`order:${orderId}`).emit('order:rider_location', {
        orderId,
        lat,
        lng,
        estimatedMinutes: data.estimatedMinutes || 15,
      });
    });

    // Handle emergency response
    socket.on('emergency:respond', async (data) => {
      const { emergencyId } = data;
      // This will be handled by the emergency controller
      // Socket emits will be done from there
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  console.log('Socket.IO initialized successfully');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export default { initializeSocket, getIO };
