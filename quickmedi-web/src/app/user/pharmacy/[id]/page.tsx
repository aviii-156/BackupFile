"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Star,
  Search,
  ArrowLeft,
  Navigation,
  Plus,
  Minus,
  IndianRupee,
  Loader2,
  Truck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import { useCart } from "@/context/CartContext";

// ── Types ──────────────────────────────────────────────────────────────────────
interface OperatingDay {
  open: string;
  close: string;
  isClosed: boolean;
}

interface VendorStore {
  _id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  email?: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: { coordinates: [number, number] };
  operatingHours: Record<string, OperatingDay>;
  deliveryAvailable: boolean;
  deliveryRadius: number;
  minimumOrderAmount: number;
  deliveryCharge: number;
  acceptsEmergency: boolean;
  averageRating: number;
  totalRatings: number;
  license?: string;
  gstNumber?: string;
  isApproved?: boolean;
}

interface InventoryItem {
  _id: string;
  medicineId?: string | { _id: string; [key: string]: unknown };
  medicineName: string;
  genericName: string;
  composition: string;
  category?: string;
  form?: string;
  mrp: number;
  vendorPrice: number;
  discount: number;
  stock: number;
  unit: string;
  isAvailable: boolean;
  isLowStock: boolean;
  manufacturer?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getTodayHours(
  operatingHours: Record<string, OperatingDay> | undefined,
): string {
  if (!operatingHours) return "Hours not available";
  const today = DAY_NAMES[new Date().getDay()];
  const h = operatingHours[today];
  if (!h) return "Hours not available";
  if (h.isClosed) return "Closed today";
  return `${h.open} – ${h.close}`;
}

function isOpenNow(
  operatingHours: Record<string, OperatingDay> | undefined,
): boolean {
  if (!operatingHours) return false;
  const today = DAY_NAMES[new Date().getDay()];
  const h = operatingHours[today];
  if (!h || h.isClosed) return false;
  try {
    const [oH, oM] = h.open.split(":").map(Number);
    const [cH, cM] = h.close.split(":").map(Number);
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return mins >= oH * 60 + oM && mins < cH * 60 + cM;
  } catch {
    return false;
  }
}

function formatAddress(address: VendorStore["address"]): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

function stockVariant(
  item: InventoryItem,
): "success" | "warning" | "secondary" {
  if (!item.isAvailable || item.stock === 0) return "secondary";
  if (item.isLowStock) return "warning";
  return "success";
}

function stockLabel(item: InventoryItem): string {
  if (!item.isAvailable || item.stock === 0) return "Out of Stock";
  if (item.isLowStock) return "Low Stock";
  return "In Stock";
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PharmacyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { addToCart, getQuantity, updateQuantity } = useCart();

  const [store, setStore] = useState<VendorStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // ── Fetch store ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setStoreLoading(true);
    setStoreError(null);
    apiClient
      .get<any>(API_CONFIG.API.STORE.GET_BY_ID(id))
      .then((res) => setStore(res.data?.store ?? null))
      .catch((err) =>
        setStoreError(err?.response?.data?.message || "Store not found"),
      )
      .finally(() => setStoreLoading(false));
  }, [id]);

  // ── Fetch inventory ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setInvLoading(true);
    const qs = debouncedQuery
      ? `?search=${encodeURIComponent(debouncedQuery)}`
      : "";
    apiClient
      .get<any>(`${API_CONFIG.API.STORE.INVENTORY(id)}${qs}`)
      .then((res) => setInventory(res.data?.inventory ?? []))
      .catch(() => setInventory([]))
      .finally(() => setInvLoading(false));
  }, [id, debouncedQuery]);

  // ── Debounce ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    (item: InventoryItem) => {
      if (!store) return;
      const medicineId =
        typeof item.medicineId === "object" && item.medicineId !== null
          ? (item.medicineId as { _id: string })._id
          : ((item.medicineId as string | undefined) ?? "");
      addToCart({
        inventoryId: item._id,
        medicineId,
        storeId: store._id,
        storeName: store.storeName,
        medicineName: item.medicineName,
        genericName: item.genericName,
        vendorPrice: item.vendorPrice,
        mrp: item.mrp,
        discount: item.discount,
        unit: item.unit,
        category: item.category,
        form: item.form,
        manufacturer: item.manufacturer,
        maxStock: item.stock,
      });
    },
    [store, addToCart],
  );

  const handleQtyChange = useCallback(
    (inventoryId: string, change: number) => {
      const current = getQuantity(inventoryId);
      updateQuantity(inventoryId, current + change);
    },
    [getQuantity, updateQuantity],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (storeLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading store details…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (storeError || !store) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Stores
        </button>
        <div className="text-center py-16">
          <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
          <p className="text-muted-foreground">
            {storeError || "The store you're looking for doesn't exist."}
          </p>
        </div>
      </div>
    );
  }

  const open = isOpenNow(store.operatingHours);
  const todayHours = getTodayHours(store.operatingHours);
  const fullAddress = formatAddress(store.address);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Stores
      </button>

      {/* ── Store Profile Card ──────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-md shadow-sm p-5 space-y-4">
        {/* Top row: name + badges + status */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {store.storeName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Owner: {store.ownerName}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {store.isApproved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {store.averageRating
                  ? store.averageRating.toFixed(1)
                  : "0.0"}{" "}
                Rating
              </span>
              {open ? (
                <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  Open Now
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
                  Closed Now
                </span>
              )}
            </div>
          </div>

          {/* Action badges + buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <div className="flex gap-2 ml-auto">
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 h-9"
                onClick={() => {
                  const [lng, lat] = store.location.coordinates;
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                    "_blank",
                  );
                }}
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-5 h-9"
                onClick={() => window.open(`tel:${store.phone}`)}
              >
                <Phone className="w-4 h-4" />
                Call Now
              </Button>
            </div>
          </div>
        </div>

        {/* Meta table */}
        {/* {(store.license || store.gstNumber) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-3">
            {store.license && (
              <>
                <span className="text-muted-foreground">License</span>
                <span className="font-medium text-gray-800">
                  {store.license}
                </span>
              </>
            )}
            {store.gstNumber && (
              <>
                <span className="text-muted-foreground">GST</span>
                <span className="font-medium text-gray-800">
                  {store.gstNumber}
                </span>
              </>
            )}
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium text-gray-800">Vendor</span>
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-gray-800">Active</span>
          </div>
        )} */}

        {/* Info grid: address / contact / hours / delivery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Address
              </p>
              <p className="text-sm text-gray-700">{fullAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                Today's Hours
              </p>
              <p className="text-sm text-gray-700">{todayHours}</p>
            </div>
          </div>

          {store.deliveryAvailable && (
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Delivery
                </p>
                <p className="text-sm text-gray-700">
                  {store.deliveryRadius} km radius ·{" "}
                  {store.deliveryCharge === 0
                    ? "Free delivery"
                    : `₹${store.deliveryCharge} charge`}
                  {store.minimumOrderAmount > 0 &&
                    ` · Min. order ₹${store.minimumOrderAmount}`}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            {store.deliveryAvailable && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-500 text-white px-3 py-1.5 rounded-full">
                <Truck className="w-3 h-3" /> Home Delivery
              </span>
            )}
            {store.acceptsEmergency && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-500 text-white px-3 py-1.5 rounded-full">
                <Zap className="w-3 h-3" /> 24/7 Emergency
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Available Medicines ─────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-md shadow-sm p-5">
        {/* Header */}
        <div className="mb-1">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Available Medicines
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search medicines available at this store
          </p>
        </div>

        {/* Search */}
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, generic name, or composition…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {/* List */}
        {invLoading ? (
          <div className="flex items-center justify-center py-14 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading medicines…
            </span>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-14">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No medicines found matching your search"
                : "No medicines in inventory yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventory.map((item) => {
              const inStock = item.isAvailable && item.stock > 0;
              const qty = getQuantity(item._id);
              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/40 transition-colors bg-white"
                >
                  {/* Medicine info */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                        {item.medicineName}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {item.genericName}
                      {item.manufacturer ? ` · ${item.manufacturer}` : ""}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5 rounded-md"
                        >
                          {item.category}
                        </Badge>
                      )}
                      {item.form && (
                        <Badge
                          variant="outline"
                          className="text-xs px-2 py-0.5 rounded-md"
                        >
                          {item.form}
                        </Badge>
                      )}
                      <div className="flex items-center font-bold text-primary text-sm">
                        <IndianRupee className="w-3 h-3" />
                        <span>{item.vendorPrice}</span>
                        {item.mrp > item.vendorPrice && (
                          <span className="text-xs font-normal text-muted-foreground line-through ml-1.5">
                            ₹{item.mrp}
                          </span>
                        )}
                      </div>
                      {item.discount > 0 && (
                        <span className="text-xs text-green-600 font-semibold">
                          {item.discount}% off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cart control */}
                  <div className="shrink-0">
                    {inStock ? (
                      qty > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 rounded-md"
                            onClick={() => handleQtyChange(item._id, -1)}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold">
                            {qty}
                          </span>
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-md bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => handleQtyChange(item._id, 1)}
                            disabled={qty >= item.stock}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={stockVariant(item)}
                            className="shrink-0 text-xs"
                          >
                            {stockLabel(item)}
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white rounded-md h-8 px-4"
                            onClick={() => handleAdd(item)}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button
                        disabled
                        variant="secondary"
                        size="sm"
                        className="h-8 px-4"
                      >
                        Out of Stock
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
