import Vendor from '../models/Vendor.js';
import VendorInventory from '../models/VendorInventory.js';
import { calculateDistance } from '../utils/calculateDistance.js';
import { calculateDeliveryTime } from '../utils/calculateDeliveryTime.js';

/**
 * Location Service - Find nearby vendors and calculate distances
 */

/**
 * Find nearby vendors within a radius
 */
export const findNearbyVendors = async (latitude, longitude, radiusInKm = 10, limit = 20) => {
  try {
    const vendors = await Vendor.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInKm * 1000, // Convert km to meters
        },
      },
      approvalStatus: 'approved',
      isActive: true,
    })
    .limit(limit)
    .select('-refreshToken -lastLogoutAt');

    // Calculate distance and delivery time for each vendor
    const vendorsWithDistance = vendors.map(vendor => {
      const distance = calculateDistance(
        latitude,
        longitude,
        vendor.location.coordinates[1],
        vendor.location.coordinates[0]
      );

      const deliveryTime = calculateDeliveryTime(distance);

      return {
        ...vendor.toObject(),
        distance: parseFloat(distance.toFixed(2)),
        deliveryTime,
      };
    });

    return vendorsWithDistance;
  } catch (error) {
    console.error('Find nearby vendors error:', error);
    throw error;
  }
};

/**
 * Find vendors with specific medicine in stock
 */
export const findVendorsWithMedicine = async (medicineId, latitude, longitude, radiusInKm = 10) => {
  try {
    // Find inventory items with this medicine that are available
    const inventoryItems = await VendorInventory.find({
      medicineId,
      isAvailable: true,
      stock: { $gt: 0 },
      isExpired: false,
    }).populate('vendorId');

    // Filter for approved vendors and calculate distances
    const vendorsWithMedicine = [];

    for (const item of inventoryItems) {
      const vendor = item.vendorId;

      if (!vendor || vendor.approvalStatus !== 'approved' || !vendor.isActive) {
        continue;
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        vendor.location.coordinates[1],
        vendor.location.coordinates[0]
      );

      // Only include vendors within radius
      if (distance <= radiusInKm) {
        const deliveryTime = calculateDeliveryTime(distance);

        vendorsWithMedicine.push({
          vendorId: vendor._id,
          storeName: vendor.storeName,
          distance: parseFloat(distance.toFixed(2)),
          deliveryTime,
          isOpenNow: vendor.isOpenNow,
          deliveryAvailable: vendor.deliveryAvailable,
          inventoryId: item._id,
          price: item.vendorPrice,
          stock: item.stock,
          discount: item.discount,
          rating: vendor.rating,
        });
      }
    }

    // Sort by distance
    vendorsWithMedicine.sort((a, b) => a.distance - b.distance);

    return vendorsWithMedicine;
  } catch (error) {
    console.error('Find vendors with medicine error:', error);
    throw error;
  }
};

/**
 * Find best vendor for prescription (cheapest with all medicines)
 */
export const findBestVendorForPrescription = async (medicineIds, latitude, longitude) => {
  try {
    // Find all vendors within 10km
    const nearbyVendors = await findNearbyVendors(latitude, longitude, 10);

    if (nearbyVendors.length === 0) {
      return null;
    }

    let bestVendor = null;
    let lowestPrice = Infinity;

    for (const vendor of nearbyVendors) {
      // Check if vendor has all medicines
      const inventory = await VendorInventory.find({
        vendorId: vendor._id,
        medicineId: { $in: medicineIds },
        isAvailable: true,
        stock: { $gt: 0 },
        isExpired: false,
      });

      // Vendor must have all medicines
      if (inventory.length === medicineIds.length) {
        // Calculate total price
        const totalPrice = inventory.reduce((sum, item) => sum + item.vendorPrice, 0);

        if (totalPrice < lowestPrice) {
          lowestPrice = totalPrice;
          bestVendor = {
            vendorId: vendor._id,
            storeName: vendor.storeName,
            distance: vendor.distance,
            deliveryTime: vendor.deliveryTime,
            totalPrice: lowestPrice,
            isOpenNow: vendor.isOpenNow,
            rating: vendor.rating,
          };
        }
      }
    }

    return bestVendor;
  } catch (error) {
    console.error('Find best vendor error:', error);
    throw error;
  }
};

/**
 * Find emergency vendors (open now, accepts emergency)
 */
export const findEmergencyVendors = async (latitude, longitude, radiusInKm = 15) => {
  try {
    const vendors = await Vendor.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInKm * 1000,
        },
      },
      approvalStatus: 'approved',
      isActive: true,
      acceptsEmergency: true,
    })
    .limit(10)
    .select('storeName phone location isOpenNow');

    const vendorsWithDistance = vendors.map(vendor => {
      const distance = calculateDistance(
        latitude,
        longitude,
        vendor.location.coordinates[1],
        vendor.location.coordinates[0]
      );

      return {
        ...vendor.toObject(),
        distance: parseFloat(distance.toFixed(2)),
      };
    });

    // Sort by distance
    vendorsWithDistance.sort((a, b) => a.distance - b.distance);

    return vendorsWithDistance;
  } catch (error) {
    console.error('Find emergency vendors error:', error);
    throw error;
  }
};

export default {
  findNearbyVendors,
  findVendorsWithMedicine,
  findBestVendorForPrescription,
  findEmergencyVendors,
};
