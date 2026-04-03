"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { BottomNav } from "@/components/shared/BottomNav";
import { Navbar } from "@/components/shared/Navbar";
import { useAuthContext } from "@/context/AuthContext";
import {
	LayoutDashboard,
	Users,
	Store,
	Pill,
	DollarSign,
	CreditCard,
	AlertCircle,
	Settings,
	BarChart3,
	ShoppingCart,
} from "lucide-react";

const adminSidebarItems = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Users",
		href: "/admin/users",
		icon: Users,
	},
	{
		label: "Vendors",
		href: "/admin/vendors",
		icon: Store,
	},
	{
		label: "Medicines",
		href: "/admin/medicines",
		icon: Pill,
	},
	{
		label: "Orders",
		href: "/admin/orders",
		icon: ShoppingCart,
	},
	{
		label: "Subscriptions",
		href: "/admin/subscriptions",
		icon: CreditCard,
	},
	{
		label: "Savings",
		href: "/admin/savings",
		icon: DollarSign,
	},
	{
		label: "Emergency Logs",
		href: "/admin/emergency-logs",
		icon: AlertCircle,
	},
	{
		label: "Settings",
		href: "/admin/settings",
		icon: Settings,
	},
];

const adminBottomNavItems = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Users",
		href: "/admin/users",
		icon: Users,
	},
	{
		label: "Vendors",
		href: "/admin/vendors",
		icon: Store,
	},
	{
		label: "Analytics",
		href: "/admin/savings",
		icon: BarChart3,
	},
	{
		label: "Settings",
		href: "/admin/settings",
		icon: Settings,
	},
];

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const { logout, user } = useAuthContext();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
		router.replace("/login");
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Desktop Sidebar */}
			<Sidebar
				items={adminSidebarItems}
				title="QuickMedi Admin"
				// logo={
				// 	<div className="flex items-center justify-center w-10 h-10 rounded-md bg-linear-to-br from-primary to-secondary text-primary-foreground font-bold text-lg shrink-0">
				// 		A
				// 	</div>
				// }
				isCollapsed={isCollapsed}
			/>

			{/* Main Content Area */}
			<div 
				className={`transition-all duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}
			>
				{/* Top Navbar */}
				<Navbar
					title="Admin Dashboard"
					userRole="admin"
					userName={user && "name" in user ? user.name : "Admin"}
					userEmail={user?.email ?? "admin@quickmedi.com"}
					isCollapsed={isCollapsed}
					onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
					onLogout={handleLogout}
				/>

				{/* Page Content */}
				<main className="p-4 pt-20">
					<div className="max-w-400 mx-auto">
						{children}
					</div>
				</main>
			</div>

			{/* Mobile Bottom Navigation */}
			<BottomNav items={adminBottomNavItems} />
		</div>
	);
}
