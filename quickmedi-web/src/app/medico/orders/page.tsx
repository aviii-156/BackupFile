"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/shared/PageComponents";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  ShoppingCart,
  Search,
  Phone,
  MapPin,
  Package2,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  FileText,
  X,
  Download,
  RefreshCw,
  IndianRupee,
  User,
  AlertTriangle,
  Store,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rejected";

interface OrderItem {
  inventoryId?: string;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  mrp?: number;
  discount?: number;
}

interface BackendOrder {
  _id: string;
  patientId?: {
    _id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    label?: string;
  };
  isEmergencyOrder: boolean;
  createdAt: string;
  estimatedDeliveryTime?: number;
}

interface OrderStats {
  placed: number;
  confirmed: number;
  preparing: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
  rejected: number;
}

type TabFilter = "all" | OrderStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  preparing: "bg-purple-100 text-purple-700 border-purple-200",
  out_for_delivery: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
};

const NEXT_ACTIONS: Partial<
  Record<
    OrderStatus,
    {
      label: string;
      next: OrderStatus;
      icon: React.ElementType;
      variant?: "default" | "outline" | "destructive";
    }[]
  >
> = {
  placed: [
    { label: "Accept", next: "confirmed", icon: CheckCircle2 },
    {
      label: "Reject",
      next: "rejected",
      icon: XCircle,
      variant: "destructive",
    },
  ],
  confirmed: [
    { label: "Out for Delivery", next: "out_for_delivery", icon: Truck },
  ],
  out_for_delivery: [
    { label: "Mark Delivered", next: "delivered", icon: CheckCircle2 },
  ],
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}

function shortId(id: string) {
  return "#" + id.slice(-6).toUpperCase();
}

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "placed", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "out_for_delivery", label: "Out for Delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

// ─── Price helpers ───────────────────────────────────────────────────────────
function getItemUnitPrice(item: OrderItem, order: BackendOrder): number | null {
  if (item.unitPrice != null) return item.unitPrice;
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  if (order.subtotal > 0 && totalQty > 0) return order.subtotal / totalQty;
  return null;
}

function getItemTotalPrice(
  item: OrderItem,
  order: BackendOrder,
): number | null {
  if (item.totalPrice != null) return item.totalPrice;
  const up = getItemUnitPrice(item, order);
  return up != null ? up * item.quantity : null;
}

// ─── Invoice Modal ───────────────────────────────────────────────────────────
function InvoiceModal({
  order,
  onClose,
}: {
  order: BackendOrder;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Invoice ${shortId(order._id)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0d9488; }
.brand { font-size: 22px; font-weight: 700; color: #0d9488; }
.brand span { font-size: 12px; font-weight: 400; color: #555; display: block; }
.invoice-title { text-align: right; }
.invoice-title h2 { font-size: 18px; color: #333; }
.invoice-title p { font-size: 12px; color: #666; }
.section { margin-bottom: 20px; }
.section h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #888; margin-bottom: 8px; letter-spacing: 0.05em; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.info p { font-size: 13px; color: #333; line-height: 1.6; }
table { width: 100%; border-collapse: collapse; }
th { background: #f0fdfa; font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; padding: 8px 12px; text-align: left; }
td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
.totals td { border: none; padding: 4px 12px; font-size: 13px; }
.totals .grand { font-size: 15px; font-weight: 700; color: #0d9488; border-top: 2px solid #0d9488; padding-top: 8px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46; }
.footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #888; text-align: center; }
</style>
</head>
<body>${content}</body>
</html>
`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  const customer = order.patientId;
  const addr = order.deliveryAddress;
  const gst = order.subtotal * 0.05;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Invoice {shortId(order._id)}</h2>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrint}>
              <Download className="w-4 h-4 mr-1" /> Print / Download
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="p-6 space-y-5">
          {/* Invoice Header */}
          <div className="header flex justify-between items-start pb-4 border-b-2 border-teal-600">
            <div>
              <p className="brand text-xl font-bold text-teal-600">QuickMedi</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your trusted pharmacy partner
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-700">TAX INVOICE</h2>
              <p className="text-xs text-gray-500">
                Order: {shortId(order._id)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Customer + Delivery */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
                Customer
              </p>
              <p className="font-medium">{customer?.name ?? "N/A"}</p>
              {customer?.phone && (
                <p className="text-sm text-gray-500">{customer.phone}</p>
              )}
              {customer?.email && (
                <p className="text-sm text-gray-500">{customer.email}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
                Delivery Address
              </p>
              <p className="text-sm">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
              </p>
              <p className="text-sm text-gray-500">
                {addr.city}, {addr.state} — {addr.pincode}
              </p>
            </div>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-4">
            <div>
              <span className="text-gray-500">Payment Method: </span>
              <span className="font-medium capitalize">
                {order.paymentMethod.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Payment Status: </span>
              <span
                className={`font-medium capitalize ${order.paymentStatus === "paid" ? "text-green-600" : "text-orange-600"}`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Order Status: </span>
              <span className="font-medium capitalize">
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            {order.isEmergencyOrder && (
              <div className="text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Emergency Order
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 mb-2">
              Items
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-teal-50 text-xs text-gray-500 uppercase">
                  <th className="p-2 text-left">Medicine</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Unit Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="p-2">
                      <p className="font-medium">{item.medicineName}</p>
                      {item.genericName && (
                        <p className="text-xs text-gray-400">
                          {item.genericName}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right">
                      {(() => {
                        const up = getItemUnitPrice(item, order);
                        return up != null ? `₹${up.toFixed(2)}` : "—";
                      })()}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {(() => {
                        const tp = getItemTotalPrice(item, order);
                        return tp != null ? `₹${tp.toFixed(2)}` : "—";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Charge</span>
              <span>
                {order.deliveryCharge === 0
                  ? "FREE"
                  : `₹${order.deliveryCharge.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- ₹{order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-teal-600 text-teal-700">
              <span>Grand Total</span>
              <span>₹{(order.totalAmount + gst).toFixed(2)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center pt-2 border-t">
            Thank you for choosing QuickMedi. This is a computer-generated
            invoice.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<BackendOrder | null>(null);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = tab !== "all" ? `?status=${tab}` : "";
        const [ordersRes, statsRes] = await Promise.all([
          apiClient.get<any>(`${API_CONFIG.API.VENDOR.ORDERS}${params}`),
          apiClient.get<any>(API_CONFIG.API.VENDOR.ORDER_STATS),
        ]);
        setOrders(ordersRes.data?.orders ?? []);
        setStats(statsRes.data?.stats ?? null);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await apiClient.put<any>(
        API_CONFIG.API.VENDOR.ORDER_STATUS(orderId),
        { status: newStatus },
      );
      const updated: BackendOrder = res.data?.order;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      // refresh stats silently
      apiClient
        .get<any>(API_CONFIG.API.VENDOR.ORDER_STATS)
        .then((r) => setStats(r.data?.stats ?? null));
    } catch (err: any) {
      alert(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to update status",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o._id.toLowerCase().includes(q) ||
      (o.patientId?.name ?? "").toLowerCase().includes(q) ||
      (o.patientId?.phone ?? "").includes(q)
    );
  });

  const statCards = [
    { label: "New", count: stats?.placed ?? 0, color: "yellow" },
    { label: "Confirmed", count: stats?.confirmed ?? 0, color: "blue" },
    { label: "Preparing", count: stats?.preparing ?? 0, color: "purple" },
    {
      label: "Delivering",
      count: stats?.out_for_delivery ?? 0,
      color: "orange",
    },
    { label: "Delivered", count: stats?.delivered ?? 0, color: "green" },
    {
      label: "Cancelled",
      count: (stats?.cancelled ?? 0) + (stats?.rejected ?? 0),
      color: "red",
    },
  ];

  const colorMap: Record<string, string> = {
    yellow: "text-yellow-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    green: "text-green-600",
    red: "text-red-600",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage and process customer orders"
        icon={ShoppingCart}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-md p-4 border border-border card-shadow text-center"
          >
            <p className={`text-2xl font-bold ${colorMap[s.color]}`}>
              {s.count}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-md p-4 border border-border card-shadow">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
              className="whitespace-nowrap"
            >
              {t.label}
              {t.id !== "all" && stats && (stats as any)[t.id] > 0 && (
                <span className="ml-1.5 bg-white/20 text-inherit rounded-full px-1.5 text-xs font-bold">
                  {(stats as any)[t.id]}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md p-12 text-center border border-border card-shadow">
          <Package2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No orders found</h3>
          <p className="text-muted-foreground text-sm">
            Try adjusting your filters or search
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((order) => {
            const actions = NEXT_ACTIONS[order.status] ?? [];
            const isUpdating = updatingId === order._id;
            return (
              <div
                key={order._id}
                className="bg-white rounded-md border border-border card-shadow overflow-hidden flex flex-col"
              >
                {/* Emergency Banner */}
                {order.isEmergencyOrder && (
                  <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-red-700 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Emergency Order
                  </div>
                )}

                {/* Card Header */}
                <div className="bg-linear-to-br from-primary/5 to-transparent px-4 py-3 flex items-start justify-between gap-3 border-b">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold font-mono text-sm tracking-wide">
                        {shortId(order._id)}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_COLOR[order.status]}`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                    {!(
                      order.status === "delivered" &&
                      order.paymentStatus !== "paid"
                    ) && (
                      <span
                        className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                      >
                        {order.paymentMethod.replace("_", " ").toUpperCase()}{" "}
                        · {order.paymentStatus}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-primary">
                      ₹{order.totalAmount?.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {timeAgo(order.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 space-y-3">
                  {/* Customer */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {order.patientId?.name ?? "Anonymous"}
                      </p>
                      {order.patientId?.phone && (
                        <a
                          href={`tel:${order.patientId.phone}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> {order.patientId.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 bg-accent/40 rounded-lg px-2.5 py-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {order.deliveryAddress.addressLine1}
                      {order.deliveryAddress.addressLine2
                        ? `, ${order.deliveryAddress.addressLine2}`
                        : ""}
                      {", "}
                      {order.deliveryAddress.city},{" "}
                      {order.deliveryAddress.state}{" "}
                      {order.deliveryAddress.pincode}
                    </p>
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Items ({order.items.length})
                    </p>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs bg-accent/60 rounded-md px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">
                              {item.medicineName}
                            </span>
                            {item.genericName && (
                              <span className="text-muted-foreground ml-1">
                                ({item.genericName})
                              </span>
                            )}
                            <span className="text-muted-foreground ml-1.5">
                              ×{item.quantity}
                            </span>
                          </div>
                          <span className="font-semibold shrink-0 ml-2">
                            {(() => {
                              const tp = getItemTotalPrice(item, order);
                              return tp != null ? `₹${tp.toFixed(0)}` : "—";
                            })()}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-muted-foreground px-1">
                          +{order.items.length - 3} more item
                          {order.items.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-4 py-3 border-t bg-gray-50/70 flex flex-wrap gap-2">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.next}
                        size="sm"
                        variant={action.variant ?? "default"}
                        onClick={() => updateStatus(order._id, action.next)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 mr-1" />
                        )}
                        {action.label}
                      </Button>
                    );
                  })}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInvoiceOrder(order)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Invoice
                  </Button>
                  {order.patientId?.phone && (
                    <a href={`tel:${order.patientId.phone}`}>
                      <Button size="sm" variant="outline">
                        <Phone className="w-3.5 h-3.5 mr-1" /> Call
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
