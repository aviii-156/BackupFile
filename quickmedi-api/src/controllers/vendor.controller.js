/**
 * vendor.controller.js
 * Vendor self-service: profile management + own inventory management + order management
 */
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Vendor from '../models/Vendor.js';
import VendorInventory from '../models/VendorInventory.js';
import Order from '../models/Order.js';

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/vendor/profile
 * @desc    Get own profile
 * @access  Vendor
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.user._id)
    .select('-password -refreshToken -lastLogoutAt -fcmTokens');

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  return apiResponse(res, 200, 'Vendor profile', { vendor });
});

/**
 * @route   PUT /api/vendor/profile
 * @desc    Update own editable fields
 * @access  Vendor
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  // Only these fields may be self-updated (admin-controlled fields excluded)
  const ALLOWED = [
    'storeName', 'ownerName', 'phone', 'address',
    'operatingHours', 'deliveryAvailable', 'deliveryRadius',
    'minimumOrderAmount', 'deliveryCharge', 'acceptsEmergency',
    'isActive', 'language',
  ];

  const updates = {};
  ALLOWED.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Allow lat/lng update → write into GeoJSON location field
  if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
    updates.location = {
      type: 'Point',
      coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
    };
  }

  const vendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -refreshToken -lastLogoutAt -fcmTokens');

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  return apiResponse(res, 200, 'Profile updated successfully', { vendor });
});

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/vendor/inventory
 * @desc    Get own inventory with search / filter / pagination
 * @access  Vendor
 */
export const getMyInventory = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { search, category, status, page = 1, limit = 100 } = req.query;

  const query = { vendorId };

  if (status === 'available') {
    query.isAvailable = true;
    query.stock = { $gt: 0 };
  } else if (status === 'out_of_stock') {
    query.stock = 0;
  } else if (status === 'low_stock') {
    query.isLowStock = true;
    query.stock = { $gt: 0 };
  }

  if (category && category !== 'all') query.category = { $regex: category, $options: 'i' };
  if (search) {
    query.$or = [
      { medicineName: { $regex: search, $options: 'i' } },
      { genericName: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [inventory, total] = await Promise.all([
    VendorInventory.find(query).sort({ medicineName: 1 }).skip(skip).limit(parseInt(limit)),
    VendorInventory.countDocuments(query),
  ]);

  return apiResponse(res, 200, 'Inventory fetched', {
    inventory,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

/**
 * @route   PUT /api/vendor/inventory/:id
 * @desc    Update an inventory item (stock, price, expiry, etc.)
 * @access  Vendor
 */
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;

  const item = await VendorInventory.findOne({ _id: id, vendorId });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  const ALLOWED_UPDATES = [
    'stock', 'vendorPrice', 'mrp', 'discount', 'unit',
    'batchNumber', 'expiryDate', 'manufacturingDate', 'lowStockThreshold',
  ];

  ALLOWED_UPDATES.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });

  // Recalculate derived flags
  item.isAvailable = item.stock > 0;
  item.isLowStock = item.stock > 0 && item.stock <= item.lowStockThreshold;
  if (item.expiryDate) {
    item.isExpired = new Date(item.expiryDate) < new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    item.isExpiringSoon = !item.isExpired && new Date(item.expiryDate) <= thirtyDays;
  }

  await item.save();

  return apiResponse(res, 200, 'Inventory item updated', { item });
});

/**
 * @route   DELETE /api/vendor/inventory/:id
 * @desc    Remove an item from own inventory
 * @access  Vendor
 */
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;

  const item = await VendorInventory.findOneAndDelete({ _id: id, vendorId });
  if (!item) throw new ApiError(404, 'Inventory item not found');

  return apiResponse(res, 200, 'Inventory item removed', { id });
});

/**
 * @route   GET /api/vendor/inventory/stats
 * @desc    Inventory summary stats
 * @access  Vendor
 */
export const getInventoryStats = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const [total, lowStock, outOfStock, expiringSoon] = await Promise.all([
    VendorInventory.countDocuments({ vendorId }),
    VendorInventory.countDocuments({ vendorId, isLowStock: true, stock: { $gt: 0 } }),
    VendorInventory.countDocuments({ vendorId, stock: 0 }),
    VendorInventory.countDocuments({ vendorId, isExpiringSoon: true }),
  ]);

  // Total inventory value
  const valueAgg = await VendorInventory.aggregate([
    { $match: { vendorId } },
    { $group: { _id: null, totalValue: { $sum: { $multiply: ['$vendorPrice', '$stock'] } } } },
  ]);
  const totalValue = valueAgg[0]?.totalValue || 0;

  return apiResponse(res, 200, 'Inventory stats', {
    stats: { total, lowStock, outOfStock, expiringSoon, totalValue },
  });
});

// ─── Orders ───────────────────────────────────────────────────────────────────

const STATUS_TRANSITIONS = {
  placed: ['confirmed', 'rejected'],
  confirmed: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

/**
 * @route   GET /api/vendor/orders
 * @desc    List orders for this vendor
 * @access  Vendor
 */
export const getVendorOrders = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { vendorId };
  if (status && status !== 'all') query.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('patientId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(query),
  ]);

  return apiResponse(res, 200, 'Orders fetched', {
    orders,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
});

/**
 * @route   GET /api/vendor/orders/stats
 * @desc    Order counts by status for dashboard
 * @access  Vendor
 */
export const getVendorOrderStats = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const [placed, confirmed, preparing, out_for_delivery, delivered, cancelled, rejected] =
    await Promise.all([
      Order.countDocuments({ vendorId, status: 'placed' }),
      Order.countDocuments({ vendorId, status: 'confirmed' }),
      Order.countDocuments({ vendorId, status: 'preparing' }),
      Order.countDocuments({ vendorId, status: 'out_for_delivery' }),
      Order.countDocuments({ vendorId, status: 'delivered' }),
      Order.countDocuments({ vendorId, status: 'cancelled' }),
      Order.countDocuments({ vendorId, status: 'rejected' }),
    ]);

  return apiResponse(res, 200, 'Order stats', {
    stats: { placed, confirmed, preparing, out_for_delivery, delivered, cancelled, rejected },
  });
});

/**
 * @route   PUT /api/vendor/orders/:id/status
 * @desc    Advance (or reject) an order's status
 * @access  Vendor
 */
export const updateVendorOrderStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;
  const { status, note } = req.body;

  const order = await Order.findOne({ _id: id, vendorId });
  if (!order) throw new ApiError(404, 'Order not found');

  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Cannot move order from "${order.status}" to "${status}"`);
  }

  order.status = status;
  order.statusHistory.push({ status, note: note || '' });

  if (status === 'confirmed') order.vendorAcceptedAt = new Date();
  if (status === 'rejected') order.vendorRejectedAt = new Date();
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    // Decrement inventory stock for each delivered item
    for (const item of order.items) {
      await VendorInventory.findByIdAndUpdate(
        item.inventoryId,
        { $inc: { stock: -item.quantity } }
      );
    }
  }

  await order.save();
  await order.populate('patientId', 'name phone email');

  return apiResponse(res, 200, 'Order status updated', { order });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/vendor/dashboard
 * @desc    All-in-one dashboard data: profile, order stats, inventory stats, recent orders, low stock
 * @access  Vendor
 */
export const getVendorDashboard = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    vendor,
    orderStats,
    invStats,
    recentOrders,
    lowStockItems,
    todayRevenueAgg,
    monthRevenueAgg,
  ] = await Promise.all([
    Vendor.findById(vendorId).select('storeName ownerName rating isOpenNow isActive deliveryAvailable'),
    // order counts by status
    Order.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // inventory summary
    Promise.all([
      VendorInventory.countDocuments({ vendorId }),
      VendorInventory.countDocuments({ vendorId, isLowStock: true, stock: { $gt: 0 } }),
      VendorInventory.countDocuments({ vendorId, stock: 0 }),
    ]),
    // last 5 orders
    Order.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patientId', 'name')
      .select('status items totalAmount createdAt patientId'),
    // top 5 low-stock items
    VendorInventory.find({ vendorId, isLowStock: true, stock: { $gt: 0 } })
      .sort({ stock: 1 })
      .limit(5)
      .select('medicineName stock lowStockThreshold'),
    // today delivered revenue
    Order.aggregate([
      { $match: { vendorId, status: 'delivered', createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    // this month delivered revenue
    Order.aggregate([
      { $match: { vendorId, status: 'delivered', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  // normalise order stats array → object
  const statusMap = { placed: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, rejected: 0 };
  for (const s of orderStats) statusMap[s._id] = s.count;
  const totalOrders = Object.values(statusMap).reduce((a, b) => a + b, 0);

  const [total, lowStock, outOfStock] = invStats;

  return apiResponse(res, 200, 'Dashboard data', {
    vendor: {
      storeName: vendor?.storeName || '',
      ownerName: vendor?.ownerName || '',
      rating: vendor?.rating || 0,
      isOpenNow: vendor?.isOpenNow || false,
      isActive: vendor?.isActive || false,
      deliveryAvailable: vendor?.deliveryAvailable || false,
    },
    orderStats: { ...statusMap, total: totalOrders },
    inventoryStats: { total, lowStock, outOfStock },
    todayRevenue: todayRevenueAgg[0]?.total || 0,
    monthRevenue: monthRevenueAgg[0]?.total || 0,
    recentOrders: recentOrders.map(o => ({
      id: o._id.toString(),
      customer: o.patientId?.name || 'Customer',
      items: o.items?.length ?? 0,
      amount: o.totalAmount ?? 0,
      status: o.status,
      createdAt: o.createdAt,
    })),
    lowStockItems: lowStockItems.map(i => ({
      id: i._id.toString(),
      name: i.medicineName,
      current: i.stock,
      minimum: i.lowStockThreshold,
    })),
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/vendor/analytics
 * @desc    Revenue, order, and product analytics for the vendor
 * @access  Vendor
 */
export const getVendorAnalytics = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { period = 'month' } = req.query;

  const now = new Date();
  let startDate;
  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    // month — start of current calendar month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const allPeriodOrders = await Order.find({
    vendorId,
    createdAt: { $gte: startDate },
  });

  const deliveredOrders = allPeriodOrders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalProductsSold = allPeriodOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + (i.quantity || 0), 0),
    0
  );
  const uniqueCustomers = new Set(allPeriodOrders.map(o => o.patientId.toString())).size;
  const avgOrderValue = deliveredOrders.length > 0
    ? Math.round(totalRevenue / deliveredOrders.length)
    : 0;

  // Top products by units sold (from delivered orders)
  const productMap = {};
  for (const order of deliveredOrders) {
    for (const item of order.items) {
      const key = item.medicineName || 'Unknown';
      if (!productMap[key]) productMap[key] = { name: key, unitsSold: 0, revenue: 0 };
      productMap[key].unitsSold += item.quantity || 0;
      productMap[key].revenue += item.totalPrice || (item.unitPrice || 0) * (item.quantity || 0);
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 5)
    .map(p => ({ ...p, revenue: `₹${p.revenue.toLocaleString('en-IN')}` }));

  // Revenue chart bucketed by period
  const revenueChart = buildRevenueChart(period, allPeriodOrders, startDate, now);

  // Previous period totals for trend comparison
  const prevStart = new Date(startDate);
  const prevEnd = new Date(startDate);
  if (period === 'week') prevStart.setDate(prevStart.getDate() - 7);
  else if (period === 'year') prevStart.setFullYear(prevStart.getFullYear() - 1);
  else prevStart.setMonth(prevStart.getMonth() - 1);

  const prevOrders = await Order.find({
    vendorId,
    createdAt: { $gte: prevStart, $lt: prevEnd },
    status: 'delivered',
  }).select('totalAmount');
  const prevRevenue = prevOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const prevCount = await Order.countDocuments({
    vendorId,
    createdAt: { $gte: prevStart, $lt: prevEnd },
  });

  const revenueTrend = prevRevenue > 0
    ? `${totalRevenue >= prevRevenue ? '+' : ''}${Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)}%`
    : null;
  const ordersTrend = prevCount > 0
    ? `${allPeriodOrders.length >= prevCount ? '+' : ''}${Math.round(((allPeriodOrders.length - prevCount) / prevCount) * 100)}%`
    : null;

  return apiResponse(res, 200, 'Analytics data', {
    totalRevenue,
    totalOrders: allPeriodOrders.length,
    totalProductsSold,
    uniqueCustomers,
    avgOrderValue,
    revenueTrend,
    ordersTrend,
    topProducts,
    revenueChart,
  });
});

function buildRevenueChart(period, orders, startDate, endDate) {
  if (period === 'week') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return { label: days[d.getDay()], revenue: 0, orders: 0, date: d.toDateString() };
    });
    for (const order of orders) {
      const d = new Date(order.createdAt);
      const idx = buckets.findIndex(b => b.date === d.toDateString());
      if (idx >= 0) {
        buckets[idx].orders += 1;
        if (order.status === 'delivered') buckets[idx].revenue += order.totalAmount || 0;
      }
    }
    return buckets.map(({ label, revenue, orders }) => ({ label, revenue, orders }));
  }

  if (period === 'year') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = months.map((label, i) => ({ label, revenue: 0, orders: 0, month: i }));
    for (const order of orders) {
      const m = new Date(order.createdAt).getMonth();
      buckets[m].orders += 1;
      if (order.status === 'delivered') buckets[m].revenue += order.totalAmount || 0;
    }
    return buckets.map(({ label, revenue, orders }) => ({ label, revenue, orders }));
  }

  // month — daily buckets
  const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
  const buckets = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    revenue: 0,
    orders: 0,
    day: i + 1,
  }));
  for (const order of orders) {
    const day = new Date(order.createdAt).getDate();
    if (buckets[day - 1]) {
      buckets[day - 1].orders += 1;
      if (order.status === 'delivered') buckets[day - 1].revenue += order.totalAmount || 0;
    }
  }
  return buckets.map(({ label, revenue, orders }) => ({ label, revenue, orders }));
}
