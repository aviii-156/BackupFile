"use client";

import {
	Package,
	ShoppingCart,
	TrendingUp,
	AlertTriangle,
	DollarSign,
	Users,
	CheckCircle,
	Clock,
} from "lucide-react";
import { StatsCard, ActionCard, InfoCard } from "@/components/shared/DashboardCards";
import { Button } from "@/components/ui/Button";

export default function VendorDashboardExample() {
	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-primary to-secondary rounded-md p-8 text-white card-shadow">
				<h1 className="text-3xl font-bold mb-2">Pharmacy Dashboard 🏪</h1>
				<p className="text-white/90">
					Manage your inventory, orders, and customers efficiently
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					title="Total Orders"
					value="124"
					icon={ShoppingCart}
					trend={{ value: "+12% from last week", isPositive: true }}
				/>
				<StatsCard
					title="Revenue Today"
					value="₹15,240"
					icon={DollarSign}
					trend={{ value: "+8.5%", isPositive: true }}
				/>
				<StatsCard
					title="Low Stock Items"
					value="8"
					icon={AlertTriangle}
					trend={{ value: "Requires attention", isPositive: false }}
				/>
				<StatsCard
					title="Active Customers"
					value="342"
					icon={Users}
					trend={{ value: "+24 new", isPositive: true }}
				/>
			</div>

			{/* Quick Actions */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ActionCard
						title="Add Inventory"
						description="Add new medicines to your inventory"
						icon={Package}
						variant="primary"
						onClick={() => console.log("Add inventory")}
					/>
					<ActionCard
						title="Process Orders"
						description="View and manage pending orders"
						icon={ShoppingCart}
						onClick={() => console.log("Process orders")}
					/>
					<ActionCard
						title="Emergency Alerts"
						description="View urgent medicine requests"
						icon={AlertTriangle}
						onClick={() => console.log("Emergency alerts")}
					/>
					<ActionCard
						title="Analytics"
						description="View sales and performance metrics"
						icon={TrendingUp}
						onClick={() => console.log("View analytics")}
					/>
				</div>
			</div>

			{/* Recent Orders */}
			<InfoCard
				title="Recent Orders"
				subtitle="Latest customer orders"
				action={
					<Button variant="outline" size="sm">
						View All Orders
					</Button>
				}
			>
				<div className="space-y-3">
					{[
						{
							id: "#ORD-1234",
							customer: "Rajesh Kumar",
							items: "3 items",
							amount: "₹450",
							status: "pending",
						},
						{
							id: "#ORD-1235",
							customer: "Priya Sharma",
							items: "5 items",
							amount: "₹825",
							status: "completed",
						},
						{
							id: "#ORD-1236",
							customer: "Amit Patel",
							items: "2 items",
							amount: "₹320",
							status: "processing",
						},
					].map((order, idx) => (
						<div
							key={idx}
							className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
									{order.customer.charAt(0)}
								</div>
								<div>
									<p className="font-medium text-foreground">{order.customer}</p>
									<p className="text-sm text-muted-foreground">
										{order.id} • {order.items}
									</p>
								</div>
							</div>
							<div className="text-right">
								<p className="font-semibold text-foreground">{order.amount}</p>
								<span
									className={`text-xs font-medium px-2 py-1 rounded-full ${
										order.status === "completed"
											? "bg-success/10 text-success"
											: order.status === "processing"
											? "bg-primary/10 text-primary"
											: "bg-yellow-100 text-yellow-700"
									}`}
								>
									{order.status}
								</span>
							</div>
						</div>
					))}
				</div>
			</InfoCard>

			{/* Low Stock Alert */}
			<InfoCard
				title="Low Stock Alert"
				subtitle="Items requiring restock"
				action={
					<Button variant="outline" size="sm">
						Manage Inventory
					</Button>
				}
			>
				<div className="space-y-3">
					{[
						{ name: "Paracetamol 500mg", stock: "15 units", level: "low" },
						{ name: "Aspirin 75mg", stock: "8 units", level: "critical" },
						{ name: "Vitamin D3", stock: "22 units", level: "low" },
					].map((item, idx) => (
						<div
							key={idx}
							className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
						>
							<div className="flex items-center gap-3">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${
										item.level === "critical"
											? "bg-destructive/10 text-destructive"
											: "bg-yellow-100 text-yellow-700"
									}`}
								>
									<Package className="w-5 h-5" />
								</div>
								<div>
									<p className="font-medium text-foreground">{item.name}</p>
									<p className="text-sm text-muted-foreground">{item.stock}</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								Restock
							</Button>
						</div>
					))}
				</div>
			</InfoCard>
		</div>
	);
}
