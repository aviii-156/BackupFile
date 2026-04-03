"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";

type ChartBar = { label: string; revenue: number; orders: number };
type TopProduct = { name: string; unitsSold: number; revenue: string };
type AnalyticsData = {
	totalRevenue: number;
	totalOrders: number;
	totalProductsSold: number;
	uniqueCustomers: number;
	avgOrderValue: number;
	revenueTrend: string | null;
	ordersTrend: string | null;
	topProducts: TopProduct[];
	revenueChart: ChartBar[];
};

export default function AnalyticsPage() {
	const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("month");
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function fetchAnalytics() {
			setIsLoading(true);
			try {
				const res = await apiClient.get<{ data: AnalyticsData }>(
					`${API_CONFIG.API.VENDOR.ANALYTICS}?period=${timePeriod}`
				);
				if ((res as any).success && (res as any).data) {
					setData((res as any).data);
				}
			} catch {
				// keep previous data on error
			} finally {
				setIsLoading(false);
			}
		}
		fetchAnalytics();
	}, [timePeriod]);

	const fmt = (n: number) =>
		n >= 100000
			? `₹${(n / 100000).toFixed(1)}L`
			: n >= 1000
				? `₹${(n / 1000).toFixed(1)}K`
				: `₹${n.toLocaleString("en-IN")}`;

	const maxRevenue = data ? Math.max(...data.revenueChart.map(b => b.revenue), 1) : 1;

	const metrics = data
		? [
			{
				label: "Total Revenue",
				value: fmt(data.totalRevenue),
				trend: data.revenueTrend,
				positive: !data.revenueTrend || data.revenueTrend.startsWith("+"),
				icon: DollarSign,
				iconBg: "bg-green-50",
				iconColor: "text-green-600",
			},
			{
				label: "Total Orders",
				value: String(data.totalOrders),
				trend: data.ordersTrend,
				positive: !data.ordersTrend || data.ordersTrend.startsWith("+"),
				icon: ShoppingCart,
				iconBg: "bg-blue-50",
				iconColor: "text-blue-600",
			},
			{
				label: "Products Sold",
				value: String(data.totalProductsSold),
				trend: null,
				positive: true,
				icon: Package,
				iconBg: "bg-purple-50",
				iconColor: "text-purple-600",
			},
			{
				label: "Unique Customers",
				value: String(data.uniqueCustomers),
				trend: null,
				positive: true,
				icon: Users,
				iconBg: "bg-orange-50",
				iconColor: "text-orange-600",
			},
		]
		: [];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-bold">Analytics & Reports</h1>
					<p className="text-xs text-muted-foreground mt-0.5">View detailed insights about your store performance</p>
				</div>
				<div className="flex gap-1.5 bg-muted rounded-lg p-1">
					{(["week", "month", "year"] as const).map((period) => (
						<button
							key={period}
							onClick={() => setTimePeriod(period)}
							className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
								timePeriod === period
									? "bg-white text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{period}
						</button>
					))}
				</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				{isLoading
					? Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="bg-white rounded-lg p-4 border border-border card-shadow animate-pulse">
							<div className="h-4 w-24 bg-muted rounded mb-2" />
							<div className="h-8 w-16 bg-muted rounded" />
						</div>
					))
					: metrics.map(({ label, value, trend, positive, icon: Icon, iconBg, iconColor }) => (
						<div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
									<p className="text-2xl font-bold">{value}</p>
									{trend && (
										<div className={`flex items-center gap-0.5 mt-1.5 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
											{positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
											{trend} vs last {timePeriod}
										</div>
									)}
								</div>
								<div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
									<Icon className={`w-5 h-5 ${iconColor}`} />
								</div>
							</div>
						</div>
					))}
			</div>

			{/* Sales Chart */}
			<div className="bg-white rounded-lg p-4 border border-border card-shadow">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-sm font-semibold">Revenue Overview</h3>
				</div>
				{isLoading ? (
					<div className="h-48 bg-muted/30 animate-pulse rounded" />
				) : data && data.revenueChart.length > 0 ? (
					<div className="h-48 flex items-end justify-between gap-1.5 overflow-x-auto">
						{data.revenueChart.map((bar, index) => (
							<div key={index} className="flex-1 min-w-5 flex flex-col items-center gap-1.5">
								<div
									className="w-full bg-linear-to-t from-primary to-secondary rounded-t transition-all hover:opacity-75 cursor-pointer"
									style={{ height: `${Math.max((bar.revenue / maxRevenue) * 100, bar.orders > 0 ? 4 : 0)}%` }}
									title={`${bar.label}: ${fmt(bar.revenue)} (${bar.orders} orders)`}
								/>
								<p className="text-[9px] text-muted-foreground truncate w-full text-center">{bar.label}</p>
							</div>
						))}
					</div>
				) : (
					<p className="h-48 flex items-center justify-center text-sm text-muted-foreground">No orders in this period.</p>
				)}
			</div>

			{/* Top Products & Order Insights */}
			<div className="grid md:grid-cols-2 gap-4">
				{/* Top Selling Products */}
				<div className="bg-white rounded-lg p-4 border border-border card-shadow">
					<h3 className="text-sm font-semibold mb-3">Top Selling Products</h3>
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="h-8 bg-muted rounded animate-pulse" />
							))}
						</div>
					) : data && data.topProducts.length > 0 ? (
						<div className="divide-y divide-border">
							{data.topProducts.map((product, index) => (
								<div key={index} className="flex items-center justify-between py-2.5 px-1">
									<div className="flex items-center gap-3">
										<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
											{index + 1}
										</div>
										<div>
											<p className="font-medium text-sm">{product.name}</p>
											<p className="text-xs text-muted-foreground">{product.unitsSold} units sold</p>
										</div>
									</div>
									<p className="text-sm font-semibold text-primary">{product.revenue}</p>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground text-center py-6">No delivered orders yet in this period.</p>
					)}
				</div>

				{/* Order Insights */}
				<div className="bg-white rounded-lg p-4 border border-border card-shadow">
					<h3 className="text-sm font-semibold mb-3">Order Insights</h3>
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="h-16 bg-muted rounded animate-pulse" />
							))}
						</div>
					) : data ? (
						<div className="grid grid-cols-1 gap-3">
							{[
								{ value: fmt(data.avgOrderValue), label: "Avg. Order Value" },
								{ value: String(data.uniqueCustomers), label: "Unique Customers" },
								{ value: data.totalOrders > 0 ? (data.totalProductsSold / data.totalOrders).toFixed(1) : "0", label: "Avg. Items per Order" },
							].map(({ value, label }) => (
								<div key={label} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
									<p className="text-sm text-muted-foreground">{label}</p>
									<p className="text-xl font-bold text-primary">{value}</p>
								</div>
							))}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

