"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Search,
  ShoppingBag,
  Calendar,
  MapPin,
  CreditCard,
  Star,
  AlertCircle,
  ChevronDown,
  Loader2,
  Store,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";

type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rejected";

type OrderItem = {
  inventoryId?: string;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  mrp?: number;
  discount?: number;
};

type Order = {
  _id: string;
  vendorId?: { _id: string; storeName?: string; name?: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: "stripe_card" | "stripe_upi" | "cod";
  paymentStatus: string;
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  isEmergencyOrder: boolean;
  createdAt: string;
  isRated: boolean;
  rating?: number;
  review?: string;
};

const STATUS_TABS: { key: string; label: string; icon: React.ReactNode }[] = [
  {
    key: "all",
    label: "All Orders",
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
  },
  { key: "placed", label: "Placed", icon: <Clock className="w-3.5 h-3.5" /> },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
];

function getStatusStyle(status: OrderStatus) {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    case "out_for_delivery":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "preparing":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "confirmed":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "placed":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "delivered":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "out_for_delivery":
      return <Truck className="w-3.5 h-3.5" />;
    case "preparing":
      return <Package className="w-3.5 h-3.5" />;
    case "confirmed":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "placed":
      return <Clock className="w-3.5 h-3.5" />;
    case "cancelled":
    case "rejected":
      return <XCircle className="w-3.5 h-3.5" />;
    default:
      return <Package className="w-3.5 h-3.5" />;
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPayment(method: string) {
  switch (method) {
    case "stripe_card":
      return "Card (Stripe)";
    case "stripe_upi":
      return "UPI (Stripe)";
    case "cod":
      return "Cash on Delivery";
    default:
      return method;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ───────── Price helpers ───────── */
/**
 * Returns estimated unit price for an item.
 * Uses stored unitPrice if available; otherwise distributes
 * order.subtotal evenly across total quantities (exact for
 * single-item orders, approximate for multi-item legacy orders).
 */
function getItemUnitPrice(item: OrderItem, order: Order): number | null {
  if (item.unitPrice != null) return item.unitPrice;
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  if (order.subtotal > 0 && totalQty > 0) {
    return order.subtotal / totalQty;
  }
  return null;
}

function getItemTotalPrice(item: OrderItem, order: Order): number | null {
  if (item.totalPrice != null) return item.totalPrice;
  const unitPrice = getItemUnitPrice(item, order);
  if (unitPrice != null) return unitPrice * item.quantity;
  return null;
}

/* ───────── StarRating ───────── */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hover || value)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Cancel
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Rate modal
  const [rateOrder, setRateOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [rateError, setRateError] = useState("");

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(
    async (pageNum: number, replace: boolean) => {
      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "10",
        });
        if (activeTab !== "all") params.set("status", activeTab);

        const res = await apiClient.get<{
          orders: Order[];
          pagination: { total: number; page: number; pages: number };
        }>(`${API_CONFIG.API.ORDER.HISTORY}?${params}`);

        const incoming = res.data?.orders ?? [];
        setOrders((prev) => (replace ? incoming : [...prev, ...incoming]));
        setTotalOrders(res.data?.pagination?.total ?? 0);
        setHasMore(pageNum < (res.data?.pagination?.pages ?? 1));
        setPage(pageNum);
      } catch {
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    setError("");
    fetchOrders(1, true);
  }, [fetchOrders]);

  async function handleCancel(orderId: string) {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    try {
      await apiClient.post(API_CONFIG.API.ORDER.CANCEL(orderId), {});
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "cancelled" } : o,
        ),
      );
    } catch {
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmitRating() {
    if (!rateOrder || rating === 0) {
      setRateError("Please select a star rating.");
      return;
    }
    setSubmittingRating(true);
    setRateError("");
    try {
      await apiClient.post(API_CONFIG.API.ORDER.RATE(rateOrder._id), {
        rating,
        review: review.trim() || undefined,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o._id === rateOrder._id ? { ...o, isRated: true, rating, review } : o,
        ),
      );
      setRateOrder(null);
      setRating(0);
      setReview("");
    } catch {
      setRateError("Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  }

  // Local search filter (client-side on loaded orders)
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      order._id.toLowerCase().includes(q) ||
      (order.vendorId?.storeName ?? order.vendorId?.name ?? "")
        .toLowerCase()
        .includes(q) ||
      order.items.some((i) => i.medicineName.toLowerCase().includes(q))
    );
  });

  // Stats derived from all loaded orders (for current tab)
  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSavings = orders.reduce((s, o) => s + (o.discount || 0), 0);

  const isActiveStatus = (s: OrderStatus) =>
    ["placed", "confirmed", "preparing", "out_for_delivery"].includes(s);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Order History
          </h1>
          <p className="text-sm text-gray-600">
            View your past orders and track current deliveries
          </p>
        </div>
        <div className="relative flex items-center w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="search"
            placeholder="Search by order ID, pharmacy, or medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? "—" : totalOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Delivered</p>
              <p className="text-xl font-bold text-gray-900">
                {loading
                  ? "—"
                  : orders.filter((o) => o.status === "delivered").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Spent</p>
              <p className="text-xl font-bold text-gray-900">
                {loading ? "—" : `₹${totalSpent.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Savings</p>
              <p className="text-xl font-bold text-green-600">
                {loading ? "—" : `₹${totalSavings.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="rounded-md cursor-pointer flex items-center gap-1"
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchOrders(1, true)}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Orders List */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">
          {activeTab === "all" ? "All Orders" : formatStatus(activeTab)}
          {!loading && ` (${filteredOrders.length})`}
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              No orders found
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {searchQuery
                ? "Try a different search term"
                : activeTab !== "all"
                  ? `No ${formatStatus(activeTab).toLowerCase()} orders`
                  : "Start shopping to see your orders here"}
            </p>
            <Link href="/user/nearby-stores">
              <Button size="sm">Find Nearby Pharmacies</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-white border border-teal-300 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {order.vendorId?.storeName ??
                              order.vendorId?.name ??
                              "Pharmacy"}
                          </h3>
                          {order.isEmergencyOrder && (
                            <span className="px-1.5 py-0 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">
                              Emergency
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{timeAgo(order.createdAt)}</span>
                          <span className="text-gray-300">•</span>
                          <span>
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-teal-600">
                        ₹{order.totalAmount.toLocaleString()}
                      </p>
                      <Badge
                        className={`flex items-center gap-1 px-2 py-0 rounded-full text-xs font-semibold border ${getStatusStyle(
                          order.status,
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        {formatStatus(order.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 space-y-2.5">
                  {/* Items preview */}
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">
                      Medicines:
                    </p>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {item.medicineName}
                            </p>
                            {item.genericName && (
                              <p className="text-xs text-gray-500">
                                {item.genericName}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-gray-900">
                            {(() => {
                              const up = getItemUnitPrice(item, order);
                              return up != null ? `₹${up.toFixed(0)}` : "—";
                            })()}
                          </p>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <button
                          onClick={() => setDetailOrder(order)}
                          className="w-full text-xs text-teal-600 hover:text-teal-700 font-medium py-1 border border-dashed border-teal-300 rounded hover:bg-teal-50 transition-colors"
                        >
                          +{order.items.length - 2} more medicine
                          {order.items.length - 2 > 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delivery address */}
                  <div className="flex items-start gap-1.5 p-2 bg-blue-50 rounded border border-blue-100">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700 leading-snug">
                      {order.deliveryAddress.addressLine1}
                      {order.deliveryAddress.addressLine2
                        ? `, ${order.deliveryAddress.addressLine2}`
                        : ""}
                      , {order.deliveryAddress.city},{" "}
                      {order.deliveryAddress.state}{" "}
                      {order.deliveryAddress.pincode}
                    </p>
                  </div>

                  {/* Payment + pricing */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      {formatPayment(order.paymentMethod)}
                    </span>
                    {order.discount > 0 && (
                      <span className="text-green-600 font-medium">
                        Saved ₹{order.discount}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {/* Track — for active orders */}
                    {isActiveStatus(order.status) && (
                      <Link
                        href={`/user/order/track/${order._id}`}
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full h-7 text-xs">
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          Track Order
                        </Button>
                      </Link>
                    )}

                    {/* Cancel — for placed / confirmed */}
                    {(order.status === "placed" ||
                      order.status === "confirmed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        disabled={cancellingId === order._id}
                        onClick={() => handleCancel(order._id)}
                      >
                        {cancellingId === order._id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                        )}
                        Cancel
                      </Button>
                    )}

                    {/* Rate — delivered + not yet rated */}
                    {order.status === "delivered" &&
                      !order.isRated &&
                      !order.rating && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => {
                            setRateOrder(order);
                            setRating(0);
                            setReview("");
                            setRateError("");
                          }}
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          Rate Order
                        </Button>
                      )}

                    {/* Rated badge */}
                    {order.status === "delivered" &&
                      (order.isRated || !!order.rating) && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          Rated {order.rating}/5
                        </div>
                      )}

                    {/* Details button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setDetailOrder(order)}
                    >
                      <Package className="w-3.5 h-3.5 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => fetchOrders(page + 1, false)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4 mr-2" />
              )}
              Load More Orders
            </Button>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      <Dialog
        open={detailOrder !== null}
        onOpenChange={() => setDetailOrder(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {detailOrder?.vendorId?.storeName ??
                detailOrder?.vendorId?.name ??
                "Pharmacy"}{" "}
              • {detailOrder ? formatDate(detailOrder.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 mt-2">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${getStatusStyle(
                    detailOrder.status,
                  )}`}
                >
                  {getStatusIcon(detailOrder.status)}
                  {formatStatus(detailOrder.status)}
                </Badge>
                {detailOrder.isEmergencyOrder && (
                  <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">
                    Emergency Order
                  </span>
                )}
              </div>

              {/* All items */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Medicines
                </p>
                <div className="space-y-1.5">
                  {detailOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.medicineName}
                        </p>
                        {item.genericName && (
                          <p className="text-xs text-gray-500">
                            {item.genericName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {(() => {
                            const tp = getItemTotalPrice(item, detailOrder!);
                            return tp != null ? `₹${tp.toLocaleString()}` : "—";
                          })()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(() => {
                            const up = getItemUnitPrice(item, detailOrder!);
                            return up != null ? `₹${up.toFixed(0)} each` : "";
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{detailOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>₹{detailOrder.deliveryCharge}</span>
                </div>
                {detailOrder.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{detailOrder.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                  <span>Total</span>
                  <span className="text-teal-600 text-base">
                    ₹{detailOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Delivery + Payment */}
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      Delivery Address
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {detailOrder.deliveryAddress.addressLine1}
                      {detailOrder.deliveryAddress.addressLine2
                        ? `, ${detailOrder.deliveryAddress.addressLine2}`
                        : ""}
                      <br />
                      {detailOrder.deliveryAddress.city},{" "}
                      {detailOrder.deliveryAddress.state}{" "}
                      {detailOrder.deliveryAddress.pincode}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      Payment
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatPayment(detailOrder.paymentMethod)} •{" "}
                      <span
                        className={
                          detailOrder.paymentStatus === "paid"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {detailOrder.paymentStatus.charAt(0).toUpperCase() +
                          detailOrder.paymentStatus.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions inside modal */}
              <div className="flex gap-2 pt-1">
                {isActiveStatus(detailOrder.status) && (
                  <Link
                    href={`/user/order/track/${detailOrder._id}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full">
                      <Truck className="w-4 h-4 mr-1.5" />
                      Track Order
                    </Button>
                  </Link>
                )}
                {(detailOrder.status === "placed" ||
                  detailOrder.status === "confirmed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={cancellingId === detailOrder._id}
                    onClick={async () => {
                      await handleCancel(detailOrder._id);
                      setDetailOrder(null);
                    }}
                  >
                    {cancellingId === detailOrder._id ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-1.5" />
                    )}
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Rate Order Modal ── */}
      <Dialog
        open={rateOrder !== null}
        onOpenChange={() => {
          if (!submittingRating) setRateOrder(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
            <DialogDescription>
              How was your experience with{" "}
              {rateOrder?.vendorId?.storeName ??
                rateOrder?.vendorId?.name ??
                "this pharmacy"}
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex flex-col items-center gap-2">
              <StarRating value={rating} onChange={setRating} />
              <p className="text-sm text-gray-500">
                {rating === 0
                  ? "Tap a star to rate"
                  : rating === 1
                    ? "Poor"
                    : rating === 2
                      ? "Fair"
                      : rating === 3
                        ? "Good"
                        : rating === 4
                          ? "Very Good"
                          : "Excellent!"}
              </p>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              rows={3}
              placeholder="Write a review (optional)..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              disabled={submittingRating}
            />
            {rateError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {rateError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRateOrder(null)}
                disabled={submittingRating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitRating}
                disabled={submittingRating}
              >
                {submittingRating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-1.5" />
                )}
                Submit Rating
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
