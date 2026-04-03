"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, TrendingUp, AlertCircle, Bell, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";

type DashboardData = {
  vendor: { storeName: string; ownerName: string; rating: number; isOpenNow: boolean; isActive: boolean; deliveryAvailable: boolean };
  orderStats: { placed: number; confirmed: number; out_for_delivery: number; delivered: number; cancelled: number; rejected: number; total: number };
  inventoryStats: { total: number; lowStock: number; outOfStock: number };
  todayRevenue: number;
  monthRevenue: number;
  recentOrders: { id: string; customer: string; items: number; amount: number; status: string; createdAt: string }[];
  lowStockItems: { id: string; name: string; current: number; minimum: number }[];
};

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  placed: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtRevenue(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function VendorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await apiClient.get<any>(API_CONFIG.API.VENDOR.DASHBOARD);
        if ((res as any).success && (res as any).data) {
          setData((res as any).data);
        }
      } catch {
        // keep null
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const storeName = data?.vendor?.storeName || "Your Store";
  const pendingOrders = (data?.orderStats?.placed ?? 0) + (data?.orderStats?.confirmed ?? 0);

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <div className="bg-linear-to-r from-primary to-secondary rounded-lg p-5 text-white card-shadow">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1">Welcome back, {storeName}!</h1>
            <p className="text-sm text-white/80">Here's what's happening with your store today</p>
          </div>
          {data && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${data.vendor.isOpenNow ? "bg-green-400/30 text-white" : "bg-white/20 text-white/70"}`}>
              {data.vendor.isOpenNow ? "Open Now" : "Closed"}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-border card-shadow animate-pulse">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-7 w-12 bg-muted rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-lg p-4 border border-border card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
              </div>
              <p className="text-2xl font-bold">{data?.orderStats?.total ?? 0}</p>
              {pendingOrders > 0 && (
                <p className="text-xs text-yellow-600 font-medium mt-1">{pendingOrders} pending</p>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border border-border card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">This Month</p>
              </div>
              <p className="text-2xl font-bold">{fmtRevenue(data?.monthRevenue ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Today: {fmtRevenue(data?.todayRevenue ?? 0)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-border card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Low Stock</p>
              </div>
              <p className="text-2xl font-bold">{data?.inventoryStats?.lowStock ?? 0}</p>
              {(data?.inventoryStats?.outOfStock ?? 0) > 0 && (
                <p className="text-xs text-red-500 font-medium mt-1">{data?.inventoryStats?.outOfStock} out of stock</p>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border border-border card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Total Products</p>
              </div>
              <p className="text-2xl font-bold">{data?.inventoryStats?.total ?? 0}</p>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: "Add Medicine", description: "Add new product to inventory", icon: Package, href: "/medico/inventory" },
            { title: "Process Orders", description: `${pendingOrders} order${pendingOrders !== 1 ? "s" : ""} waiting`, icon: ShoppingCart, href: "/medico/orders" },
            { title: "Emergency Alerts", description: "Check urgent requests", icon: Bell, href: "/medico/emergency-alerts" },
            { title: "View Analytics", description: "Check sales & performance", icon: TrendingUp, href: "/medico/analytics" },
          ].map(({ title, description, icon: Icon, href }) => (
            <button
              key={title}
              onClick={() => router.push(href)}
              className="bg-white rounded-lg p-4 border border-border card-shadow hover:border-primary/40 hover:shadow-md transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push("/medico/orders")}>
              View All
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.recentOrders?.length ? (
            <div className="divide-y divide-border">
              {data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 hover:bg-accent/40 transition-colors px-1 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{order.customer}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[order.status] || "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.items} item{order.items !== 1 ? "s" : ""} · {timeAgo(order.createdAt)}</p>
                  </div>
                  <p className="font-semibold text-sm ml-3 shrink-0">{fmtRevenue(order.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Low Stock Alert</h3>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${data?.inventoryStats?.lowStock ?? 0} item${(data?.inventoryStats?.lowStock ?? 0) !== 1 ? "s" : ""} need restocking`}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.lowStockItems?.length ? (
            <>
              <div className="divide-y divide-border">
                {data.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-1">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Current: {item.current} · Min: {item.minimum}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push("/medico/inventory")}>
                      Restock
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3 text-xs" onClick={() => router.push("/medico/inventory")}>
                View All Low Stock Items
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">All items are well stocked.</p>
          )}
        </div>
      </div>
    </div>
  );
}

