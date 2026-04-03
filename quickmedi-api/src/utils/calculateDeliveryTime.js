/**
 * Calculate estimated delivery time based on distance
 * Returns time in minutes
 */
export const calculateDeliveryTime = (distanceInKm) => {
  if (distanceInKm < 1) {
    return 10; // Less than 1 km = 10 minutes
  } else if (distanceInKm >= 1 && distanceInKm < 2) {
    return 15; // 1-2 km = 15 minutes
  } else if (distanceInKm >= 2 && distanceInKm < 5) {
    return 25; // 2-5 km = 25 minutes
  } else {
    return 40; // More than 5 km = 40 minutes
  }
};

export default calculateDeliveryTime;
