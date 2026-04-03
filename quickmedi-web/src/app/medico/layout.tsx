"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { BottomNav } from "@/components/shared/BottomNav";
import { Navbar } from "@/components/shared/Navbar";
import { authService } from "@/services/auth.service";
import { NotificationProvider } from "@/context/NotificationContext";
import {
	LayoutDashboard,
	Package,
	ShoppingCart,
	BarChart3,
	AlertTriangle,
	UserCircle,
	Settings,
	Store,
} from "lucide-react";

const vendorSidebarItems = [
	{
		label: "Dashboard",
		href: "/medico/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Inventory",
		href: "/medico/inventory",
		icon: Package,
	},
	{
		label: "Orders",
		href: "/medico/orders",
		icon: ShoppingCart,
	},
	{
		label: "Analytics",
		href: "/medico/analytics",
		icon: BarChart3,
	},
	{
		label: "Emergency Alerts",
		href: "/medico/emergency-alerts",
		icon: AlertTriangle,
	},
	{
		label: "Store Profile",
		href: "/medico/profile",
		icon: Store,
	}
];

const vendorBottomNavItems = [
	{
		label: "Dashboard",
		href: "/medico/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Inventory",
		href: "/medico/inventory",
		icon: Package,
	},
	{
		label: "Orders",
		href: "/medico/orders",
		icon: ShoppingCart,
	},
	{
		label: "Analytics",
		href: "/medico/analytics",
		icon: BarChart3,
	},
	{
		label: "Profile",
		href: "/medico/profile",
		icon: UserCircle,
	},
];

export default function VendorLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [userName, setUserName] = useState("Vendor");
	const [userEmail, setUserEmail] = useState("");
	const router = useRouter();

	useEffect(() => {
		const user = authService.getCurrentUser() as any;
		if (user) {
			setUserName(user.storeName || user.ownerName || user.name || "Vendor");
			setUserEmail(user.email || "");
		}
	}, []);

	const handleLogout = async () => {
		try {
			await authService.logout();
		} catch {
			// Storage is already cleared — proceed to redirect
		}
		router.push("/login");
	};

	return (
		<NotificationProvider>
		<div className="min-h-screen bg-gray-50">
			{/* Desktop Sidebar */}
			<Sidebar
				items={vendorSidebarItems}
				title="QuickMedi Vendor"
				// logo={
				// 	<div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold text-lg shrink-0">
				// 		<Store className="w-6 h-6" />
				// 	</div>
				// }
				isCollapsed={isCollapsed}
				showPremium={true}
			/>

			{/* Main Content Area */}
			<div 
				className={`transition-all duration-300 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}
			>
				{/* Top Navbar */}
				<Navbar
					title="Vendor Dashboard"
					userRole="vendor"
					userName={userName}
					userEmail={userEmail}
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
			<BottomNav items={vendorBottomNavItems} />
		</div>
		</NotificationProvider>
	);
}
