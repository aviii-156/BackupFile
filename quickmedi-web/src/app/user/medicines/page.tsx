"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search,
  Pill,
  MapPin,
  Loader2,
  Leaf,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import { useMedicineCart } from "@/context/MedicineCartContext";
import type { WishlistItem } from "@/context/MedicineCartContext";
import { MedicineCard } from "@/components/shared/MedicineCard";
import type { MedicineData } from "@/components/shared/MedicineCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortTab = "All" | "Generic" | "Non-Generic" | "Nearby";

interface NearbyVendorEntry {
  inventoryId: string;
  storeId: string;
  storeName: string;
  vendorId: string;
  vendorPrice: number;
  mrp: number;
  discount: number;
  stock: number;
  unit: string;
}

interface UnifiedMedicine {
  id: string;
  medicineName: string;
  genericName: string;
  composition: string;
  manufacturer: string;
  form: string;
  category: string;
  mrp: number;
  isGeneric: boolean;
  requiresPrescription: boolean;
  source: "vendor" | "medicine" | "ai";
  hasNearbyStock: boolean;
  nearbyVendors: NearbyVendorEntry[];
  medicineId?: string;
  unit?: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MedicinesPage() {
  const {
    addToWishlist,
    getWishlistQuantity,
    updateWishlistQuantity,
    isInWishlist,
  } = useMedicineCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortTab, setSortTab] = useState<SortTab>("All");
  const [medicines, setMedicines] = useState<UnifiedMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  const latRef = useRef<number | null>(null);
  const lonRef = useRef<number | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 40;
  const hasMore = medicines.length < total;

  // -------------------------------------------------------------------------
  // Geolocation — runs once on mount, stores lat/lon in refs
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLocationReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latRef.current = pos.coords.latitude;
        lonRef.current = pos.coords.longitude;
        setLocationReady(true);
      },
      () => {
        setLocationError("Location access denied — Nearby filter unavailable");
        setLocationReady(true);
      },
      { timeout: 8000 },
    );
  }, []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const filterMap: Record<SortTab, string> = {
    All: "all",
    Generic: "generic",
    "Non-Generic": "non-generic",
    Nearby: "nearby",
  };

  function buildUrl(q: string, tab: SortTab, pageNum: number) {
    const filter = filterMap[tab];
    let url = `${API_CONFIG.API.MEDICINE.BROWSE}?q=${encodeURIComponent(q)}&filter=${filter}&page=${pageNum}&limit=${LIMIT}`;
    if (filter === "nearby" && latRef.current && lonRef.current) {
      url += `&lat=${latRef.current}&lon=${lonRef.current}`;
    }
    return { url, filter };
  }

  function toUnified(m: any): UnifiedMedicine {
    return {
      id:
        m.inventoryId ||
        m.medicineId ||
        (m.catalogProductId
          ? `cat_${m.catalogProductId}`
          : `key_${(m.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}`),
      medicineName: m.name || "",
      genericName: m.genericName || "",
      composition: m.composition || "",
      manufacturer: m.manufacturer || "",
      form: m.form || "",
      category: m.category || "other",
      mrp: m.mrp || 0,
      isGeneric: !!m.generic,
      requiresPrescription: !!m.requiresPrescription,
      source:
        m.source === "vendorInventory"
          ? "vendor"
          : m.source === "generic"
            ? "medicine"
            : "ai",
      hasNearbyStock: m.source === "vendorInventory",
      nearbyVendors: m.inventoryId
        ? [
            {
              inventoryId: m.inventoryId,
              storeId: m.availableVendorId || "",
              storeName: m.storeName || "Store",
              vendorId: m.availableVendorId || "",
              vendorPrice: m.price ?? m.mrp ?? 0,
              mrp: m.mrp ?? 0,
              discount: m.discount ?? 0,
              stock:
                m.stockStatus === "in_stock"
                  ? 100
                  : m.stockStatus === "low_stock"
                    ? 5
                    : 0,
              unit: m.unit || "strip",
            },
          ]
        : [],
      medicineId: m.medicineId || undefined,
      unit: m.unit || "strip",
    };
  }

  // -------------------------------------------------------------------------
  // Initial / reset search (page 1) — replaces the list
  // -------------------------------------------------------------------------
  const doSearch = useCallback(async (q: string, tab: SortTab) => {
    const { url, filter } = buildUrl(q, tab, 1);
    if (filter === "nearby" && (!latRef.current || !lonRef.current)) {
      setMedicines([]);
      setTotal(0);
      setPage(1);
      if (!locationError)
        setLocationError("Location access denied — Nearby filter unavailable");
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>(url);
      const meds: any[] = res.data?.medicines ?? [];
      setMedicines(meds.map(toUnified));
      setTotal(res.data?.total ?? meds.length);
      setPage(1);
    } catch {
      // keep existing list on error
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Navigate to an arbitrary page — replaces the list
  // -------------------------------------------------------------------------
  const goToPage = useCallback(
    async (targetPage: number) => {
      const { url, filter } = buildUrl(searchQuery, sortTab, targetPage);
      if (filter === "nearby" && (!latRef.current || !lonRef.current)) return;
      setIsLoadingMore(true);
      try {
        const res = await apiClient.get<any>(url);
        const meds: any[] = res.data?.medicines ?? [];
        setMedicines(meds.map(toUnified));
        setTotal(res.data?.total ?? 0);
        setPage(targetPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        // silently ignore
      } finally {
        setIsLoadingMore(false);
      }
    },
    [searchQuery, sortTab],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // Primary search: triggers immediately on mount + when searchQuery/sortTab changes
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(
      () => doSearch(searchQuery, sortTab),
      350,
    );
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, sortTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fire when location arrives and user is already on Nearby tab
  useEffect(() => {
    if (locationReady && sortTab === "Nearby") {
      doSearch(searchQuery, sortTab);
    }
  }, [locationReady]); // eslint-disable-line react-hooks/exhaustine-deps

  // -------------------------------------------------------------------------
  // Add to wishlist
  // -------------------------------------------------------------------------
  const handleAdd = (m: UnifiedMedicine) => {
    const bestVendor = m.nearbyVendors[0];
    const itemBase: Omit<WishlistItem, "quantity"> = {
      id: m.id,
      medicineName: m.medicineName,
      genericName: m.genericName,
      mrp: m.mrp,
      unit: m.unit ?? "units",
      source: m.source,
      isGeneric: m.isGeneric,
      medicineId: m.medicineId,
      manufacturer: m.manufacturer,
      form: m.form,
      category: m.category,
      composition: m.composition,
    };
    if (bestVendor) {
      Object.assign(itemBase, {
        inventoryId: bestVendor.inventoryId,
        vendorId: bestVendor.vendorId,
        vendorPrice: bestVendor.vendorPrice,
        storeId: bestVendor.storeId,
        storeName: bestVendor.storeName,
        maxStock: bestVendor.stock,
      });
    }
    addToWishlist(itemBase);
  };

  // -------------------------------------------------------------------------
  // Map UnifiedMedicine → MedicineData for MedicineCard
  // -------------------------------------------------------------------------
  function toMedicineData(m: UnifiedMedicine): MedicineData {
    const bestVendor = m.nearbyVendors[0];
    const displayPrice = bestVendor ? bestVendor.vendorPrice : m.mrp;
    const originalPrice = bestVendor ? bestVendor.mrp : m.mrp;
    const discountPct =
      bestVendor?.discount ||
      (originalPrice > displayPrice
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0);
    return {
      id: m.id,
      name: m.medicineName,
      genericName: m.genericName,
      manufacturer: m.manufacturer,
      form: m.form,
      price: displayPrice > 0 ? displayPrice : m.mrp,
      originalPrice: originalPrice !== displayPrice ? originalPrice : undefined,
      discount: discountPct,
      inStock: true,
      prescriptionRequired: m.requiresPrescription,
      isGeneric: m.isGeneric,
      hasNearbyStock: m.hasNearbyStock,
      nearbyStoreCount: m.nearbyVendors.length,
      source: m.source,
    };
  }

  const tabs: { label: string; value: SortTab }[] = [
    { label: "All Medicines", value: "All" },
    { label: "Generic", value: "Generic" },
    { label: "Non-Generic", value: "Non-Generic" },
    { label: "Nearby (10km)", value: "Nearby" },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Medicines</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Searching..."
              : total > 0
                ? `Showing ${medicines.length} of ${total} result${total !== 1 ? "s" : ""}`
                : `${medicines.length} result${medicines.length !== 1 ? "s" : ""}`}
            {locationError && (
              <span className="ml-2 text-amber-600">
                {" "}
                &middot; {locationError}
              </span>
            )}
          </p>
        </div>
        <div className="relative flex items-center w-1/2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="search"
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            className="pl-9 h-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={sortTab === tab.value ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setSortTab(tab.value)}
          >
            {tab.value === "Generic" && <Leaf className="w-3.5 h-3.5 mr-1.5" />}
            {tab.value === "Nearby" && (
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
            )}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Body */}
      {isLoading && medicines.length === 0 ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading medicines...</span>
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-white rounded-md p-12 border border-gray-200 text-center">
          <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No medicines found
          </h3>
          <p className="text-gray-500 text-sm">
            Try a different search term or select the &ldquo;All
            Medicines&rdquo; tab
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {medicines.map((m) => {
            const qty = getWishlistQuantity(m.id);
            return (
              <MedicineCard
                key={m.id}
                medicine={toMedicineData(m)}
                quantity={qty}
                onAddToCart={() => handleAdd(m)}
                onIncrement={() => updateWishlistQuantity(m.id, qty + 1)}
                onDecrement={() => updateWishlistQuantity(m.id, qty - 1)}
                className={
                  isInWishlist(m.id)
                    ? "ring-1 ring-primary/20 border-primary/30"
                    : ""
                }
              />
            );
          })}
        </div>
      )}

      {/* Pagination bar */}
      {total > LIMIT && (
        <div className="flex items-center justify-between gap-4 py-3 px-1">
          {/* Left: count */}
          <p className="text-sm text-muted-foreground">
            {isLoadingMore ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
              </span>
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-900">
                  {(page - 1) * LIMIT + 1}&ndash;{Math.min(page * LIMIT, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-900">
                  {total.toLocaleString()}
                </span>{" "}
                medicines
              </>
            )}
          </p>

          {/* Right: Prev / Next */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 px-3"
              disabled={page <= 1 || isLoadingMore}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground px-1">
              Page {page} of {Math.ceil(total / LIMIT)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 px-3"
              disabled={!hasMore || isLoadingMore}
              onClick={() => goToPage(page + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
