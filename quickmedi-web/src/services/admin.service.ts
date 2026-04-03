/**
 * Admin Service
 * Handles admin dashboard and management operations
 */

import { apiClient } from "@/lib/api-client";
import type { ApiResponse, Vendor, User, Order, PlatformStats } from "@/types/api-types";

const BASE = "/api/admin";

export const adminService = {
  // ── Dashboard ────────────────────────────────────────────────────────────────
  async getDashboard(): Promise<ApiResponse<{
    stats: PlatformStats["metrics"];
    recentActivity: any[];
    pendingVendors: number;
  }>> {
    return apiClient.get(`${BASE}/dashboard`);
  },

  // ── Vendors ──────────────────────────────────────────────────────────────────
  async getAllVendors(params?: {
    status?: "all" | "pending" | "approved" | "rejected";
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ vendors: Vendor[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/vendors?${qs}`);
  },

  async getPendingVendors(): Promise<ApiResponse<Vendor[]>> {
    return apiClient.get(`${BASE}/vendors/pending`);
  },

  async approveVendor(vendorId: string, approvalNote?: string): Promise<ApiResponse<Vendor>> {
    return apiClient.put(`${BASE}/vendors/${vendorId}/approve`, { approvalNote });
  },

  async rejectVendor(vendorId: string, reason: string): Promise<ApiResponse<Vendor>> {
    return apiClient.put(`${BASE}/vendors/${vendorId}/reject`, { reason });
  },

  async updateVendorStatus(vendorId: string, isActive: boolean): Promise<ApiResponse<Vendor>> {
    return apiClient.put(`${BASE}/vendors/${vendorId}/status`, { isActive });
  },

  // ── Users ────────────────────────────────────────────────────────────────────
  async getAllUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/users?${qs}`);
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<User>> {
    return apiClient.put(`${BASE}/users/${userId}/status`, { isActive });
  },

  // ── Orders ───────────────────────────────────────────────────────────────────
  async getAllOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ orders: Order[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/orders?${qs}`);
  },

  // ── Medicines (Catalog) ──────────────────────────────────────────────────────
  async getAllMedicines(params?: {
    search?: string;
    form?: string;
    therapeutic_class?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ medicines: any[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.form) qs.set("form", params.form);
    if (params?.therapeutic_class) qs.set("therapeutic_class", params.therapeutic_class);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/medicines?${qs}`);
  },

  // ── Inventory (cross-referenced) ─────────────────────────────────────────────
  async getAllInventoryMedicines(params?: {
    search?: string;
    state?: string;
    vendorName?: string;
    available?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ medicines: any[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.state) qs.set("state", params.state);
    if (params?.vendorName) qs.set("vendorName", params.vendorName);
    if (params?.available !== undefined) qs.set("available", String(params.available));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/inventory?${qs}`);
  },

  async getMedicineById(productId: number): Promise<ApiResponse<{ medicine: any }>> {
    return apiClient.get(`${BASE}/medicines/${productId}`);
  },

  async updateMedicine(productId: number, data: Record<string, unknown>): Promise<ApiResponse<{ medicine: any }>> {
    return apiClient.put(`${BASE}/medicines/${productId}`, data);
  },

  async deleteMedicine(productId: number): Promise<ApiResponse<null>> {
    return apiClient.delete(`${BASE}/medicines/${productId}`);
  },

  // ── Emergencies ──────────────────────────────────────────────────────────────
  async getAllEmergencies(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ emergencies: any[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/emergencies?${qs}`);
  },

  // ── Subscriptions ────────────────────────────────────────────────────────────
  async getAllSubscriptions(params?: {
    status?: string;
    plan?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ subscriptions: any[]; pagination: any; summary: { totalRevenue: number } }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.plan) qs.set("plan", params.plan);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${BASE}/subscriptions?${qs}`);
  },
  // ── Savings Analytics ────────────────────────────────────────────────────────
  async getSavingsStats(): Promise<ApiResponse<{
    overview: {
      totalSaved: number;
      usersBenefited: number;
      avgSavingPerUser: number;
      thisMonthSaved: number;
      totalDeliveredOrders: number;
    };
    monthlyTrend: { _id: { year: number; month: number }; saved: number }[];
    recentSavings: any[];
  }>> {
    return apiClient.get(`${BASE}/savings`);
  },
};
