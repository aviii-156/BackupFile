import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'complete', 'failed'],
    default: 'uploading',
  },
  doctorName: {
    type: String,
  },
  prescriptionDate: {
    type: Date,
  },
  patientName: {
    type: String,
  },
  detectedMedicines: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    instruction: String,
    confidence: Number,
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
  }],
  alternatives: [{
    originalMedicineName: String,
    alternatives: [{
      medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
      name: String,
      price: Number,
      trustScore: Number,
      savingsAmount: Number,
      reason: String,
    }],
  }],
  interactions: [{
    medicineA: String,
    medicineB: String,
    severity: {
      type: String,
      enum: ['safe', 'moderate', 'dangerous'],
    },
    effect: String,
    recommendation: String,
  }],
  duplicates: [{
    medicines: [String],
    sharedIngredient: String,
    warning: String,
  }],
  safetyChecks: [{
    medicine: String,
    currentDose: Number,
    safeLimit: Number,
    unit: String,
    status: {
      type: String,
      enum: ['safe', 'warning', 'danger'],
    },
    percentage: Number,
  }],
  costs: {
    original: Number,
    optimized: Number,
    saved: Number,
  },
  recommendedStore: {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    storeName: String,
    distance: Number,
    deliveryTime: Number,
    totalPrice: Number,
  },
  overallSafety: {
    type: String,
    enum: ['safe', 'warning', 'danger'],
    default: 'safe',
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
}, {
  timestamps: true,
});

prescriptionSchema.index({ userId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
