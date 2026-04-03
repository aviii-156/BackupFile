import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
  },
  dosage: {
    type: String,
  },
  instruction: {
    type: String,
  },
  times: {
    type: [String], // ["08:00", "20:00"]
    required: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'twice_daily', 'thrice_daily', 'weekly', 'custom'],
    default: 'daily',
  },
  customDays: [{
    type: String,
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  }],
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  totalDoses: {
    type: Number,
    default: 0,
  },
  takenDoses: {
    type: Number,
    default: 0,
  },
  missedDoses: {
    type: Number,
    default: 0,
  },
  consecutiveMisses: {
    type: Number,
    default: 0,
  },
  // Timestamp of the last dose marked as taken — used by the auto-missed scheduler
  lastTakenAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

reminderSchema.index({ userId: 1, isActive: 1 });
reminderSchema.index({ startDate: 1, endDate: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
