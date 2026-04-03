"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Store,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Search,
  Star,
  ChevronDown,
  Heart,
  Truck,
  AlertCircle,
  Loader2,
  Layers,
  LocateFixed,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";
import { authService } from "@/services/auth.service";
import type { MapStore } from "@/components/map/NearbyMap";

// ── Dynamic (SSR-safe) Leaflet map ──────────────────────────────────────────
const NearbyMap = dynamic(() => import("@/components/map/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
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
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: { type: "Point"; coordinates: [number, number] };
  operatingHours: Record<string, OperatingDay>;
  deliveryAvailable: boolean;
  deliveryRadius: number;
  minimumOrderAmount: number;
  deliveryCharge: number;
  acceptsEmergency: boolean;
  isActive: boolean;
  rating: number;
  totalRatings: number;
  distance: number;
  deliveryTime: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function isOpenNow(hours: Record<string, OperatingDay> | undefined): boolean {
  if (!hours) return false;
  const today = DAY_NAMES[new Date().getDay()];
  const h = hours[today];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const cur = new Date().getHours() * 60 + new Date().getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

function todayLabel(hours: Record<string, OperatingDay> | undefined): string {
  if (!hours) return "Hours unavailable";
  const today = DAY_NAMES[new Date().getDay()];
  const h = hours[today];
  if (!h) return "Hours unavailable";
  if (h.isClosed) return "Closed today";
  return `${h.open} – ${h.close}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    const city =
      data.address?.city || data.address?.town || data.address?.village || "";
    const state = data.address?.state || "";
    return [city, state].filter(Boolean).join(", ") || "Your location";
  } catch {
    return "Your location";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NearbyStoresPage() {
  // Location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // "db" = saved address, "gps" = device GPS, "manual" = typed search
  const [locationSource, setLocationSource] = useState<
    "db" | "gps" | "manual" | null
  >(null);
  const [dbCoords, setDbCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  // Stores
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [openOnly, setOpenOnly] = useState(false);

  // Map
  const [mapLayer, setMapLayer] = useState<"road" | "satellite">("road");
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Misc
  const [favorites, setFavorites] = useState<string[]>([]);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Load location from DB on mount (fast path: localStorage → API fallback) ──
  useEffect(() => {
    const applyCoords = (lat: number, lng: number, label: string) => {
      setUserLat(lat);
      setUserLng(lng);
      setLocationLabel(label);
      setLocationInput(label);
      setLocationSource("db");
      setDbCoords({ lat, lng, label });
    };

    // 1. Try localStorage first — zero-latency
    try {
      const storedUser = authService.getCurrentUser() as any;
      if (storedUser?.savedAddresses?.length > 0) {
        const addr =
          storedUser.savedAddresses.find((a: any) => a.isDefault) ||
          storedUser.savedAddresses[0];
        if (addr?.location?.coordinates?.length === 2) {
          const [lng, lat] = addr.location.coordinates; // GeoJSON = [lng, lat]
          const label =
            [addr.city, addr.state].filter(Boolean).join(", ") ||
            "Saved location";
          applyCoords(lat, lng, label);
          return; // done — no network call needed
        }
      }
    } catch {
      // localStorage parse error — fall through to API
    }

    // 2. Fallback: fetch fresh profile from API
    (async () => {
      try {
        const res = await apiClient.get<any>(API_CONFIG.API.PATIENT.PROFILE);
        const savedAddresses = res.data?.user?.savedAddresses;
        if (savedAddresses?.length > 0) {
          const addr =
            savedAddresses.find((a: any) => a.isDefault) || savedAddresses[0];
          if (addr?.location?.coordinates?.length === 2) {
            const [lng, lat] = addr.location.coordinates;
            const label =
              [addr.city, addr.state].filter(Boolean).join(", ") ||
              "Saved location";
            applyCoords(lat, lng, label);
            return;
          }
        }
      } catch {
        // profile fetch failed — show manual prompt
      }
      // No saved address found — leave map empty and show prompt
    })();
  }, []);

  // ── GPS: take current device location ────────────────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        const label = await reverseGeocode(lat, lng);
        setLocationLabel(label);
        setLocationInput(label);
        setLocationSource("gps");
        setLocationLoading(false);
      },
      () => {
        setLocationError("Location access denied. Enter your city manually.");
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, []);

  // ── Revert to saved DB address ────────────────────────────────────────────
  const useSavedLocation = useCallback(() => {
    if (!dbCoords) return;
    setUserLat(dbCoords.lat);
    setUserLng(dbCoords.lng);
    setLocationLabel(dbCoords.label);
    setLocationInput(dbCoords.label);
    setLocationSource("db");
    setLocationError(null);
  }, [dbCoords]);

  // ── Fetch stores ─────────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    if (userLat === null || userLng === null) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiClient.get<any>(
        `${API_CONFIG.API.STORE.NEARBY}?latitude=${userLat}&longitude=${userLng}&radius=${radiusKm}`,
      );
      if (res.success) {
        setStores(res.data?.stores ?? []);
      } else {
        setFetchError((res as any).message || "Failed to load stores.");
      }
    } catch (e: any) {
      setFetchError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng, radiusKm]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // ── Nominatim address search ─────────────────────────────────────────────
  const handleAddressSearch = async () => {
    if (!locationInput.trim()) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      if (data.length > 0) {
        setUserLat(parseFloat(data[0].lat));
        setUserLng(parseFloat(data[0].lon));
        setLocationLabel(data[0].display_name.split(",").slice(0, 2).join(","));
      } else {
        setLocationError("Address not found. Try a different search.");
      }
    } catch {
      setLocationError("Address lookup failed.");
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Filtered / sorted stores ─────────────────────────────────────────────
  const visibleStores = useMemo(() => {
    let list = stores.filter((s) => {
      if (openOnly && !isOpenNow(s.operatingHours)) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase();
        return (
          s.storeName.toLowerCase().includes(q) ||
          s.address.city.toLowerCase().includes(q) ||
          s.address.addressLine1.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sortBy === "distance") list.sort((a, b) => a.distance - b.distance);
    else list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
  }, [stores, keyword, openOnly, sortBy]);

  const mapStores: MapStore[] = useMemo(
    () =>
      visibleStores.map((s) => ({
        _id: s._id,
        storeName: s.storeName,
        phone: s.phone,
        address: s.address,
        location: s.location,
        distance: s.distance,
        isOpen: isOpenNow(s.operatingHours),
        deliveryAvailable: s.deliveryAvailable,
        averageRating: s.rating,
      })),
    [visibleStores],
  );

  // Scroll card into view when selected from map
  useEffect(() => {
    if (selectedStore && cardRefs.current[selectedStore]) {
      cardRefs.current[selectedStore]!.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedStore]);

  const toggleFavorite = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  return (
    <div className="space-y-0">
      {/* ── Search Header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-border px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            {/* Location input */}
            <div className="md:col-span-5">
              <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                MY LOCATION
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter a city, area, or PIN code — or use GPS.
              </p>
              <div className="flex gap-2">
                <Input
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
                  placeholder="City / area / pincode..."
                  className="h-12 border-2 flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-12 px-3 shrink-0"
                  title="Detect my location"
                  onClick={detectLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-5 h-5" />
                  )}
                </Button>
              </div>
              {locationError && (
                <p className="text-xs text-red-500 mt-1">{locationError}</p>
              )}
            </div>

            {/* Keyword */}
            <div className="md:col-span-4">
              <label className="block text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                NAME OR KEYWORD (optional)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Search by store name or area.
              </p>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., MedPlus, Apollo..."
                className="h-12 border-2"
              />
            </div>

            {/* Search button */}
            <div className="md:col-span-3 flex items-end">
              <Button
                className="w-full h-12 font-semibold gap-2"
                onClick={handleAddressSearch}
                disabled={locationLoading || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> Search Stores
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Location source indicator + inline toggle */}
          <div className="flex items-center flex-wrap gap-3">
            {locationLabel && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Showing stores near{" "}
                <span className="font-medium text-foreground ml-1">
                  {locationLabel}
                </span>
                {locationSource === "db" && (
                  <span className="ml-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    Saved address
                  </span>
                )}
                {locationSource === "gps" && (
                  <span className="ml-1.5 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    GPS
                  </span>
                )}
              </p>
            )}
            {locationSource === "db" && (
              <button
                onClick={detectLocation}
                disabled={locationLoading}
                className="text-xs flex items-center gap-1 text-primary hover:underline font-medium disabled:opacity-50"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                Use my current location instead
              </button>
            )}
            {locationSource !== "db" && dbCoords && (
              <button
                onClick={useSavedLocation}
                className="text-xs flex items-center gap-1 text-blue-600 hover:underline font-medium"
              >
                <MapPin className="w-3.5 h-3.5" />
                Back to saved address
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-muted/30 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            Filter by:
          </span>

          {/* Radius */}
          <div className="relative">
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="h-9 pl-3 pr-9 bg-gray-700 text-white rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
            >
              <option value={5}>Radius: 5 km</option>
              <option value={10}>Radius: 10 km</option>
              <option value={15}>Radius: 15 km</option>
              <option value={25}>Radius: 25 km</option>
              <option value={50}>Radius: 50 km</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
          </div>

          {/* Open Now toggle */}
          <button
            onClick={() => setOpenOnly((v) => !v)}
            className={`h-9 px-4 rounded-md text-sm font-medium border transition-colors ${
              openOnly
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-foreground border-border hover:bg-accent"
            }`}
          >
            Open Now
          </button>

          {/* Map layer toggle */}
          <button
            onClick={() =>
              setMapLayer((l) => (l === "road" ? "satellite" : "road"))
            }
            className="h-9 px-4 rounded-md text-sm font-medium border bg-white border-border hover:bg-accent flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            {mapLayer === "road" ? "Road Map" : "Satellite"}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchStores}
            disabled={loading || userLat === null}
            className="h-9 px-3 rounded-md border border-border bg-white hover:bg-accent text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Count + Sort Bar ───────────────────────────────────────────── */}
      <div className="bg-white border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding
                stores...
              </span>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {visibleStores.length}
                </span>{" "}
                pharmacies within{" "}
                <span className="font-semibold text-foreground">
                  {radiusKm} km
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "distance" | "rating")
                }
                className="h-9 pl-3 pr-8 border border-border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium text-primary bg-white"
              >
                <option value="distance">Nearest First</option>
                <option value="rating">Highest Rated</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Split Layout ────────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-340px)] min-h-130">
        {/* Left – scrollable store list */}
        <div
          className="w-full lg:w-1/2 overflow-y-auto bg-white"
          style={{ scrollbarWidth: "none" }}
        >
          {/* No location yet */}
          {userLat === null && !locationLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-center px-6">
              <LocateFixed className="w-12 h-12 text-primary mb-3" />
              <h3 className="text-base font-semibold mb-1">
                Allow location access
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We need your location to find nearby pharmacies.
              </p>
              <Button onClick={detectLocation} className="gap-2">
                <LocateFixed className="w-4 h-4" /> Detect My Location
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && userLat !== null && (
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse border-b pb-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {fetchError && (
            <div className="p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{fetchError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchStores}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty */}
          {!loading &&
            !fetchError &&
            userLat !== null &&
            visibleStores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <Store className="w-14 h-14 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-1">
                  No pharmacies found
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {openOnly
                    ? "No open stores right now. Try turning off the 'Open Now' filter."
                    : "Try increasing the search radius."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpenOnly(false);
                    setRadiusKm(25);
                  }}
                >
                  Expand search
                </Button>
              </div>
            )}

          {/* Store list */}
          {!loading && visibleStores.length > 0 && (
            <div className="p-6 space-y-6">
              {visibleStores.map((store, idx) => {
                const open = isOpenNow(store.operatingHours);
                const isSelected = selectedStore === store._id;
                const isFav = favorites.includes(store._id);
                return (
                  <div
                    key={store._id}
                    ref={(el) => {
                      cardRefs.current[store._id] = el;
                    }}
                    onClick={() => setSelectedStore(store._id)}
                    className={`border-b border-border p-3 last:border-b-0 cursor-pointer transition-colors rounded-lg px-2 -mx-2 ${
                      isSelected ? "bg-primary/5" : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex gap-3 items-start">
                      {/* Index + distance */}
                      <div className="shrink-0 text-center">
                        <div className="w-7 h-7 flex items-center justify-center">
                          <span className="text-2xl font-bold text-foreground">
                            {idx + 1}.
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {store.distance} km
                        </p>
                      </div>

                      {/* Main details + actions */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <Link
                              href={`/user/pharmacy/${store._id}`}
                              className="text-base font-bold text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {store.storeName}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  open
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {open ? "Open Now" : "Closed"}
                              </span>
                              {store.deliveryAvailable && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Truck className="w-3 h-3" /> Delivery
                                </span>
                              )}
                              {store.acceptsEmergency && (
                                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Emergency
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Rating top-right */}
                          {store.rating > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {store.rating.toFixed(1)}
                              {store.totalRatings > 0 && (
                                <span className="text-amber-500 font-normal">
                                  ({store.totalRatings})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Info rows */}
                        <div className="space-y-0.5 text-sm text-muted-foreground mt-2">
                          <p className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {store.address.addressLine1}, {store.address.city}, {store.address.state} {store.address.pincode}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {todayLabel(store.operatingHours)}
                          </p>
                          {/* {store.deliveryAvailable && (
                            <p className="flex items-center gap-1.5 text-xs text-blue-600">
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                              Min. order ₹{store.minimumOrderAmount} · Charge ₹{store.deliveryCharge}
                              {store.deliveryTime && ` · ${store.deliveryTime}`}
                            </p>
                          )} */}
                        </div>

                        {/* Actions row */}
                        <div className="flex gap-2 mt-3">
                          <Link
                            href={`/user/pharmacy/${store._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1"
                          >
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                            >
                              View Store <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-primary border-primary/40 hover:bg-primary/5 gap-1 shrink-0 px-3 font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStore(store._id);
                            }}
                          >
                            <Navigation className="w-3 h-3" /> Map
                          </Button>
                          <a
                            href={`tel:${store.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-green-700 border-green-300 hover:bg-green-50 gap-1 px-3 font-medium"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right – sticky Leaflet map */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <div
            className="sticky top-0 border-l border-border overflow-hidden"
            style={{ height: "calc(100vh - 340px)", minHeight: 520 }}
          >
            {userLat !== null && userLng !== null ? (
              <div className="relative w-full h-full">
                <NearbyMap
                  userLat={userLat}
                  userLng={userLng}
                  stores={mapStores}
                  selectedStore={selectedStore}
                  onSelectStore={setSelectedStore}
                  radiusKm={radiusKm}
                  mapLayer={mapLayer}
                />

                {/* Map overlay controls */}
                <div className="absolute top-3 right-3 z-1000 flex flex-col gap-1.5">
                  <button
                    onClick={() =>
                      setMapLayer((l) => (l === "road" ? "satellite" : "road"))
                    }
                    className="bg-white shadow-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {mapLayer === "road" ? "Satellite" : "Road"}
                  </button>
                  <button
                    onClick={detectLocation}
                    className="bg-white shadow-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50"
                  >
                    <LocateFixed className="w-3.5 h-3.5" /> Re-centre
                  </button>
                </div>

                {/* Store count badge */}
                {!loading && (
                  <div className="absolute bottom-3 left-3 z-1000 bg-white shadow-md rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">
                      {visibleStores.length} store
                      {visibleStores.length !== 1 ? "s" : ""} found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      within {radiusKm} km
                    </p>
                  </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-3 right-3 z-1000 bg-white rounded-lg shadow-md p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-teal-500" />
                    <span className="text-xs text-muted-foreground">Open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-gray-400" />
                    <span className="text-xs text-muted-foreground">
                      Closed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
                    <span className="text-xs text-muted-foreground">You</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-linear-to-br from-blue-50 to-green-50 flex flex-col items-center justify-center text-center p-6">
                <MapPin className="w-14 h-14 text-teal-500 mb-4" />
                <p className="text-base font-semibold text-foreground mb-2">
                  Map will appear here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Allow location access to see pharmacies on the map
                </p>
                <Button
                  onClick={detectLocation}
                  disabled={locationLoading}
                  className="gap-2"
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Detecting...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-4 h-4" /> Enable Location
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
