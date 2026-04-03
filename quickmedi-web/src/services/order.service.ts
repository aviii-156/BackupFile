/**
 * Order Service
 * Handles order creation and management
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse, Order, CreateOrderRequest } from '@/types/api-types';

export const orderService = {
  /**
   * Create new order
   */
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return apiClient.post(API_CONFIG.API.ORDER.CREATE, data);
  },

  /**
   * Get order history
   */
  async getOrderHistory(): Promise<ApiResponse<Order[]>> {
    return apiClient.get(API_CONFIG.API.ORDER.HISTORY);
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.get(API_CONFIG.API.ORDER.GET_BY_ID(orderId));
  },

  /**
   * Track order
   */
  async trackOrder(orderId: string): Promise<ApiResponse<{
    order: Order;
    tracking: {
      currentStatus: string;
      estimatedDelivery: string;
      statusHistory: Array<{
        status: string;
        timestamp: Date;
        note?: string;
      }>;
    };
  }>> {
    return apiClient.get(API_CONFIG.API.ORDER.TRACK(orderId));
  },

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<Order>> {
    return apiClient.post(API_CONFIG.API.ORDER.CANCEL(orderId), { reason });
  },

  /**
   * Rate order
   */
  async rateOrder(orderId: string, stars: number, review?: string): Promise<ApiResponse<Order>> {
    return apiClient.post(API_CONFIG.API.ORDER.RATE(orderId), { stars, review });
  },

  /**
   * Create payment intent
   */
  async createPaymentIntent(orderId: string, amount: number): Promise<ApiResponse<{
    clientSecret: string;
    paymentIntentId: string;
  }>> {
    return apiClient.post(API_CONFIG.API.ORDER.PAYMENT_INTENT, {
      orderId,
      amount,
    });
  },

  /**
   * Confirm payment
   */
  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<{
    success: boolean;
    order: Order;
  }>> {
    return apiClient.post(API_CONFIG.API.ORDER.PAYMENT_CONFIRM, {
      paymentIntentId,
    });
  },
};
