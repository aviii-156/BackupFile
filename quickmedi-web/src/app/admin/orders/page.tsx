"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
	Search,
	Package,
	Truck,
	CheckCircle,
	XCircle,
	Clock,
	CreditCard,
	Smartphone,
	Banknote,
	RefreshCw,
} from "lucide-react";
import { adminService } from "@/services/admin.service";

type OrderStatus = "placed" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled" | "rejected";
type PaymentMethod = "stripe_card" | "stripe_upi" | "cod";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type Order = {
	_id: string;
	patientId?: { name?: string; phone?: string; email?: string };
	vendorId?: { storeName?: string; address?: { city?: string } };
	items: { medicineName: string; quantity: number; unitPrice: number; totalPrice: number; mrp: number }[];
	subtotal: number;
	deliveryCharge: number;
	discount: number;
	totalAmount: number;
	savedAmount: number;
	status: OrderStatus;
	paymentMethod: PaymentMethod;
	paymentStatus: PaymentStatus;
	cancelReason?: string;
	rejectReason?: string;
	createdAt: string;
};


const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
	placed: { label: "Placed", color: "bg-blue-50 text-blue-700", icon: Clock },
	confirmed: { label: "Confirmed", color: "bg-indigo-50 text-indigo-700", icon: CheckCircle },
	preparing: { label: "Preparing", color: "bg-yellow-50 text-yellow-700", icon: Package },
	out_for_delivery: { label: "Out for Delivery", color: "bg-orange-50 text-orange-700", icon: Truck },
	delivered: { label: "Delivered", color: "bg-green-50 text-green-700", icon: CheckCircle },
	cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600", icon: XCircle },
	rejected: { label: "Rejected", color: "bg-rose-50 text-rose-700", icon: XCircle },
};

const paymentMethodIcon: Record<PaymentMethod, React.ElementType> = {
	stripe_card: CreditCard,
	stripe_upi: Smartphone,
	cod: Banknote,
};

const paymentMethodLabel: Record<PaymentMethod, string> = {
	stripe_card: "Card",
	stripe_upi: "UPI",
	cod: "COD",
};

const paymentStatusColor: Record<PaymentStatus, string> = {
	pending: "text-yellow-600",
	paid: "text-green-600",
	failed: "text-red-600",
	refunded: "text-blue-600",
};

type FilterTab = "all" | OrderStatus;
const tabs: { value: FilterTab; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "placed", label: "Placed" },
	{ value: "confirmed", label: "Confirmed" },
	{ value: "preparing", label: "Preparing" },
	{ value: "out_for_delivery", label: "Out for Delivery" },
	{ value: "delivered", label: "Delivered" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "rejected", label: "Rejected" },
];

export default function OrdersPage() {
	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalOrders: 0 });
	const [page, setPage] = useState(1);
	const [activeTab, setActiveTab] = useState<FilterTab>("all");
	const [search, setSearch] = useState("");
	const [expanded, setExpanded] = useState<string | null>(null);

	const loadOrders = useCallback(async () => {
		setLoading(true);
		try {
			const res = await adminService.getAllOrders({
				status: activeTab === "all" ? undefined : activeTab,
				page,
				limit: 20,
			});
			if (res.success && res.data) {
				setOrders(res.data.orders as unknown as Order[]);
				setPagination(res.data.pagination as any);
			}
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [activeTab, page]);

	useEffect(() => { loadOrders(); }, [loadOrders]);

	const filtered = orders.filter((o) => {
		const q = search.toLowerCase();
		if (!q) return true;
		return (
			o._id.toLowerCase().includes(q) ||
			(o.patientId?.name ?? "").toLowerCase().includes(q) ||
			(o.vendorId?.storeName ?? "").toLowerCase().includes(q)
		);
	});

	const stats = [
		{ label: "Total Orders", value: String(pagination.totalOrders), color: "bg-blue-50 text-blue-600" },
		{ label: "Delivered", value: String(orders.filter((o) => o.status === "delivered").length), color: "bg-green-50 text-green-600" },
		{ label: "Active", value: String(orders.filter((o) => ["placed","confirmed","preparing","out_for_delivery"].includes(o.status)).length), color: "bg-orange-50 text-orange-600" },
		{ label: "Cancelled/Rejected", value: String(orders.filter((o) => ["cancelled","rejected"].includes(o.status)).length), color: "bg-red-50 text-red-600" },
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-bold">Orders</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						All patient orders across vendors
					</p>
				</div>
				<Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => loadOrders()}>
					<RefreshCw className="w-3 h-3" />
					Refresh
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-4 gap-3">
				{stats.map((s) => (
					<div key={s.label} className="bg-white rounded-lg p-3 border border-border card-shadow">
						<p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
						<p className={`text-lg font-bold px-1.5 py-0.5 rounded w-fit ${s.color}`}>{s.value}</p>
					</div>
				))}
			</div>

			{/* Filter + Search */}
			<div className="bg-white rounded-lg p-4 border border-border card-shadow space-y-3">
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
						<Input
							placeholder="Search by order ID, patient or vendor..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8 h-8 text-xs"
						/>
					</div>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 flex-wrap">
					{tabs.map((tab) => (
						<button
							key={tab.value}
							onClick={() => setActiveTab(tab.value)}
							className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
								activeTab === tab.value
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground hover:bg-muted/80"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Table */}
				<div className="rounded-lg border border-border overflow-hidden">
					{/* Header */}
					<div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
						{["Order / Patient", "Vendor", "Amount", "Payment", "Status", ""].map((h) => (
							<span key={h} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
						))}
					</div>

					{/* Rows */}
					<div className="divide-y divide-border">
						{loading ? (
							<div className="text-center py-10 text-sm text-muted-foreground">Loading orders...</div>
						) : filtered.map((o) => {
								const { label, color, icon: StatusIcon } = statusConfig[o.status];
						const PayIcon = paymentMethodIcon[o.paymentMethod];
						const isOpen = expanded === o._id;

						return (
							<div key={o._id}>
									<div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 hover:bg-accent/30 transition-colors items-center">
										{/* Order / Patient */}
										<div>
											<p className="text-xs font-semibold text-primary">{o._id.slice(-8).toUpperCase()}</p>
											<p className="text-sm font-medium">{o.patientId?.name ?? "Patient"}</p>
											<p className="text-[11px] text-muted-foreground">{o.patientId?.phone ?? ""}</p>
											<p className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
										</div>

										{/* Vendor */}
										<div>
											<p className="text-sm font-medium">{o.vendorId?.storeName ?? "—"}</p>
											<p className="text-[11px] text-muted-foreground">{o.vendorId?.address?.city ?? ""}</p>
											<p className="text-[11px] text-muted-foreground">{o.items.length} item{o.items.length > 1 ? "s" : ""}</p>
										</div>

										{/* Amount */}
										<div>
											<p className="text-sm font-semibold">₹{o.totalAmount}</p>
											{o.savedAmount > 0 && (
												<p className="text-[11px] text-green-600 font-medium">₹{o.savedAmount} saved</p>
											)}
											{o.deliveryCharge > 0 && (
												<p className="text-[10px] text-muted-foreground">+₹{o.deliveryCharge} delivery</p>
											)}
										</div>

										{/* Payment */}
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-1">
												<PayIcon className="w-3 h-3 text-muted-foreground" />
												<span className="text-xs">{paymentMethodLabel[o.paymentMethod]}</span>
											</div>
											<span className={`text-xs font-medium capitalize ${paymentStatusColor[o.paymentStatus]}`}>
												{o.paymentStatus}
											</span>
										</div>

										{/* Status */}
										<span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${color}`}>
											<StatusIcon className="w-3 h-3" />
											{label}
										</span>

										{/* Actions */}
										<button
											onClick={() => setExpanded(isOpen ? null : o._id)}
											className="text-[11px] text-primary hover:underline whitespace-nowrap"
										>
											{isOpen ? "Close" : "Details"}
										</button>
									</div>

									{/* Expanded row — order items + cancel/reject reason */}
									{isOpen && (
										<div className="bg-muted/30 px-6 pb-4 pt-2 space-y-2 border-t border-border">
											<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Items</p>
											<div className="rounded-lg border border-border overflow-hidden bg-white">
												<div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-2 bg-muted/40 border-b border-border">
													{["Medicine", "Qty", "Unit Price", "MRP", "Total"].map(h=>(
														<span key={h} className="text-[10px] font-semibold text-muted-foreground">{h}</span>
													))}
												</div>
												{o.items.map((item, idx) => (
													<div key={idx} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-2 border-b border-border last:border-0">
														<span className="text-xs font-medium">{item.medicineName}</span>
														<span className="text-xs">{item.quantity}</span>
														<span className="text-xs">₹{item.unitPrice}</span>
														<span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
														<span className="text-xs font-medium">₹{item.totalPrice}</span>
													</div>
												))}
											</div>

											{/* Totals */}
											<div className="flex justify-end">
												<div className="text-xs space-y-0.5 min-w-45">
													<div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{o.subtotal}</span></div>
													<div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{o.deliveryCharge > 0 ? `₹${o.deliveryCharge}` : "Free"}</span></div>
													{o.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{o.discount}</span></div>}
													<div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>₹{o.totalAmount}</span></div>
													{o.savedAmount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Saved vs MRP</span><span>₹{o.savedAmount}</span></div>}
												</div>
											</div>

											{/* Cancel / Reject reason */}
											{(o.cancelReason || o.rejectReason) && (
												<div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
													<span className="font-semibold">{o.cancelReason ? "Cancel Reason: " : "Reject Reason: "}</span>
													{o.cancelReason ?? o.rejectReason}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>

				{!loading && filtered.length === 0 && (
					<div className="text-center py-10 text-sm text-muted-foreground">
						No orders found.
					</div>
				)}
				</div>
			</div>

			{/* Pagination */}
			{pagination.totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<p className="text-xs text-muted-foreground">
						Page {pagination.currentPage} of {pagination.totalPages} &mdash; {pagination.totalOrders} total
					</p>
					<div className="flex gap-2">
						<Button size="sm" variant="outline" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
						<Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
					</div>
				</div>
			)}
		</div>
	);
}
