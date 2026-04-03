import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const vendorSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  storePhoto: {
    type: String,
  },
  role: {
    type: String,
    default: 'vendor',
    enum: ['vendor'],
  },
  password: {
    type: String,
    select: false,
  },
  refreshToken: {
    type: String,
  },
  lastLogoutAt: {
    type: Date,
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  gstNumber: {
    type: String,
  },
  licenseDocument: {
    type: String,
    required: true,
  },
  gstDocument: {
    type: String,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvalNote: {
    type: String,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  approvedAt: {
    type: Date,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  rejectedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  address: {
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: String,
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  operatingHours: {
    monday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    tuesday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    wednesday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    thursday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    friday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    saturday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
    sunday: {
      open: String,
      close: String,
      isClosed: { type: Boolean, default: false },
    },
  },
  isOpenNow: {
    type: Boolean,
    default: false,
  },
  deliveryAvailable: {
    type: Boolean,
    default: true,
  },
  deliveryRadius: {
    type: Number,
    default: 5, // in km
  },
  minimumOrderAmount: {
    type: Number,
    default: 0,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  acceptsEmergency: {
    type: Boolean,
    default: true,
  },
  stripeAccountId: {
    type: String,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  fcmTokens: [{
    token: String,
    device: String,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en',
  },
}, {
  timestamps: true,
});

// 2dsphere index for geospatial queries
vendorSchema.index({ location: '2dsphere' });
vendorSchema.index({ approvalStatus: 1 });

// Pre-save hook: hash password if modified
vendorSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method: compare password
vendorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
