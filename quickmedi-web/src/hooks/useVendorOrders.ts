/**
 * useVendorOrders – hook for vendor-side order management
 */
import { useState, useCallback } from "react";
import { vendorService } from "@/services/vendor.service";
import type { Order } from "@/types/api-types";

interface VendorOrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
}

export function useVendorOrders() {
  const [state, setState] = useState<VendorOrdersState>({
    orders: [],
    isLoading: false,
    error: null,
  });

  const setLoading = () => setState((prev) => ({ ...prev, isLoading: true, error: null }));
  const setError = (error: string) => setState((prev) => ({ ...prev, isLoading: false, error }));

  const fetchOrders = useCallback(async (params?: { status?: string; page?: number; limit?: number }) => {
    setLoading();
    try {
      const res = await vendorService.getMyOrders(params);
      if (res.success && res.data) {
        const orders = Array.isArray(res.data) ? res.data : (res.data as any).orders ?? [];
        setState((prev) => ({ ...prev, orders, isLoading: false }));
      } else {
        setError((res as any).message ?? "Failed to load orders");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load orders");
    }
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      const res = await vendorService.acceptOrder(orderId);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o._id === orderId ? res.data! : o)),
        }));
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to accept order");
    }
  }, []);

  const rejectOrder = useCallback(async (orderId: string, reason: string) => {
    try {
      const res = await vendorService.rejectOrder(orderId, reason);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o._id === orderId ? res.data! : o)),
        }));
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to reject order");
    }
  }, []);

  const updateStatus = useCallback(async (orderId: string, status: string, note?: string) => {
    try {
      const res = await vendorService.updateOrderStatus(orderId, status, note);
      if (res.success && res.data) {
        setState((prev) => ({
          ...prev,
          orders: prev.orders.map((o) => (o._id === orderId ? res.data! : o)),
        }));
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to update order status");
    }
  }, []);

  return { ...state, fetchOrders, acceptOrder, rejectOrder, updateStatus };
}
