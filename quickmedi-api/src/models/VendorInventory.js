import mongoose from 'mongoose';

const vendorInventorySchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: false,   // optional when medicine comes from MedicineCatalog
  },
  // catalog reference (product_id from medicines_db)
  catalogProductId: {
    type: Number,
    index: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  genericName: {
    type: String,
    required: true,
  },
  composition: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  form: {
    type: String,
  },
  mrp: {
    type: Number,
    required: true,
  },
  vendorPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
  unit: {
    type: String,
    enum: ['strip', 'bottle', 'piece', 'box'],
    default: 'strip',
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  batchNumber: {
    type: String,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  manufacturingDate: {
    type: Date,
  },
  manufacturer: {
    type: String,
  },
  isLowStock: {
    type: Boolean,
    default: false,
  },
  isExpiringSoon: {
    type: Boolean,
    default: false,
  },
  isExpired: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound unique index
vendorInventorySchema.index({ vendorId: 1, medicineId: 1 }, { unique: true });
vendorInventorySchema.index({ vendorId: 1, isAvailable: 1 });
vendorInventorySchema.index({ expiryDate: 1 });

const VendorInventory = mongoose.model('VendorInventory', vendorInventorySchema);

export default VendorInventory;
