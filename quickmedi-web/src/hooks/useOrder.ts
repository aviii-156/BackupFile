/**
 * useOrder – manages order history, single order, and tracking
 */
import { useState, useCallback } from "react";
import { orderService } from "@/services/order.service";
import type { Order } from "@/types/api-types";

interface UseOrderReturn {
  orders: Order[];
  currentOrder: Order | null;
  tracking: any | null;
  isLoading: boolean;
  error: string | null;
  fetchOrderHistory: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<void>;
  trackOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  rateOrder: (orderId: string, stars: number, review?: string) => Promise<void>;
  createOrder: (data: Parameters<typeof orderService.createOrder>[0]) => Promise<Order | null>;
}

export function useOrder(): UseOrderReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderHistory = useCallback(async (params?: { page?: number; limit?: number; status?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.status) qs.set("status", params.status);
      const res = await fetch(`/api/order/history?${qs}`, { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } });
      const data = await res.json();
      if (data.success) setOrders(data.data ?? []);
      else setError(data.message ?? "Failed to load orders");
    } catch (e: any) {
      // Fall back to service method
      try {
        const res = await orderService.getOrderHistory();
        if (res.success) setOrders(res.data ?? []);
        else setError(res.message ?? "Failed to load orders");
      } catch (e2: any) {
        setError(e2.message ?? "Failed to load orders");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrderById(orderId);
      if (res.success) setCurrentOrder(res.data ?? null);
      else setError(res.message ?? "Failed to load order");
    } catch (e: any) {
      setError(e.message ?? "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const trackOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.trackOrder(orderId);
      if (res.success) {
        setCurrentOrder(res.data?.order ?? null);
        setTracking(res.data?.tracking ?? null);
      } else {
        setError(res.message ?? "Failed to track order");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to track order");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.cancelOrder(orderId, reason);
      if (res.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? (res.data ?? o) : o)));
        if (currentOrder?._id === orderId) setCurrentOrder(res.data ?? null);
      } else {
        setError(res.message ?? "Failed to cancel order");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to cancel order");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrder]);

  const rateOrder = useCallback(async (orderId: string, stars: number, review?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.rateOrder(orderId, stars, review);
      if (res.success) {
        setOrders((prev) => prev.map((o) => (o._id === orderId ? (res.data ?? o) : o)));
      } else {
        setError(res.message ?? "Failed to rate order");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to rate order");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (data: Parameters<typeof orderService.createOrder>[0]): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderService.createOrder(data);
      if (res.success) {
        setCurrentOrder(res.data ?? null);
        return res.data ?? null;
      } else {
        setError(res.message ?? "Failed to create order");
        return null;
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to create order");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { orders, currentOrder, tracking, isLoading, error, fetchOrderHistory, fetchOrderById, trackOrder, cancelOrder, rateOrder, createOrder };
}
