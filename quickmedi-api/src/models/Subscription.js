import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'paused'],
    default: 'active',
  },
  stripeSubscriptionId: {
    type: String,
  },
  stripePaymentIntentId: {
    type: String,
  },
  amount: {
    type: Number,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  cancelledAt: {
    type: Date,
  },
  cancelReason: {
    type: String,
  },
}, {
  timestamps: true,
});

subscriptionSchema.index({ userId: 1, status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
