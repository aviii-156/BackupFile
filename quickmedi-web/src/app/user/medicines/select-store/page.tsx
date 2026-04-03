"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Store,
  MapPin,
  Loader2,
  ArrowLeft,
  ShoppingCart,
  Package,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronRight,
  Pill,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import { useMedicineCart } from "@/context/MedicineCartContext";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/context/CartContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreMatch {
  store: {
    _id: string;
    pharmacyName?: string;
    businessName?: string;
    storeName?: string;
    ownerName?: string;
    address?: { addressLine1?: string; city?: string; state?: string };
    rating?: number;
    deliveryAvailable?: boolean;
    deliveryCharge?: number;
    minimumOrderAmount?: number;
    isActive?: boolean;
    operatingHours?: { open?: string; close?: string; isOpen?: boolean };
  };
  matchedItems: {
    _id: string;
    medicineName: string;
    genericName: string;
    price?: number;
    vendorPrice?: number;
    mrp: number;
    discount?: number;
    stock: number;
    unit?: string;
    vendorId?: string;
  }[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SelectStorePage() {
  const router = useRouter();
  const { items: wishlist, clearWishlist } = useMedicineCart();
  const { addToCart, clearCart } = useCart();

  const [stores, setStores] = useState<StoreMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectingStoreId, setSelectingStoreId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ── Fetch stores that carry wishlist medicines ──────────────────────────────
  const fetchStores = useCallback(
    async (lat: number, lng: number) => {
      if (wishlist.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        // Primary: find vendors that stock any of the requested medicines
        let vendors: StoreMatch[] = [];
        try {
          const medicineNames = wishlist.map((w) => w.medicineName);
          const res = await apiClient.post<any>(API_CONFIG.API.STORE.SEARCH_BY_MEDICINES, {
            medicines: medicineNames,
            latitude: lat,
            longitude: lng,
          });
          vendors = res.data?.vendors ?? [];
        } catch {
          // Primary call failed — proceed to nearby fallback
        }

        if (vendors.length > 0) {
          setStores(vendors);
          return;
        }

        // Fallback: nearby stores (triggered on empty result OR API error)
        const nearbyRes = await apiClient.get<any>(
          `${API_CONFIG.API.STORE.NEARBY}?latitude=${lat}&longitude=${lng}&radius=10`
        );
        const nearbyStores: any[] = nearbyRes.data?.stores ?? [];
        setStores(nearbyStores.map((s) => ({ store: s, matchedItems: [] })));
      } catch {
        setStores([]);
      } finally {
        setIsLoading(false);
      }
    },
    [wishlist]
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported. Showing all nearby stores.");
      // Try without exact coords
      fetchStores(0, 0);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchStores(coords.lat, coords.lng);
      },
      () => {
        setLocationError("Location access denied. Showing stores based on your address.");
        fetchStores(0, 0);
      },
      { timeout: 8000 }
    );
  }, [fetchStores]);

  // ── Select a store: convert wishlist to cart items ──────────────────────────
  const handleSelectStore = async (storeMatch: StoreMatch) => {
    const storeId = storeMatch.store._id;
    setSelectingStoreId(storeId);

    try {
      // Fetch full inventory for this store
      const invRes = await apiClient.get<any>(
        `${API_CONFIG.API.STORE.INVENTORY(storeId)}?inStock=true`
      );
      const inventory: any[] = invRes.data?.inventory ?? [];

      // Build a lookup map: normalized medicineName → inventory item
      const invMap = new Map<string, any>();
      inventory.forEach((inv) => {
        const key = inv.medicineName?.toLowerCase().trim() ?? "";
        if (!invMap.has(key)) invMap.set(key, inv);
      });

      const storeLabel =
        storeMatch.store.pharmacyName ||
        storeMatch.store.businessName ||
        storeMatch.store.storeName ||
        storeMatch.store.ownerName ||
        "Pharmacy";

      // Clear any existing cart (we are starting a new store selection)
      clearCart();

      // Convert each wishlist item to a CartItem
      wishlist.forEach((wishItem) => {
        const key = wishItem.medicineName.toLowerCase().trim();
        const inv = invMap.get(key);

        const cartItem: Omit<CartItem, "quantity"> = inv
          ? // ── Matched: full inventory data available ──────────────────────
            {
              inventoryId: inv._id,
              medicineId: inv.medicineId?._id ?? inv.medicineId ?? wishItem.medicineId ?? "",
              storeId,
              storeName: storeLabel,
              medicineName: inv.medicineName,
              genericName: inv.genericName ?? wishItem.genericName,
              vendorPrice: inv.price ?? inv.vendorPrice ?? inv.mrp ?? wishItem.mrp,
              mrp: inv.mrp ?? wishItem.mrp,
              discount: inv.discount ?? 0,
              unit: inv.unit ?? wishItem.unit ?? "units",
              category: inv.category ?? wishItem.category,
              form: inv.form ?? wishItem.form,
              manufacturer: inv.manufacturer ?? wishItem.manufacturer,
              maxStock: inv.stock ?? 999,
            }
          : // ── Unmatched: use wishlist data; backend will handle via fallback ─
            {
              inventoryId: `__unmatched__${wishItem.medicineName
                .toLowerCase()
                .replace(/\s+/g, "_")}`,
              medicineId: wishItem.medicineId ?? "",
              storeId,
              storeName: storeLabel,
              medicineName: wishItem.medicineName,
              genericName: wishItem.genericName,
              vendorPrice: wishItem.vendorPrice ?? wishItem.mrp,
              mrp: wishItem.mrp,
              discount: 0,
              unit: wishItem.unit ?? "units",
              category: wishItem.category,
              form: wishItem.form,
              manufacturer: wishItem.manufacturer,
              maxStock: 999,
            };

        addToCart({ ...cartItem, quantity: wishItem.quantity } as any);
      });

      // Clear wishlist now that items are in the order cart
      clearWishlist();

      router.push("/user/order/checkout");
    } catch (err: any) {
      alert(err?.message ?? "Failed to load store inventory. Please try again.");
    } finally {
      setSelectingStoreId(null);
    }
  };

  // ── Empty wishlist guard ────────────────────────────────────────────────────
  if (wishlist.length === 0 && !isLoading) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Your medicine cart is empty
        </h2>
        <p className="text-gray-500 mb-6">
          Browse medicines and add them to your cart first.
        </p>
        <Link href="/user/medicines">
          <Button>
            <Pill className="w-4 h-4 mr-2" /> Browse Medicines
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/user/order/cart">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Select a Store</h1>
          <p className="text-sm text-gray-500">
            {wishlist.length} medicine{wishlist.length > 1 ? "s" : ""} in your cart
            {userCoords ? " · Showing stores within 10 km" : ""}
          </p>
        </div>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {locationError}
        </div>
      )}

      {/* Medicines summary */}
      <div className="bg-white rounded-md border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Medicines in your cart
        </h2>
        <div className="flex flex-wrap gap-2">
          {wishlist.map((w) => (
            <span
              key={w.id}
              className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full"
            >
              <Pill className="w-3 h-3 text-orange-500" />
              {w.medicineName} ×{w.quantity}
            </span>
          ))}
        </div>
      </div>

      {/* Stores list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Finding stores near you…</span>
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-md p-12 border border-gray-200 text-center">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No nearby stores found</h3>
          <p className="text-gray-500 text-sm mb-4">
            We couldn&apos;t find any stores near you. Check back later or try enabling
            location access.
          </p>
          <Link href="/user/nearby-stores">
            <Button variant="outline">Browse All Stores</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((storeMatch) => {
            const s = storeMatch.store;
            const storeId = s._id;
            const storeLabel =
              s.pharmacyName || s.businessName || s.storeName || s.ownerName || "Pharmacy";
            const matchCount = storeMatch.matchedItems.length;
            const totalMeds = wishlist.length;
            const pct = totalMeds > 0 ? Math.round((matchCount / totalMeds) * 100) : 0;
            const allMatched = matchCount >= totalMeds;
            const isSelecting = selectingStoreId === storeId;

            return (
              <div
                key={storeId}
                className={`bg-white rounded-md border p-5 hover:shadow-md transition-shadow ${
                  allMatched ? "border-green-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Store name + badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {storeLabel}
                      </h3>
                      {allMatched && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                          <CheckCircle className="w-3 h-3" /> All Available
                        </Badge>
                      )}
                      {!allMatched && matchCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                          {matchCount}/{totalMeds} Available
                        </Badge>
                      )}
                      {matchCount === 0 && (
                        <Badge className="bg-red-50 text-red-600 border-red-100 text-xs">
                          No Matches
                        </Badge>
                      )}
                    </div>

                    {/* Address */}
                    {s.address && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {[s.address.addressLine1, s.address.city, s.address.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    {/* Info row */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {s.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {s.rating.toFixed(1)}
                        </span>
                      )}
                      {s.deliveryAvailable && (
                        <span className="text-green-600 font-medium">
                          Delivery {s.deliveryCharge === 0 ? "Free" : `₹${s.deliveryCharge}`}
                        </span>
                      )}
                      {s.minimumOrderAmount != null && s.minimumOrderAmount > 0 && (
                        <span>Min ₹{s.minimumOrderAmount}</span>
                      )}
                      {s.operatingHours?.isOpen != null && (
                        <span
                          className={
                            s.operatingHours.isOpen ? "text-green-600" : "text-red-500"
                          }
                        >
                          {s.operatingHours.isOpen ? "Open Now" : "Closed"}
                        </span>
                      )}
                    </div>

                    {/* Matched medicines preview */}
                    {matchCount > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {storeMatch.matchedItems.slice(0, 4).map((item) => (
                          <span
                            key={item._id}
                            className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-100"
                          >
                            <Package className="w-2.5 h-2.5" />
                            {item.medicineName}
                          </span>
                        ))}
                        {matchCount > 4 && (
                          <span className="text-xs text-gray-400">
                            +{matchCount - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress bar */}
                    {totalMeds > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>
                            {matchCount}/{totalMeds} medicines available
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              allMatched ? "bg-green-500" : "bg-amber-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Select button */}
                  <Button
                    className="shrink-0"
                    disabled={isSelecting || !!selectingStoreId}
                    onClick={() => handleSelectStore(storeMatch)}
                  >
                    {isSelecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Select <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note about unmatched */}
      {stores.length > 0 && (
        <p className="text-xs text-center text-gray-400 pb-4">
          Medicines not in stock at your selected store will be sent to nearby vendors
          automatically via our fallback fulfillment system.
        </p>
      )}
    </div>
  );
}
