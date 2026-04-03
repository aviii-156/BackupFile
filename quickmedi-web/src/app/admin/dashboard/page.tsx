"use client";

import { useState, useEffect } from "react";
import { StatsCard, ActionCard } from "@/components/shared/DashboardCards";
import { Users, Store, Package, CreditCard, TrendingUp, AlertCircle, DollarSign, Activity, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/admin.service";

export default function AdminDashboard() {
	const router = useRouter();
	const [dashboardData, setDashboardData] = useState<{
		overview: { totalUsers: number; totalVendors: number; pendingVendors: number; totalOrders: number; totalRevenue: number; newUsersThisMonth: number };
		recentOrders: any[];
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function fetchDashboard() {
			try {
				const res = await adminService.getDashboard();
				if (res.success && res.data) {
					setDashboardData(res.data as any);
				}
			} catch {
				// Keep null
			} finally {
				setIsLoading(false);
			}
		}
		fetchDashboard();
	}, []);

	const stats = dashboardData?.overview;
	const activity = dashboardData?.recentOrders || [];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="bg-linear-to-r from-primary to-secondary rounded-lg p-5 text-white card-shadow">
				<h1 className="text-xl font-bold mb-1">Admin Dashboard</h1>
				<p className="text-sm text-white/80">Platform overview and key metrics</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<StatsCard title="Total Users" value={isLoading ? "…" : String(stats?.totalUsers ?? 0)} trend={{ value: "+15%", isPositive: true }} icon={Users} />
				<StatsCard title="Active Vendors" value={isLoading ? "…" : String(stats?.totalVendors ?? 0)} trend={{ value: "+8%", isPositive: true }} icon={Store} />
				<StatsCard title="Total Orders" value={isLoading ? "…" : String(stats?.totalOrders ?? 0)} trend={{ value: "+12", isPositive: true }} icon={Package} />
				<StatsCard title="New This Month" value={isLoading ? "…" : String(stats?.newUsersThisMonth ?? 0)} trend={{ value: "+23%", isPositive: true }} icon={CreditCard} />
			</div>

			{/* Revenue & Activity */}
			<div className="grid md:grid-cols-2 gap-3">
				<div className="bg-white rounded-lg p-4 border border-border card-shadow">
					<div className="flex items-start justify-between mb-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground">Platform Revenue</p>
							<p className="text-xs text-muted-foreground">Last 30 days</p>
						</div>
						<div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
							<DollarSign className="w-4 h-4 text-green-600" />
						</div>
					</div>
					<p className="text-2xl font-bold mb-1">
					{isLoading ? "…" : `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
					</p>
					<div className="flex items-center gap-1 text-green-600 text-xs font-medium">
						<TrendingUp className="w-3 h-3" />
						<span>+18% from last month</span>
					</div>
				</div>

				<div className="bg-white rounded-lg p-4 border border-border card-shadow">
					<div className="flex items-start justify-between mb-3">
						<div>
							<p className="text-xs font-medium text-muted-foreground">Platform Activity</p>
							<p className="text-xs text-muted-foreground">Real-time metrics</p>
						</div>
						<div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
							<Activity className="w-4 h-4 text-blue-600" />
						</div>
					</div>
					<div className="divide-y divide-border">
						{[
					{ label: "Active Vendors", value: isLoading ? "…" : String(stats?.totalVendors ?? 0), color: "" },
							{ label: "Pending Vendors", value: isLoading ? "…" : String(stats?.pendingVendors ?? 0), color: "" },
							{ label: "Avg Response Time", value: "1.2s", color: "text-green-600" },
							{ label: "Uptime", value: "99.9%", color: "text-green-600" },
						].map((item) => (
							<div key={item.label} className="flex justify-between items-center py-1.5">
								<span className="text-xs text-muted-foreground">{item.label}</span>
								<span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Pending Actions Banner */}
			{!isLoading && (stats?.pendingVendors ?? 0) > 0 && (
				<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3">
					<AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
					<p className="text-xs text-orange-700 flex-1">
						<span className="font-semibold">{stats?.pendingVendors} vendor approval{(stats?.pendingVendors ?? 0) !== 1 ? "s" : ""}</span> pending review
					</p>
					<Button size="sm" className="h-7 text-xs" onClick={() => router.push("/admin/vendors")}>Review</Button>
				</div>
			)}

			{/* Quick Actions */}
			<div>
				<h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					<ActionCard title="Manage Users" description="View and manage accounts" icon={Users} onClick={() => router.push("/admin/users")} />
					<ActionCard title="Approve Vendors" description="Review vendor applications" icon={Store} onClick={() => router.push("/admin/vendors")} />
					<ActionCard title="Medicine Database" description="Manage medicine catalog" icon={Package} onClick={() => router.push("/admin/medicines")} />
					<ActionCard title="Emergency Logs" description="Monitor emergency requests" icon={AlertCircle} onClick={() => router.push("/admin/emergency-logs")} />
				</div>
			</div>

			{/* Recent Activity + System Status */}
			<div className="grid md:grid-cols-3 gap-3">
				<div className="md:col-span-2 bg-white rounded-lg p-4 border border-border card-shadow">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-semibold">Recent Activity</h2>
						<Button variant="outline" size="sm" className="h-7 text-xs">View All</Button>
					</div>
					<div className="divide-y divide-border">
						{isLoading ? (
							<p className="text-xs text-muted-foreground py-4 text-center">Loading activity...</p>
						) : activity.length > 0 ? activity.slice(0, 5).map((a: any, i: number) => (
							<div key={i} className="flex items-center gap-3 py-2.5 px-1 hover:bg-accent/40 transition-colors">
								<span className={`w-2 h-2 rounded-full bg-blue-500 shrink-0`} />
								<div className="flex-1 min-w-0">
									<p className="text-xs font-medium truncate">
										{a.orderNumber || a._id?.toString().slice(-6)} &mdash; <span className="text-foreground">{a.patientId?.name || "Patient"}</span>
									</p>
									<p className="text-[11px] text-muted-foreground">{a.status} · ₹{a.totalAmount} · {a.vendorId?.storeName || ""}</p>
								</div>
								<p className="text-[11px] text-muted-foreground shrink-0">{a.createdAt ? new Date(a.createdAt).toLocaleTimeString("en-IN") : ""}</p>
							</div>
						)) : (
							<p className="text-xs text-muted-foreground py-4 text-center">No recent activity</p>
						)}
					</div>
				</div>

				<div className="space-y-3">
					{/* System Status */}
					<div className="bg-white rounded-lg p-4 border border-border card-shadow">
						<h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">System Status</h3>
						<div className="space-y-2">
							{[
								{ label: "API Server", ok: true },
								{ label: "Database", ok: true },
								{ label: "Payment Gateway", ok: true },
								{ label: "SMS / OTP", ok: true },
							].map((s) => (
								<div key={s.label} className="flex justify-between items-center">
									<span className="text-xs">{s.label}</span>
									<span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
										{s.ok ? "Operational" : "Degraded"}
									</span>
								</div>
							))}
						</div>
					</div>
					{/* Growth */}
					<div className="bg-white rounded-lg p-4 border border-border card-shadow">
						<h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Growth Metrics</h3>
						<div className="space-y-2">
							{[
								{ label: "User Growth", value: "+15%", color: "text-green-600" },
								{ label: "Revenue Growth", value: "+18%", color: "text-green-600" },
								{ label: "Vendor Growth", value: "+8%", color: "text-green-600" },
								{ label: "Churn Rate", value: "2.1%", color: "text-red-500" },
							].map((m) => (
								<div key={m.label} className="flex justify-between items-center">
									<span className="text-xs">{m.label}</span>
									<span className={`text-xs font-bold ${m.color}`}>{m.value}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
