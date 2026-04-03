import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Vendor from '../models/Vendor.js';
import VendorInventory from '../models/VendorInventory.js';
import { findNearbyVendors, findVendorsWithMedicine } from '../services/location.service.js';

/**
 * @route   GET /api/store/nearby
 * @desc    Get nearby stores
 * @access  Public
 */
export const getNearbyStores = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, 'Latitude and longitude are required');
  }

  const radiusInKm = radius ? parseFloat(radius) : 10;
  const vendors = await findNearbyVendors(parseFloat(latitude), parseFloat(longitude), radiusInKm);

  return apiResponse(res, 200, 'Nearby stores found', { stores: vendors, count: vendors.length });
});

/**
 * @route   GET /api/store/:id
 * @desc    Get store details
 * @access  Public
 */
export const getStoreById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vendor = await Vendor.findById(id)
    .select('-refreshToken -lastLogoutAt -licenseDocument -gstDocument');

  if (!vendor || vendor.approvalStatus !== 'approved') {
    throw new ApiError(404, 'Store not found');
  }

  return apiResponse(res, 200, 'Store details', { store: vendor });
});

/**
 * @route   GET /api/store/:id/inventory
 * @desc    Get store inventory
 * @access  Public
 */
export const getStoreInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { search, category, inStock } = req.query;

  const vendor = await Vendor.findById(id);

  if (!vendor || vendor.approvalStatus !== 'approved') {
    throw new ApiError(404, 'Store not found');
  }

  const query = {
    vendorId: id,
    isExpired: false,
  };

  if (inStock === 'true') {
    query.isAvailable = true;
    query.stock = { $gt: 0 };
  }

  if (category) {
    query.category = category;
  }

  let inventory = await VendorInventory.find(query)
    .populate('medicineId', 'name genericName composition form category')
    .sort({ medicineName: 1 });

  if (search) {
    const searchLower = search.toLowerCase();
    inventory = inventory.filter(item =>
      item.medicineName.toLowerCase().includes(searchLower) ||
      item.genericName.toLowerCase().includes(searchLower) ||
      item.composition.toLowerCase().includes(searchLower)
    );
  }

  return apiResponse(res, 200, 'Store inventory', { inventory, count: inventory.length });
});

/**
 * @route   GET /api/store/compare
 * @desc    Compare medicine prices across stores
 * @access  Public
 */
export const compareMedicinePrices = asyncHandler(async (req, res) => {
  const { medicine, latitude, longitude } = req.query;

  if (!medicine || !latitude || !longitude) {
    throw new ApiError(400, 'Medicine ID, latitude, and longitude are required');
  }

  const vendors = await findVendorsWithMedicine(
    medicine,
    parseFloat(latitude),
    parseFloat(longitude),
    10
  );

  return apiResponse(res, 200, 'Price comparison', { vendors, count: vendors.length });
});

/**
 * @route   POST /api/store/search-by-medicines
 * @desc    Find all vendors that stock any of the given medicine names
 * @access  Public
 */
export const searchByMedicineNames = asyncHandler(async (req, res) => {
  const { medicines } = req.body;

  if (!Array.isArray(medicines) || medicines.length === 0) {
    throw new ApiError(400, 'medicines array is required');
  }

  // Build OR conditions — match medicineName or genericName for each entry
  const conditions = medicines.map((name) => ({
    $or: [
      { medicineName: { $regex: name.trim(), $options: 'i' } },
      { genericName:  { $regex: name.trim(), $options: 'i' } },
    ],
  }));

  const items = await VendorInventory.find({
    $or: conditions,
    isAvailable: true,
    isExpired: false,
    stock: { $gt: 0 },
  }).populate('vendorId', 'storeName ownerName address rating deliveryAvailable deliveryCharge minimumOrderAmount approvalStatus isActive operatingHours');

  // Only keep items from approved, active vendors
  const valid = items.filter((i) => i.vendorId && i.vendorId.approvalStatus === 'approved');

  // Group by vendor
  const map = new Map();
  for (const item of valid) {
    const vid = item.vendorId._id.toString();
    if (!map.has(vid)) map.set(vid, { store: item.vendorId, matchedItems: [] });
    map.get(vid).matchedItems.push(item);
  }

  // Most matches first
  const result = Array.from(map.values()).sort(
    (a, b) => b.matchedItems.length - a.matchedItems.length
  );

  return apiResponse(res, 200, 'Vendors found', { vendors: result, total: result.length, requestedMedicines: medicines });
});

export default {
  getNearbyStores,
  getStoreById,
  getStoreInventory,
  compareMedicinePrices,
  searchByMedicineNames,
};
