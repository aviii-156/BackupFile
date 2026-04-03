/**
 * Vendor Service
 * Handles vendor store management, inventory, catalog, and order operations
 */

import { apiClient } from "@/lib/api-client";
import type { ApiResponse, Vendor, VendorInventory, Order } from "@/types/api-types";

const STORE_BASE = "/api/store";
const VENDOR_BASE = "/api/vendor";
const CATALOG_BASE = "/api/catalog";

export interface InventoryItem {
  _id: string;
  medicineName: string;
  genericName: string;
  composition: string;
  category: string;
  form: string;
  manufacturer: string;
  mrp: number;
  vendorPrice: number;
  discount: number;
  stock: number;
  unit: string;
  batchNumber?: string;
  expiryDate: string;
  manufacturingDate?: string;
  lowStockThreshold: number;
  isAvailable: boolean;
  isLowStock: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  catalogProductId?: number;
  createdAt: string;
}

export interface CatalogItem {
  product_id: number;
  brand_name: string;
  primary_ingredient: string;
  manufacturer: string;
  price: number;
  dosage_form: string;
  packaging: string;
  pack_unit: string;
  pack_size: number;
  therapeutic_class: string;
  composition_normalized: string;
}

export interface InventoryStats {
  total: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  totalValue: number;
}

export const vendorService = {
  // ── Store Profile ─────────────────────────────────────────────────────────────
  async getMyStore(): Promise<ApiResponse<{ vendor: Vendor }>> {
    return apiClient.get(`${VENDOR_BASE}/profile`);
  },

  async updateStoreProfile(data: Record<string, any>): Promise<ApiResponse<{ vendor: Vendor }>> {
    return apiClient.put(`${VENDOR_BASE}/profile`, data);
  },

  // ── Inventory ─────────────────────────────────────────────────────────────────
  async getMyInventory(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<ApiResponse<{ inventory: InventoryItem[]; total: number; totalPages: number }>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.category && params.category !== "all") qs.set("category", params.category);
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    return apiClient.get(`${VENDOR_BASE}/inventory?${qs}`);
  },

  async getInventoryStats(): Promise<ApiResponse<{ stats: InventoryStats }>> {
    return apiClient.get(`${VENDOR_BASE}/inventory/stats`);
  },

  async updateInventoryItem(
    itemId: string,
    data: Partial<InventoryItem>
  ): Promise<ApiResponse<{ item: InventoryItem }>> {
    return apiClient.put(`${VENDOR_BASE}/inventory/${itemId}`, data);
  },

  async deleteInventoryItem(itemId: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.delete(`${VENDOR_BASE}/inventory/${itemId}`);
  },

  // ── Catalog search + add ───────────────────────────────────────────────────────
  async searchCatalog(
    q: string,
    page = 1
  ): Promise<ApiResponse<{ results: CatalogItem[]; pagination: any }>> {
    return apiClient.get(
      `${CATALOG_BASE}/search?q=${encodeURIComponent(q)}&page=${page}&limit=15`
    );
  },

  async addFromCatalog(
    productId: number,
    data: {
      mrp: number;
      vendorPrice: number;
      discount?: number;
      stock: number;
      unit?: string;
      batchNumber?: string;
      expiryDate: string;
      lowStockThreshold?: number;
    }
  ): Promise<ApiResponse<{ inventory: InventoryItem }>> {
    return apiClient.post(`${CATALOG_BASE}/${productId}/add-to-inventory`, data);
  },

  // ── Orders ────────────────────────────────────────────────────────────────────
  async getMyOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ orders: Order[]; pagination: any }>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiClient.get(`${VENDOR_BASE}/orders?${qs}`);
  },

  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string
  ): Promise<ApiResponse<Order>> {
    return apiClient.put(`${VENDOR_BASE}/orders/${orderId}/status`, { status, note });
  },

  async acceptOrder(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.post(`${VENDOR_BASE}/orders/${orderId}/accept`, {});
  },

  async rejectOrder(orderId: string, reason: string): Promise<ApiResponse<Order>> {
    return apiClient.post(`${VENDOR_BASE}/orders/${orderId}/reject`, { reason });
  },

  // ── Public Store Info (used by patients) ──────────────────────────────────────
  async getStoreById(storeId: string): Promise<ApiResponse<Vendor>> {
    return apiClient.get(`${STORE_BASE}/${storeId}`);
  },

  async getStoreInventory(storeId: string): Promise<ApiResponse<VendorInventory[]>> {
    return apiClient.get(`${STORE_BASE}/${storeId}/inventory`);
  },

  async getNearbyStores(
    latitude: number,
    longitude: number,
    radius = 5
  ): Promise<ApiResponse<Vendor[]>> {
    return apiClient.get(
      `${STORE_BASE}/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
    );
  },

  async comparePrices(
    medicineId: string,
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<Array<{ vendor: Vendor; inventory: VendorInventory; distance: number }>>> {
    return apiClient.get(
      `${STORE_BASE}/compare?medicineId=${medicineId}&latitude=${latitude}&longitude=${longitude}`
    );
  },
};
