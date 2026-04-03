"use client";

import {
	Users,
	Store,
	DollarSign,
	TrendingUp,
	Pill,
	CreditCard,
	AlertCircle,
	Activity,
} from "lucide-react";
import { StatsCard, ActionCard, InfoCard } from "@/components/shared/DashboardCards";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardExample() {
	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="bg-linear-to-r from-primary to-secondary rounded-md p-8 text-white card-shadow">
				<h1 className="text-3xl font-bold mb-2">Admin Control Panel 🎯</h1>
				<p className="text-white/90">
					Monitor and manage the entire QuickMedi platform
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatsCard
					title="Total Users"
					value="12,458"
					icon={Users}
					trend={{ value: "+245 this week", isPositive: true }}
				/>
				<StatsCard
					title="Active Vendors"
					value="342"
					icon={Store}
					trend={{ value: "+15 new", isPositive: true }}
				/>
				<StatsCard
					title="Total Revenue"
					value="₹8.5L"
					icon={DollarSign}
					trend={{ value: "+18.2%", isPositive: true }}
				/>
				<StatsCard
					title="Active Subscriptions"
					value="1,856"
					icon={CreditCard}
					trend={{ value: "+12%", isPositive: true }}
				/>
			</div>

			{/* Platform Overview */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-md p-4 border border-border card-shadow">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-md bg-blue-50 flex items-center justify-center">
							<Pill className="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Total Medicines</p>
							<p className="text-2xl font-bold">2,458</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-md p-4 border border-border card-shadow">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-md bg-green-50 flex items-center justify-center">
							<Activity className="w-6 h-6 text-green-600" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Orders Today</p>
							<p className="text-2xl font-bold">486</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-md p-4 border border-border card-shadow">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-md bg-purple-50 flex items-center justify-center">
							<TrendingUp className="w-6 h-6 text-purple-600" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">User Savings</p>
							<p className="text-2xl font-bold">₹4.2L</p>
						</div>
					</div>
				</div>
				<div className="bg-white rounded-md p-4 border border-border card-shadow">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center">
							<AlertCircle className="w-6 h-6 text-red-600" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Emergencies</p>
							<p className="text-2xl font-bold">5</p>
						</div>
					</div>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Quick Management</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ActionCard
						title="User Management"
						description="View and manage registered users"
						icon={Users}
						variant="primary"
						onClick={() => console.log("Manage users")}
					/>
					<ActionCard
						title="Vendor Approval"
						description="Review and approve vendor applications"
						icon={Store}
						onClick={() => console.log("Approve vendors")}
					/>
					<ActionCard
						title="Medicine Database"
						description="Update and maintain medicine information"
						icon={Pill}
						onClick={() => console.log("Manage medicines")}
					/>
					<ActionCard
						title="Emergency Logs"
						description="Monitor and respond to emergency requests"
						icon={AlertCircle}
						onClick={() => console.log("View emergencies")}
					/>
				</div>
			</div>

			{/* Recent Users */}
			<InfoCard
				title="Recent User Registrations"
				subtitle="New users this week"
				action={
					<Button variant="outline" size="sm">
						View All Users
					</Button>
				}
			>
				<div className="space-y-3">
					{[
						{ name: "Anjali Verma", email: "anjali@example.com", date: "Today" },
						{ name: "Rahul Singh", email: "rahul@example.com", date: "Yesterday" },
						{ name: "Meera Reddy", email: "meera@example.com", date: "2 days ago" },
					].map((user, idx) => (
						<div
							key={idx}
							className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
									{user.name.charAt(0)}
								</div>
								<div>
									<p className="font-medium text-foreground">{user.name}</p>
									<p className="text-sm text-muted-foreground">{user.email}</p>
								</div>
							</div>
							<span className="text-sm text-muted-foreground">{user.date}</span>
						</div>
					))}
				</div>
			</InfoCard>

			{/* Pending Vendor Approvals */}
			<InfoCard
				title="Pending Vendor Approvals"
				subtitle="Awaiting review"
				action={
					<Button variant="outline" size="sm">
						Review All
					</Button>
				}
			>
				<div className="space-y-3">
					{[
						{ name: "MedPlus Pharmacy", location: "Mumbai", submitted: "2 days ago" },
						{ name: "HealthCare Store", location: "Delhi", submitted: "3 days ago" },
					].map((vendor, idx) => (
						<div
							key={idx}
							className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
									<Store className="w-5 h-5" />
								</div>
								<div>
									<p className="font-medium text-foreground">{vendor.name}</p>
									<p className="text-sm text-muted-foreground">
										{vendor.location} • {vendor.submitted}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Button variant="outline" size="sm">
									Review
								</Button>
							</div>
						</div>
					))}
				</div>
			</InfoCard>
		</div>
	);
}
