"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Package,
	Search,
	Plus,
	Edit,
	Trash2,
	AlertCircle,
	TrendingUp,
	TrendingDown,
	MoreVertical,
	Pill,
	Eye,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Star,
	RefreshCw,
	CheckCircle2,
	XCircle,
	Loader2,
} from "lucide-react";
import { vendorService, type InventoryItem, type CatalogItem } from "@/services/vendor.service";
import { cn } from "@/lib/utils";

type SortColumn = "name" | "price" | "category" | "stock" | "status" | null;
type SortDirection = "asc" | "desc";

const statusFromItem = (item: InventoryItem) => {
	if (item.isExpired) return "Expired";
	if (item.stock === 0) return "Out of Stock";
	if (item.isLowStock) return "Low Stock";
	return "Active";
};

const statusBadgeClass = (status: string) => {
	const map: Record<string, string> = {
		Active: "bg-green-50 text-green-700 border-green-200",
		"Low Stock": "bg-orange-50 text-orange-700 border-orange-200",
		"Out of Stock": "bg-red-50 text-red-700 border-red-200",
		Expired: "bg-gray-100 text-gray-600 border-gray-200",
	};
	return map[status] ?? map["Active"];
};

// ─── Add Medicine dialog (catalog search → details form) ───────────────────
function AddMedicineDialog({
	open,
	onClose,
	onAdded,
}: {
	open: boolean;
	onClose: () => void;
	onAdded: () => void;
}) {
	const [step, setStep] = useState<1 | 2>(1);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<CatalogItem[]>([]);
	const [searching, setSearching] = useState(false);
	const [selected, setSelected] = useState<CatalogItem | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [form, setForm] = useState({
		mrp: "",
		vendorPrice: "",
		discount: "0",
		stock: "",
		unit: "strip",
		batchNumber: "",
		expiryDate: "",
		lowStockThreshold: "10",
	});

	useEffect(() => {
		if (!open) {
			setStep(1);
			setQuery("");
			setResults([]);
			setSelected(null);
			setError(null);
			setForm({ mrp: "", vendorPrice: "", discount: "0", stock: "", unit: "strip", batchNumber: "", expiryDate: "", lowStockThreshold: "10" });
		}
	}, [open]);

	const handleSearch = useCallback((q: string) => {
		setQuery(q);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (q.trim().length < 2) { setResults([]); return; }
		debounceRef.current = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await vendorService.searchCatalog(q.trim());
				if (res.success) setResults(res.data?.results ?? []);
			} catch {
				// ignore
			} finally {
				setSearching(false);
			}
		}, 400);
	}, []);

	const handleSelect = (item: CatalogItem) => {
		setSelected(item);
		setForm((f) => ({
			...f,
			mrp: String(item.price || ""),
			vendorPrice: String(Math.round((item.price || 0) * 0.85)),
		}));
		setStep(2);
	};

	const handleSubmit = async () => {
		if (!selected) return;
		setError(null);
		if (!form.mrp || !form.vendorPrice || !form.stock || !form.expiryDate) {
			setError("MRP, selling price, stock, and expiry date are required.");
			return;
		}
		setSubmitting(true);
		try {
			const res = await vendorService.addFromCatalog(selected.product_id, {
				mrp: parseFloat(form.mrp),
				vendorPrice: parseFloat(form.vendorPrice),
				discount: parseFloat(form.discount || "0"),
				stock: parseInt(form.stock),
				unit: form.unit,
				batchNumber: form.batchNumber || undefined,
				expiryDate: form.expiryDate,
				lowStockThreshold: parseInt(form.lowStockThreshold || "10"),
			});
			if (res.success) {
				onAdded();
				onClose();
			} else {
				setError((res as any).message || "Failed to add medicine");
			}
		} catch (e: any) {
			setError(e.message || "Failed to add medicine");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Plus className="w-5 h-5 text-primary" />
						{step === 1 ? "Search Medicine Catalog" : `Add: ${selected?.brand_name}`}
					</DialogTitle>
				</DialogHeader>

				{step === 1 ? (
					<div className="space-y-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								autoFocus
								placeholder="Type medicine name, ingredient..."
								value={query}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-9"
							/>
							{searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
						</div>

						{results.length > 0 ? (
							<div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
								{results.map((item) => (
									<button
										key={item.product_id}
										onClick={() => handleSelect(item)}
										className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="font-medium text-sm">{item.brand_name}</p>
												<p className="text-xs text-muted-foreground">{item.primary_ingredient} · {item.manufacturer}</p>
												{item.dosage_form && (
													<span className="text-xs text-primary">{item.dosage_form}</span>
												)}
											</div>
											{item.price > 0 && (
												<span className="text-sm font-semibold shrink-0">₹{item.price}</span>
											)}
										</div>
									</button>
								))}
							</div>
						) : query.length >= 2 && !searching ? (
							<p className="text-sm text-center text-muted-foreground py-6">No medicines found for "{query}"</p>
						) : query.length > 0 && query.length < 2 ? (
							<p className="text-xs text-muted-foreground text-center">Type at least 2 characters to search</p>
						) : null}
					</div>
				) : (
					<div className="space-y-4">
						{/* Selected medicine summary */}
						<div className="bg-accent rounded-lg p-3 flex items-start gap-3">
							<div className="w-9 h-9 rounded-md bg-teal-100 flex items-center justify-center shrink-0">
								<Pill className="w-5 h-5 text-teal-600" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-semibold text-sm">{selected?.brand_name}</p>
								<p className="text-xs text-muted-foreground truncate">
									{selected?.primary_ingredient} · {selected?.manufacturer}
								</p>
								{selected?.therapeutic_class && (
									<span className="inline-block text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1">
										{selected.therapeutic_class}
									</span>
								)}
							</div>
							<button onClick={() => setStep(1)} className="text-xs text-orange-500 hover:underline shrink-0">Change</button>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium mb-1">MRP (₹) *</label>
								<Input type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} placeholder="0.00" />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Your Selling Price (₹) *</label>
								<Input type="number" value={form.vendorPrice} onChange={(e) => setForm((f) => ({ ...f, vendorPrice: e.target.value }))} placeholder="0.00" />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Stock Quantity *</label>
								<Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Unit</label>
								<select
									value={form.unit}
									onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
									className="w-full h-9 px-3 text-sm border rounded-md"
								>
									<option value="strip">Strip</option>
									<option value="bottle">Bottle</option>
									<option value="piece">Piece</option>
									<option value="box">Box</option>
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Expiry Date *</label>
								<Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Batch Number</label>
								<Input value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} placeholder="Optional" />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Discount (%)</label>
								<Input type="number" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} placeholder="0" />
							</div>
							<div>
								<label className="block text-xs font-medium mb-1">Low Stock Alert (qty)</label>
								<Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} placeholder="10" />
							</div>
						</div>

						{error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
					</div>
				)}

				<DialogFooter>
					{step === 2 && (
						<>
							<Button variant="outline" onClick={() => setStep(1)}>Back</Button>
							<Button onClick={handleSubmit} disabled={submitting}>
								{submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : "Add to Inventory"}
							</Button>
						</>
					)}
					{step === 1 && <Button variant="outline" onClick={onClose}>Cancel</Button>}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Edit dialog ───────────────────────────────────────────────────────────
function EditDialog({
	item,
	onClose,
	onSaved,
}: {
	item: InventoryItem | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [form, setForm] = useState({ mrp: "", vendorPrice: "", discount: "", stock: "", lowStockThreshold: "", batchNumber: "", expiryDate: "" });
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (item) {
			setForm({
				mrp: String(item.mrp),
				vendorPrice: String(item.vendorPrice),
				discount: String(item.discount),
				stock: String(item.stock),
				lowStockThreshold: String(item.lowStockThreshold),
				batchNumber: item.batchNumber || "",
				expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
			});
			setError(null);
		}
	}, [item]);

	const handleSave = async () => {
		if (!item) return;
		setError(null);
		setSaving(true);
		try {
			const res = await vendorService.updateInventoryItem(item._id, {
				mrp: parseFloat(form.mrp),
				vendorPrice: parseFloat(form.vendorPrice),
				discount: parseFloat(form.discount),
				stock: parseInt(form.stock),
				lowStockThreshold: parseInt(form.lowStockThreshold),
				batchNumber: form.batchNumber || undefined,
				expiryDate: form.expiryDate,
			});
			if (res.success) { onSaved(); onClose(); }
			else setError((res as any).message || "Update failed");
		} catch (e: any) {
			setError(e.message || "Update failed");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={!!item} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Edit className="w-5 h-5 text-primary" />
						Edit: {item?.medicineName}
					</DialogTitle>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="block text-xs font-medium mb-1">MRP (₹)</label>
						<Input type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} />
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Selling Price (₹)</label>
						<Input type="number" value={form.vendorPrice} onChange={(e) => setForm((f) => ({ ...f, vendorPrice: e.target.value }))} />
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Discount (%)</label>
						<Input type="number" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Stock Qty</label>
						<Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Low Stock Alert</label>
						<Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} />
					</div>
					<div>
						<label className="block text-xs font-medium mb-1">Batch Number</label>
						<Input value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} />
					</div>
					<div className="col-span-2">
						<label className="block text-xs font-medium mb-1">Expiry Date</label>
						<Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
					</div>
				</div>
				{error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Cancel</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── View dialog ────────────────────────────────────────────────────────────
function ViewDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
	if (!item) return null;
	const status = statusFromItem(item);
	const rows: [string, string][] = [
		["Generic Name", item.genericName],
		["Manufacturer", item.manufacturer || "—"],
		["Category", item.category || "—"],
		["Form", item.form || "—"],
		["Composition", item.composition || "—"],
		["MRP", `₹${item.mrp}`],
		["Selling Price", `₹${item.vendorPrice}`],
		["Discount", `${item.discount}%`],
		["Stock", `${item.stock} ${item.unit}(s)`],
		["Low Stock Alert", `${item.lowStockThreshold} units`],
		["Batch Number", item.batchNumber || "—"],
		["Expiry Date", item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-IN") : "—"],
		["Added On", item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "—"],
	];
	return (
		<Dialog open={!!item} onOpenChange={onClose}>
			<DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Eye className="w-5 h-5 text-primary" />
						{item.medicineName}
					</DialogTitle>
				</DialogHeader>
				<div className="flex items-center justify-between mb-2">
					<Badge className={`px-2 py-1 text-xs font-medium border ${statusBadgeClass(status)}`}>{status}</Badge>
					{item.isExpiringSoon && !item.isExpired && (
						<span className="text-xs text-orange-500 font-medium">⚠ Expiring soon</span>
					)}
				</div>
				<div className="space-y-1.5">
					{rows.map(([label, value]) => (
						<div key={label} className="flex justify-between py-1.5 border-b last:border-0">
							<span className="text-xs text-muted-foreground">{label}</span>
							<span className="text-xs font-medium text-right max-w-[60%]">{value}</span>
						</div>
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Delete dialog ──────────────────────────────────────────────────────────
function DeleteDialog({
	item,
	onClose,
	onDeleted,
}: {
	item: InventoryItem | null;
	onClose: () => void;
	onDeleted: () => void;
}) {
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!item) return;
		setDeleting(true);
		try {
			await vendorService.deleteInventoryItem(item._id);
			onDeleted();
			onClose();
		} catch (e: any) {
			setError(e.message || "Delete failed");
		} finally {
			setDeleting(false);
		}
	};

	return (
		<Dialog open={!!item} onOpenChange={onClose}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-red-600">
						<Trash2 className="w-5 h-5" />
						Remove Medicine
					</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					Are you sure you want to remove <span className="font-semibold text-foreground">{item?.medicineName}</span> from your inventory? This cannot be undone.
				</p>
				{error && <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Cancel</Button>
					<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
						{deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</> : "Remove"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function InventoryPage() {
	const [inventory, setInventory] = useState<InventoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sortColumn, setSortColumn] = useState<SortColumn>(null);
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [showAdd, setShowAdd] = useState(false);
	const [editItem, setEditItem] = useState<InventoryItem | null>(null);
	const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
	const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
	const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [debouncedSearch, setDebouncedSearch] = useState("");

	// Debounce search input
	useEffect(() => {
		if (searchRef.current) clearTimeout(searchRef.current);
		searchRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
	}, [searchQuery]);

	const fetchInventory = useCallback(async () => {
		setLoading(true);
		try {
			const [invRes, statsRes] = await Promise.all([
				vendorService.getMyInventory({
					search: debouncedSearch || undefined,
					status: statusFilter !== "all" ? statusFilter : undefined,
					limit: 200,
				}),
				vendorService.getInventoryStats(),
			]);
			if (invRes.success) setInventory(invRes.data?.inventory ?? []);
			if (statsRes.success) {
				const s = statsRes.data?.stats;
				if (s) setStats({ total: s.total, lowStock: s.lowStock, outOfStock: s.outOfStock, totalValue: s.totalValue });
			}
		} catch {
			// handle silently
		} finally {
			setLoading(false);
		}
	}, [debouncedSearch, statusFilter]);

	useEffect(() => { fetchInventory(); }, [fetchInventory]);

	const handleSort = (col: SortColumn) => {
		if (sortColumn === col) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
		else { setSortColumn(col); setSortDirection("asc"); }
	};

	const getSortIcon = (col: SortColumn) => {
		if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
		return sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
	};

	const sorted = [...inventory].sort((a, b) => {
		if (!sortColumn) return 0;
		let v = 0;
		if (sortColumn === "name") v = a.medicineName.localeCompare(b.medicineName);
		else if (sortColumn === "price") v = a.vendorPrice - b.vendorPrice;
		else if (sortColumn === "category") v = (a.category ?? "").localeCompare(b.category ?? "");
		else if (sortColumn === "stock") v = a.stock - b.stock;
		else if (sortColumn === "status") v = statusFromItem(a).localeCompare(statusFromItem(b));
		return sortDirection === "asc" ? v : -v;
	});

	const toggleAll = () =>
		setSelectedIds(selectedIds.length === sorted.length ? [] : sorted.map((m) => m._id));
	const toggleOne = (id: string) =>
		setSelectedIds((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Medicines</h1>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={fetchInventory} className="gap-1.5">
						<RefreshCw className="w-4 h-4" />
						Refresh
					</Button>
					<Button onClick={() => setShowAdd(true)} className="gap-2">
						<Plus className="w-4 h-4" />
						Add Medicine
					</Button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{[
					{ label: "Total Items", value: stats.total, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
					{ label: "Low Stock", value: stats.lowStock, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
					{ label: "Out of Stock", value: stats.outOfStock, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
					{ label: "Inventory Value", value: `₹${(stats.totalValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
				].map((s) => (
					<div key={s.label} className="bg-white rounded-md p-5 border border-border flex items-center gap-4">
						<div className={cn("w-11 h-11 rounded-lg flex items-center justify-center", s.bg)}>
							<s.icon className={cn("w-5 h-5", s.color)} />
						</div>
						<div>
							<p className="text-2xl font-bold">{s.value}</p>
							<p className="text-xs text-muted-foreground">{s.label}</p>
						</div>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="relative flex-1 min-w-50">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, ingredient, category..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="All Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="available">In Stock</SelectItem>
						<SelectItem value="low_stock">Low Stock</SelectItem>
						<SelectItem value="out_of_stock">Out of Stock</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="bg-white rounded-md border border-border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50 border-b">
							<tr>
								<th className="text-left p-4 w-10">
									<input type="checkbox" checked={selectedIds.length === sorted.length && sorted.length > 0} onChange={toggleAll} className="w-4 h-4 rounded" />
								</th>
								<th className="text-left p-4 font-medium">
									<button onClick={() => handleSort("name")} className="flex items-center gap-1.5 cursor-pointer">{getSortIcon("name")} Medicine Name</button>
								</th>
								<th className="text-left p-4 font-medium">
									<button onClick={() => handleSort("price")} className="flex items-center gap-1.5 cursor-pointer">{getSortIcon("price")} Price</button>
								</th>
								<th className="text-left p-4 font-medium">
									<button onClick={() => handleSort("category")} className="flex items-center gap-1.5 cursor-pointer">{getSortIcon("category")} Category</button>
								</th>
								<th className="text-left p-4 font-medium">
									<button onClick={() => handleSort("stock")} className="flex items-center gap-1.5 cursor-pointer">{getSortIcon("stock")} Stock</button>
								</th>
								<th className="text-left p-4 font-medium">Expiry</th>
								<th className="text-left p-4 font-medium">
									<button onClick={() => handleSort("status")} className="flex items-center gap-1.5 cursor-pointer">{getSortIcon("status")} Status</button>
								</th>
								<th className="w-10 p-4" />
							</tr>
						</thead>
						<tbody className="divide-y">
							{loading ? (
								<tr>
									<td colSpan={8} className="py-16 text-center">
										<Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
										<p className="text-sm text-muted-foreground">Loading inventory...</p>
									</td>
								</tr>
							) : sorted.length === 0 ? (
								<tr>
									<td colSpan={8}>
										<div className="flex flex-col items-center justify-center py-14 text-center">
											<Package className="w-12 h-12 text-muted-foreground mb-3" />
											<h3 className="text-base font-semibold mb-1">No medicines found</h3>
											<p className="text-sm text-muted-foreground mb-4">
												{searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Add medicines from the catalog to get started"}
											</p>
											{!searchQuery && statusFilter === "all" && (
												<Button onClick={() => setShowAdd(true)} className="gap-2">
													<Plus className="w-4 h-4" /> Add First Medicine
												</Button>
											)}
										</div>
									</td>
								</tr>
							) : (
								sorted.map((item) => {
									const status = statusFromItem(item);
									return (
										<tr key={item._id} className="hover:bg-accent/40 transition-colors">
											<td className="p-4">
												<input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => toggleOne(item._id)} className="w-4 h-4 rounded" />
											</td>
											<td className="p-4">
												<div className="flex items-center gap-3">
													<div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
														<Pill className="w-4 h-4 text-teal-600" />
													</div>
													<div>
														<p className="font-medium text-sm">{item.medicineName}</p>
														<p className="text-xs text-muted-foreground">{item.genericName}</p>
													</div>
												</div>
											</td>
											<td className="p-4">
												<div>
													<p className="font-semibold text-sm">₹{item.vendorPrice}</p>
													{item.mrp !== item.vendorPrice && (
														<p className="text-xs text-muted-foreground line-through">₹{item.mrp}</p>
													)}
												</div>
											</td>
											<td className="p-4 text-sm">{item.category || "—"}</td>
											<td className="p-4">
												<span className={cn("font-semibold text-sm", item.stock === 0 ? "text-red-600" : item.isLowStock ? "text-orange-600" : "text-foreground")}>
													{item.stock}
												</span>
												<span className="text-xs text-muted-foreground ml-1">{item.unit}(s)</span>
											</td>
											<td className="p-4 text-xs text-muted-foreground">
												{item.expiryDate ? (
													<span className={cn(item.isExpired ? "text-red-500" : item.isExpiringSoon ? "text-orange-500" : "")}>
														{new Date(item.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
													</span>
												) : "—"}
											</td>
											<td className="p-4">
												<Badge className={`text-xs px-2 py-1 border ${statusBadgeClass(status)}`}>{status}</Badge>
											</td>
											<td className="p-4">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
															<MoreVertical className="w-4 h-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem className="gap-2" onClick={() => setViewItem(item)}>
															<Eye className="w-4 h-4" /> View details
														</DropdownMenuItem>
														<DropdownMenuItem className="gap-2" onClick={() => setEditItem(item)}>
															<Edit className="w-4 h-4" /> Edit
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem variant="destructive" className="gap-2" onClick={() => setDeleteItem(item)}>
															<Trash2 className="w-4 h-4" /> Remove
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				{!loading && sorted.length > 0 && (
					<div className="px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground">
						Showing {sorted.length} item{sorted.length !== 1 ? "s" : ""}
						{selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
					</div>
				)}
			</div>

			{/* Dialogs */}
			<AddMedicineDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={fetchInventory} />
			<EditDialog item={editItem} onClose={() => setEditItem(null)} onSaved={fetchInventory} />
			<ViewDialog item={viewItem} onClose={() => setViewItem(null)} />
			<DeleteDialog item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={fetchInventory} />
		</div>
	);
}
