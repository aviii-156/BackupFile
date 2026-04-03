/**
 * useNearbyStores – fetch stores near a geolocation
 */
import { useState, useCallback } from "react";
import { storeService } from "@/services/store.service";
import type { Vendor } from "@/types/api-types";

interface UseNearbyStoresReturn {
  stores: Vendor[];
  isLoading: boolean;
  error: string | null;
  fetchNearbyStores: (lat: number, lng: number, radius?: number) => Promise<void>;
  comparePrices: (medicineId: string, lat: number, lng: number) => Promise<Array<{ vendor: Vendor; inventory: any; distance: number }>>;
}

export function useNearbyStores(): UseNearbyStoresReturn {
  const [stores, setStores] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyStores = useCallback(async (lat: number, lng: number, radius = 5) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await storeService.getNearbyStores(lat, lng, radius);
      if (res.success) setStores(res.data ?? []);
      else setError(res.message ?? "Failed to load nearby stores");
    } catch (e: any) {
      setError(e.message ?? "Failed to load nearby stores");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const comparePrices = useCallback(async (medicineId: string, lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await storeService.comparePrices(medicineId, lat, lng);
      return res.data ?? [];
    } catch (e: any) {
      setError(e.message ?? "Failed to compare prices");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { stores, isLoading, error, fetchNearbyStores, comparePrices };
}
