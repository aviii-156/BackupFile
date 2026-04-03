import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientPhone: {
    type: String,
    required: true,
  },
  patientLocation: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  medicineNeeded: {
    type: String,
  },
  notes: {
    type: String,
  },
  type: {
    type: String,
    enum: ['pharmacy_alert', 'ambulance', 'family_alert'],
    default: 'pharmacy_alert',
  },
  status: {
    type: String,
    enum: ['sent', 'acknowledged', 'responded', 'resolved', 'expired'],
    default: 'sent',
  },
  alertedVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    alertedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['alerted', 'ignored', 'responded'],
      default: 'alerted',
    },
  }],
  respondedVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  responseTime: {
    type: Number, // in seconds
  },
  respondedAt: {
    type: Date,
  },
  smsSent: {
    type: Boolean,
    default: false,
  },
  smsFallback: {
    type: Boolean,
    default: false,
  },
  familyContactsAlerted: [String],
  ambulanceCalled: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
}, {
  timestamps: true,
});

emergencySchema.index({ patientLocation: '2dsphere' });
emergencySchema.index({ status: 1 });
emergencySchema.index({ createdAt: -1 });

const Emergency = mongoose.model('Emergency', emergencySchema);

export default Emergency;
