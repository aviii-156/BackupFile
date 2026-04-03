import mongoose from 'mongoose';

const platformStatsSchema = new mongoose.Schema({
  totalSavingsGenerated: {
    type: Number,
    default: 0,
  },
  totalPrescriptionsProcessed: {
    type: Number,
    default: 0,
  },
  totalUsers: {
    type: Number,
    default: 0,
  },
  totalVendors: {
    type: Number,
    default: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const PlatformStats = mongoose.model('PlatformStats', platformStatsSchema);

export default PlatformStats;
