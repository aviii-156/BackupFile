import mongoose from 'mongoose';

const doseLogSchema = new mongoose.Schema({
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  scheduledTime: {
    type: String, // HH:MM format
    required: true,
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['taken', 'skipped', 'snoozed', 'pending'],
    default: 'pending',
  },
  respondedAt: {
    type: Date,
  },
  snoozeCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

doseLogSchema.index({ reminderId: 1, scheduledDate: -1 });
doseLogSchema.index({ userId: 1, status: 1 });

const DoseLog = mongoose.model('DoseLog', doseLogSchema);

export default DoseLog;
