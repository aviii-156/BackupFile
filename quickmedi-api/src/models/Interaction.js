import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  medicineA: {
    type: String,
    required: true,
  },
  medicineB: {
    type: String,
    required: true,
  },
  medicineAId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
  },
  medicineBId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
  },
  severity: {
    type: String,
    enum: ['safe', 'moderate', 'dangerous'],
    required: true,
  },
  mechanism: {
    type: String,
  },
  effect: {
    type: String,
  },
  recommendation: {
    type: String,
  },
  source: {
    type: String,
    enum: ['openfda', 'manual'],
    default: 'manual',
  },
}, {
  timestamps: true,
});

interactionSchema.index({ medicineA: 1, medicineB: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;
