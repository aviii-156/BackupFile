import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brandName: {
    type: String,
    trim: true,
  },
  genericName: {
    type: String,
    required: true,
    trim: true,
  },
  composition: {
    type: String,
    required: true,
  },
  activeIngredients: [{
    name: String,
    strength: String,
    unit: String,
  }],
  strength: {
    type: String,
  },
  form: {
    type: String,
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'other'],
  },
  category: {
    type: String,
    enum: ['antibiotic', 'analgesic', 'antidiabetic', 'antihypertensive', 'antifungal', 'antiviral', 'vitamin', 'antacid', 'antiallergic', 'other'],
  },
  therapeuticClass: {
    type: String,
  },
  usedFor: [String],
  sideEffects: [String],
  contraindications: [String],
  foodInteractions: [String],
  howToTake: {
    type: String,
  },
  dosageInstructions: {
    type: String,
  },
  safeDailyDose: {
    adult: {
      amount: Number,
      unit: String,
    },
    child: {
      amount: Number,
      unit: String,
    },
  },
  requiresPrescription: {
    type: Boolean,
    default: false,
  },
  scheduleClass: {
    type: String,
    enum: ['H', 'H1', 'G', 'X', 'OTC', null],
  },
  mrp: {
    type: Number,
  },
  averageMarketPrice: {
    type: Number,
  },
  source: {
    type: String,
    enum: ['openfda', 'manual', 'vendor_added'],
    default: 'manual',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'addedByModel',
  },
  addedByModel: {
    type: String,
    enum: ['Admin', 'Vendor'],
  },
  approvalStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
  },
  approvalNote: {
    type: String,
  },
  alternatives: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
  }],
  searchTags: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Text index for search
medicineSchema.index({ 
  name: 'text', 
  genericName: 'text', 
  composition: 'text',
  searchTags: 'text',
});

medicineSchema.index({ approvalStatus: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ form: 1 });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
