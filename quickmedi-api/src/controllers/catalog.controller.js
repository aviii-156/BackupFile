/**
 * catalog.controller.js
 * Allows vendors (and admins) to search the medicines_db catalog
 * to add medicines to their own inventory.
 */
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import MedicineCatalog from '../models/MedicineCatalog.js';
import VendorInventory from '../models/VendorInventory.js';

/**
 * @route   GET /api/catalog/search
 * @desc    Search medicines catalog by name, ingredient, form, therapeutic_class
 * @access  Vendor, Admin
 * @query   q, form, therapeutic_class, page, limit
 */
export const searchCatalog = asyncHandler(async (req, res) => {
  const { q, form, therapeutic_class, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  const query = {
    $or: [
      { brand_name: { $regex: q.trim(), $options: 'i' } },
      { primary_ingredient: { $regex: q.trim(), $options: 'i' } },
      { manufacturer: { $regex: q.trim(), $options: 'i' } },
      { composition_normalized: { $regex: q.trim(), $options: 'i' } },
    ],
  };

  if (form && form !== 'all') query.dosage_form = form.toLowerCase();
  if (therapeutic_class && therapeutic_class !== 'all') {
    query.therapeutic_class = therapeutic_class.toLowerCase();
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [results, total] = await Promise.all([
    MedicineCatalog.find(query)
      .sort({ brand_name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        'product_id brand_name manufacturer price dosage_form packaging pack_unit ' +
        'pack_size primary_ingredient primary_strength ' +
        'therapeutic_class active_ingredients composition_normalized name_normalized'
      ),
    MedicineCatalog.countDocuments(query),
  ]);

  return apiResponse(res, 200, 'Catalog search results', {
    results,
    query: q,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalResults: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   GET /api/catalog/:productId
 * @desc    Get single catalog item by product_id
 * @access  Vendor, Admin
 */
export const getCatalogItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const item = await MedicineCatalog.findOne({ product_id: parseInt(productId) });
  if (!item) throw new ApiError(404, 'Medicine not found in catalog');
  return apiResponse(res, 200, 'Catalog item', { medicine: item });
});

/**
 * @route   POST /api/catalog/:productId/add-to-inventory
 * @desc    Vendor adds a catalog medicine to their own inventory
 * @access  Vendor
 * @body    { mrp, vendorPrice, discount, stock, unit, batchNumber, expiryDate, manufacturingDate, lowStockThreshold }
 */
export const addCatalogItemToInventory = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const vendorId = req.user._id;

  const catalogItem = await MedicineCatalog.findOne({ product_id: parseInt(productId) });
  if (!catalogItem) throw new ApiError(404, 'Medicine not found in catalog');

  const {
    mrp,
    vendorPrice,
    discount = 0,
    stock,
    unit = 'strip',
    batchNumber,
    expiryDate,
    manufacturingDate,
    lowStockThreshold = 10,
  } = req.body;

  if (!mrp || !vendorPrice || stock === undefined || stock === null || !expiryDate) {
    throw new ApiError(400, 'mrp, vendorPrice, stock and expiryDate are required');
  }

  // Build a Medicine-compatible inventory record from the catalog item
  const invData = {
    vendorId,
    // Keep medicineId flexible – store product_id as reference note
    medicineName: catalogItem.brand_name,
    genericName: catalogItem.primary_ingredient || catalogItem.brand_name,
    composition: catalogItem.composition_normalized,
    category: catalogItem.therapeutic_class,
    form: catalogItem.dosage_form,
    manufacturer: catalogItem.manufacturer,
    mrp: parseFloat(mrp),
    vendorPrice: parseFloat(vendorPrice),
    discount: parseFloat(discount),
    stock: parseInt(stock),
    unit,
    batchNumber,
    expiryDate: new Date(expiryDate),
    manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
    lowStockThreshold: parseInt(lowStockThreshold),
    isAvailable: parseInt(stock) > 0,
    isLowStock: parseInt(stock) <= parseInt(lowStockThreshold),
    // Store catalog product_id for traceability (extend schema if needed)
    catalogProductId: catalogItem.product_id,
  };

  // Upsert – if same vendor already has this catalog product, update stock/price
  const existing = await VendorInventory.findOne({
    vendorId,
    medicineName: catalogItem.brand_name,
    genericName: invData.genericName,
  });

  let inventory;
  if (existing) {
    Object.assign(existing, invData);
    inventory = await existing.save();
  } else {
    // medicineId is required in the existing schema – we'll use a dummy ObjectId
    // In a full migration you'd update the schema to make medicineId optional
    invData.medicineId = new (await import('mongoose')).default.Types.ObjectId();
    inventory = await VendorInventory.create(invData);
  }

  return apiResponse(res, 201, 'Medicine added to inventory', { inventory });
});
