/**
 * VendorFulfillment.js
 *
 * Represents one vendor's slice of a parent Order.
 * A parent Order always has at least one VendorFulfillment (primary vendor).
 * Rejected items are re-broadcast, creating additional VendorFulfillment documents
 * for fallback vendors — each linked to the same parentOrderId.
 *
 * Lifecycle:
 *   pending_response → accepted / partially_accepted / rejected
 *   accepted | partially_accepted → out_for_delivery → delivered
 */
import mongoose from 'mongoose';

const fulfillmentItemSchema = new mongoose.Schema(
  {
    /** Reference to the item subdocument inside parent Order.items */
    parentItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorInventory',
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    medicineName: {
      type: String,
      required: true,
    },
    genericName: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    mrp: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    /**
     * pending   – awaiting vendor response
     * accepted  – vendor confirmed availability
     * rejected  – vendor cannot fulfil (triggers broadcast to fallback vendors)
     */
    itemStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { _id: true }
);

const vendorFulfillmentSchema = new mongoose.Schema(
  {
    /** The original order placed by the patient */
    parentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    /** The vendor responsible for this fulfillment slice */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    /** Denormalised for efficient patient-side queries */
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Items this vendor is expected to fulfil */
    items: [fulfillmentItemSchema],

    /**
     * pending_response    – awaiting accept/reject from vendor
     * accepted            – all items accepted
     * partially_accepted  – some accepted, some rejected (rejected items were broadcast)
     * rejected            – all items rejected
     * out_for_delivery    – dispatch confirmed by vendor
     * delivered           – patient received
     * cancelled           – cancelled before vendor responded
     */
    status: {
      type: String,
      enum: [
        'pending_response',
        'accepted',
        'partially_accepted',
        'rejected',
        'out_for_delivery',
        'delivered',
        'cancelled',
      ],
      default: 'pending_response',
      index: true,
    },

    /** true when this came from a broadcast (not the primary/selected vendor) */
    isFallback: {
      type: Boolean,
      default: false,
      index: true,
    },

    /** Financial totals for accepted items only (recalculated after vendor responds) */
    subtotal: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },

    /** Audit trail */
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    /** Timestamps for key transitions */
    respondedAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

// ── Compound indexes ────────────────────────────────────────────────────────
vendorFulfillmentSchema.index({ parentOrderId: 1, vendorId: 1 });
vendorFulfillmentSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
vendorFulfillmentSchema.index({ patientId: 1, createdAt: -1 });

const VendorFulfillment = mongoose.model('VendorFulfillment', vendorFulfillmentSchema);

export default VendorFulfillment;
