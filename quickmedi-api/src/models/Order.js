import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorInventory',
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    medicineName: String,
    genericName: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    mrp: Number,
    discount: Number,
    /**
     * Per-item fulfilment tracking.
     * pending    – waiting for primary vendor response
     * accepted   – primary vendor accepted this item
     * rejected   – primary vendor rejected; item is being broadcast to fallback vendors
     * reassigned – a fallback vendor has claimed this item
     */
    itemStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'reassigned'],
      default: 'pending',
    },
    /**
     * Set atomically when a fallback VendorFulfillment claims this item.
     * Used to prevent two vendors from accepting the same rejected item.
     */
    claimedByFulfillmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorFulfillment',
    },
  }],
  subtotal: {
    type: Number,
    required: true,
  },
  deliveryCharge: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  savedAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'],
    default: 'placed',
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
  }],
  cancelReason: {
    type: String,
  },
  rejectReason: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ['stripe_card', 'stripe_upi', 'cod'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  stripePaymentIntentId: {
    type: String,
  },
  stripeChargeId: {
    type: String,
  },
  paidAt: {
    type: Date,
  },
  deliveryAddress: {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    location: {
      type: {
        type: String,
        default: 'Point',
      },
      coordinates: [Number],
    },
  },
  riderName: {
    type: String,
  },
  riderPhone: {
    type: String,
  },
  riderLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date,
  },
  estimatedDelivery: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  vendorAcceptedAt: {
    type: Date,
  },
  vendorRejectedAt: {
    type: Date,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
  },
  isRated: {
    type: Boolean,
    default: false,
  },
  isEmergencyOrder: {
    type: Boolean,
    default: false,
  },

  /**
   * Radius (km) used to search for fallback vendors when primary vendor rejects items.
   * Set by the patient during checkout.
   */
  fallbackRadius: {
    type: Number,
    default: 10,
    min: 1,
    max: 50,
  },

  /**
   * High-level fulfilment progress for the parent order.
   * pending   – no vendor has responded yet
   * partial   – at least one item accepted, others still in progress
   * fulfilled – all items are either accepted or reassigned to a fallback vendor
   * failed    – all items rejected with no fallback available
   */
  fulfillmentStatus: {
    type: String,
    enum: ['pending', 'partial', 'fulfilled', 'failed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

orderSchema.index({ patientId: 1, createdAt: -1 });
orderSchema.index({ vendorId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
