/**
 * MedicineCatalog Model
 * Maps to the `medicines_db` collection populated by the AI push script.
 * Schema matches indian_pharmaceutical_products_clean.csv (available rows only).
 *
 * This is a READ-ONLY catalog.  Vendors never write directly here;
 * they reference a product_id when adding to their own inventory.
 */
import mongoose from 'mongoose';

const activeIngredientSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    strength: { type: String, trim: true },
    full_description: { type: String, trim: true },
  },
  { _id: false }
);

const medicineCatalogSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    // --- exact field names as stored in MongoDB by push script ---
    brand_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name_normalized: {
      type: String,
      trim: true,
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
    },
    dosage_form: {
      type: String,
      trim: true,
      index: true,
    },
    packaging: {
      type: String,
      trim: true,
    },
    pack_size: {
      type: Number,
    },
    pack_unit: {
      type: String,
      trim: true,
    },
    num_active_ingredients: {
      type: Number,
    },
    primary_ingredient: {
      type: String,
      trim: true,
      index: true,
    },
    primary_strength: {
      type: String,
      trim: true,
    },
    active_ingredients: [activeIngredientSchema],
    composition_normalized: {
      type: String,
      trim: true,
      index: true,
    },
    therapeutic_class: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    collection: 'medicines_db',
    timestamps: false,
  }
);

// Full-text search index on actual field names
medicineCatalogSchema.index(
  { brand_name: 'text', primary_ingredient: 'text', manufacturer: 'text' },
  { name: 'catalog_text_index', background: true }
);

const MedicineCatalog = mongoose.model('MedicineCatalog', medicineCatalogSchema);

export default MedicineCatalog;
