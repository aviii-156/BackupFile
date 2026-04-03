import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Order from '../models/Order.js';
import Admin from '../models/Admin.js';
import MedicineCatalog from '../models/MedicineCatalog.js';
import VendorInventory from '../models/VendorInventory.js';
import Emergency from '../models/Emergency.js';
import Subscription from '../models/Subscription.js';

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin
 */
export const getDashboard = asyncHandler(async (req, res) => {
  // Get counts
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalVendors = await Vendor.countDocuments({ isActive: true });
  const pendingVendors = await Vendor.countDocuments({ approvalStatus: 'pending' });
  const totalOrders = await Order.countDocuments();
  
  // Get recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('patientId', 'name email phone')
    .populate('vendorId', 'storeName')
    .select('orderNumber status totalAmount paymentStatus createdAt');

  // Get revenue statistics
  const completedOrders = await Order.find({ status: 'delivered' });
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get user growth (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newUsers = await User.countDocuments({ 
    createdAt: { $gte: thirtyDaysAgo } 
  });

  return apiResponse(res, 200, 'Dashboard data', {
    overview: {
      totalUsers,
      totalVendors,
      pendingVendors,
      totalOrders,
      totalRevenue,
      newUsersThisMonth: newUsers,
    },
    recentOrders,
  });
});

/**
 * @route   GET /api/admin/vendors/pending
 * @desc    Get all pending vendor approvals
 * @access  Admin
 */
export const getPendingVendors = asyncHandler(async (req, res) => {
  const pendingVendors = await Vendor.find({ approvalStatus: 'pending' })
    .sort({ createdAt: -1 })
    .select('-refreshToken');

  return apiResponse(res, 200, 'Pending vendors', {
    vendors: pendingVendors,
    count: pendingVendors.length,
  });
});

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors with filters
 * @access  Admin
 */
export const getAllVendors = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const query = {};
  
  if (status && status !== 'all') {
    query.approvalStatus = status;
  }

  if (search) {
    query.$or = [
      { storeName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const vendors = await Vendor.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-refreshToken');

  const total = await Vendor.countDocuments(query);

  return apiResponse(res, 200, 'Vendors list', {
    vendors,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalVendors: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   PUT /api/admin/vendors/:id/approve
 * @desc    Approve vendor registration
 * @access  Admin
 */
export const approveVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvalNote } = req.body;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  if (vendor.approvalStatus !== 'pending') {
    throw new ApiError(400, 'Vendor is not pending approval');
  }

  vendor.approvalStatus = 'approved';
  vendor.isActive = true;
  vendor.approvalNote = approvalNote || 'Approved by admin';
  vendor.approvedAt = new Date();
  vendor.approvedBy = req.user._id;

  await vendor.save();

  // TODO: Send approval email to vendor

  return apiResponse(res, 200, 'Vendor approved successfully', { vendor });
});

/**
 * @route   PUT /api/admin/vendors/:id/reject
 * @desc    Reject vendor registration
 * @access  Admin
 */
export const rejectVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError(400, 'Rejection reason is required');
  }

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  if (vendor.approvalStatus !== 'pending') {
    throw new ApiError(400, 'Vendor is not pending approval');
  }

  vendor.approvalStatus = 'rejected';
  vendor.isActive = false;
  vendor.approvalNote = reason;
  vendor.rejectedAt = new Date();
  vendor.rejectedBy = req.user._id;

  await vendor.save();

  // TODO: Send rejection email to vendor

  return apiResponse(res, 200, 'Vendor rejected', { vendor });
});

/**
 * @route   PUT /api/admin/vendors/:id/status
 * @desc    Suspend or unsuspend an approved vendor
 * @access  Admin
 */
export const updateVendorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive (boolean) is required');
  }

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    throw new ApiError(404, 'Vendor not found');
  }

  vendor.isActive = isActive;
  await vendor.save();

  return apiResponse(res, 200, `Vendor ${isActive ? 'unsuspended' : 'suspended'} successfully`, { vendor });
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-refreshToken -medicalInfo -emergencyContacts');

  const total = await User.countDocuments(query);

  return apiResponse(res, 200, 'Users list', {
    users,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user active status
 * @access  Admin
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.isActive = isActive;
  await user.save();

  return apiResponse(res, 200, `User ${isActive ? 'activated' : 'deactivated'}`, { user });
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filters
 * @access  Admin
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  
  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('patientId', 'name email phone')
    .populate('vendorId', 'storeName email address');

  const total = await Order.countDocuments(query);

  return apiResponse(res, 200, 'Orders list', {
    orders,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   GET /api/admin/medicines
 * @desc    Get medicines from catalog with search + form + class filters + vendor count
 * @access  Admin
 */
export const getAllMedicines = asyncHandler(async (req, res) => {
  const { search, form, therapeutic_class, page = 1, limit = 20 } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { brand_name: { $regex: search, $options: 'i' } },
      { primary_ingredient: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
      { composition_normalized: { $regex: search, $options: 'i' } },
    ];
  }

  if (form && form !== 'all') query.dosage_form = form.toLowerCase();
  if (therapeutic_class && therapeutic_class !== 'all') query.therapeutic_class = therapeutic_class.toLowerCase();

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [medicines, total] = await Promise.all([
    MedicineCatalog.find(query)
      .sort({ brand_name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('product_id brand_name manufacturer price dosage_form packaging primary_ingredient primary_strength composition_normalized therapeutic_class name_normalized num_active_ingredients pack_size pack_unit active_ingredients'),
    MedicineCatalog.countDocuments(query),
  ]);

  // Attach vendor_count to each medicine via VendorInventory
  const productIds = medicines.map(m => m.product_id);
  const vendorCounts = await VendorInventory.aggregate([
    { $match: { catalogProductId: { $in: productIds } } },
    { $group: { _id: '$catalogProductId', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  vendorCounts.forEach(v => { countMap[v._id] = v.count; });

  const enriched = medicines.map(m => ({
    ...m.toObject(),
    vendor_count: countMap[m.product_id] ?? 0,
  }));

  return apiResponse(res, 200, 'Medicines catalog', {
    medicines: enriched,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalMedicines: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   GET /api/admin/medicines/:productId
 * @desc    Get single medicine with full detail + vendor count
 * @access  Admin
 */
export const getMedicineById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const medicine = await MedicineCatalog.findOne({ product_id: parseInt(productId) });
  if (!medicine) throw new ApiError(404, 'Medicine not found');

  const vendorCount = await VendorInventory.countDocuments({ catalogProductId: parseInt(productId) });

  return apiResponse(res, 200, 'Medicine detail', {
    medicine: { ...medicine.toObject(), vendor_count: vendorCount },
  });
});

/**
 * @route   PUT /api/admin/medicines/:productId
 * @desc    Update editable catalog fields for a medicine
 * @access  Admin
 */
export const updateMedicine = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const allowedFields = ['brand_name', 'manufacturer', 'price', 'dosage_form', 'packaging',
                         'therapeutic_class', 'primary_ingredient', 'primary_strength'];
  const updates = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) throw new ApiError(400, 'No updatable fields provided');

  const medicine = await MedicineCatalog.findOneAndUpdate(
    { product_id: parseInt(productId) },
    { $set: updates },
    { new: true }
  );
  if (!medicine) throw new ApiError(404, 'Medicine not found');

  return apiResponse(res, 200, 'Medicine updated', { medicine });
});

/**
 * @route   DELETE /api/admin/medicines/:productId
 * @desc    Delete a medicine from the catalog
 * @access  Admin
 */
export const deleteMedicine = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const medicine = await MedicineCatalog.findOneAndDelete({ product_id: parseInt(productId) });
  if (!medicine) throw new ApiError(404, 'Medicine not found');

  // Also remove from all vendor inventories
  await VendorInventory.deleteMany({ catalogProductId: parseInt(productId) });

  return apiResponse(res, 200, 'Medicine deleted successfully', { product_id: parseInt(productId) });
});

/**
 * @route   GET /api/admin/inventory
 * @desc    Cross-reference vendor inventory with catalog.
 *          Filters: state (vendor address), vendorName, available (true/false), search
 * @access  Admin
 */
export const getAllInventoryMedicines = asyncHandler(async (req, res) => {
  const { search, state, vendorName, available, page = 1, limit = 20 } = req.query;

  // Build vendor sub-query
  const vendorQuery = {};
  if (state) vendorQuery['address.state'] = { $regex: state, $options: 'i' };
  if (vendorName) vendorQuery['storeName'] = { $regex: vendorName, $options: 'i' };

  let vendorIds = null;
  if (state || vendorName) {
    const matchingVendors = await Vendor.find(vendorQuery).select('_id');
    vendorIds = matchingVendors.map(v => v._id);
    if (vendorIds.length === 0) {
      return apiResponse(res, 200, 'No matching vendors', {
        medicines: [],
        pagination: { currentPage: 1, totalPages: 0, totalMedicines: 0, limit: parseInt(limit) },
      });
    }
  }

  // Build inventory query
  const invQuery = {};
  if (vendorIds) invQuery.vendorId = { $in: vendorIds };
  if (available === 'true') invQuery.isAvailable = true;
  if (available === 'false') invQuery.isAvailable = false;
  if (search) {
    invQuery.$or = [
      { medicineName: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [items, total] = await Promise.all([
    VendorInventory.find(invQuery)
      .populate('vendorId', 'storeName ownerName address.city address.state phone email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('medicineName genericName composition form mrp vendorPrice stock isAvailable expiryDate vendorId'),
    VendorInventory.countDocuments(invQuery),
  ]);

  return apiResponse(res, 200, 'Inventory medicines', {
    medicines: items,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalMedicines: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   GET /api/admin/emergencies
 * @desc    Get all emergency logs with filters
 * @access  Admin
 */
export const getAllEmergencies = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status && status !== 'all') query.status = status;

  const skip = (page - 1) * limit;

  const emergencies = await Emergency.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('respondedVendorId', 'storeName');

  const total = await Emergency.countDocuments(query);

  return apiResponse(res, 200, 'Emergency logs', {
    emergencies,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalEmergencies: total,
      limit: parseInt(limit),
    },
  });
});

/**
 * @route   GET /api/admin/subscriptions
 * @desc    Get all subscriptions with filters
 * @access  Admin
 */
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, plan, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status && status !== 'all') query.status = status;
  if (plan && plan !== 'all') query.plan = plan;

  const skip = (page - 1) * limit;

  const subscriptions = await Subscription.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('userId', 'name email phone');

  const total = await Subscription.countDocuments(query);

  // Revenue summary (active pro subscriptions)
  const totalRevenue = await Subscription.aggregate([
    { $match: { status: 'active', plan: 'pro' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return apiResponse(res, 200, 'Subscriptions list', {
    subscriptions,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalSubscriptions: total,
      limit: parseInt(limit),
    },
    summary: {
      totalRevenue: totalRevenue[0]?.total ?? 0,
    },
  });
});

/**
 * @route   GET /api/admin/savings
 * @desc    Get platform savings analytics
 * @access  Admin
 */
export const getSavingsStats = asyncHandler(async (req, res) => {
  // Total savings from all delivered orders
  const savingsAgg = await Order.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: null,
        totalSavedAmount: { $sum: '$savedAmount' },
        totalOrders: { $sum: 1 },
        userIds: { $addToSet: '$patientId' },
      },
    },
  ]);

  const totalSaved = savingsAgg[0]?.totalSavedAmount ?? 0;
  const totalDeliveredOrders = savingsAgg[0]?.totalOrders ?? 0;
  const usersBenefited = savingsAgg[0]?.userIds?.length ?? 0;
  const avgSavingPerUser = usersBenefited > 0 ? Math.round(totalSaved / usersBenefited) : 0;

  // This month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyAgg = await Order.aggregate([
    { $match: { status: 'delivered', createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$savedAmount' } } },
  ]);
  const thisMonthSaved = monthlyAgg[0]?.total ?? 0;

  // Monthly trend (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyTrend = await Order.aggregate([
    { $match: { status: 'delivered', createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        saved: { $sum: '$savedAmount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Recent high-savings orders
  const recentSavings = await Order.find({ status: 'delivered', savedAmount: { $gt: 0 } })
    .sort({ savedAmount: -1, createdAt: -1 })
    .limit(5)
    .populate('patientId', 'name')
    .select('patientId items savedAmount totalAmount createdAt');

  return apiResponse(res, 200, 'Savings stats', {
    overview: {
      totalSaved,
      usersBenefited,
      avgSavingPerUser,
      thisMonthSaved,
      totalDeliveredOrders,
    },
    monthlyTrend,
    recentSavings,
  });
});

export default {
  getDashboard,
  getPendingVendors,
  getAllVendors,
  approveVendor,
  rejectVendor,
  updateVendorStatus,
  getAllUsers,
  updateUserStatus,
  getAllOrders,
  getAllMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  getAllInventoryMedicines,
  getAllEmergencies,
  getAllSubscriptions,
  getSavingsStats,
};
