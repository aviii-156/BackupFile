import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
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
    sparse: true,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  profilePhoto: {
    type: String,
  },
  role: {
    type: String,
    default: 'patient',
    enum: ['patient'],
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
  isActive: {
    type: Boolean,
    default: true,
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en',
  },
  subscription: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  subscriptionExpiry: {
    type: Date,
  },
  stripeCustomerId: {
    type: String,
  },
  stripeSubscriptionId: {
    type: String,
  },
  dailyScans: {
    date: {
      type: Date,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  savedAddresses: [{
    label: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  }],
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String,
  }],
  medicalInfo: {
    bloodGroup: String,
    allergies: [String],
    chronicConditions: [String],
    currentMedicines: [String],
  },
  fcmTokens: [{
    token: String,
    device: String,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  totalPrescriptions: {
    type: Number,
    default: 0,
  },
  totalSaved: {
    type: Number,
    default: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// 2dsphere index for geospatial queries
userSchema.index({ 'savedAddresses.location': '2dsphere' });

// Pre-save hook: hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
