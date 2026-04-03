"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shared/Sidebar";
import { BottomNav } from "@/components/shared/BottomNav";
import { Navbar } from "@/components/shared/Navbar";
import { useAuthContext } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { MedicineCartProvider } from "@/context/MedicineCartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Toaster } from "@/components/ui/sonner";
import { patientService } from "@/services/patient.service";
import type { User } from "@/types/api-types";
import {
	LayoutDashboard,
	Pill,
	ScanLine,
	MessageSquare,
	History,
	ShieldCheck,
	Bell,
	UserCircle,
	Store,
	Receipt,
	Heart,
} from "lucide-react";

const userSidebarItems = [
	{
		label: "Dashboard",
		href: "/user/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Medicines",
		href: "/user/medicines",
		icon: Pill,
	},
	{
		label: "Scan Prescription",
		href: "/user/scan",
		icon: ScanLine,
	},
	{
		label: "AI Assistant",
		href: "/user/chatbot",
		icon: MessageSquare,
	},
	{
		label: "Sathi",
		href: "/user/sathi",
		icon: Heart
	},
	{
		label: "Nearby Stores",
		href: "/user/nearby-stores",
		icon: Store,
	},
	{
		label: "Order History",
		href: "/user/order/history",
		icon: History,
	},
	{
		label: "Reminders",
		href: "/user/reminders",
		icon: Bell,
	},
	{
		label: "Profile",
		href: "/user/profile",
		icon: UserCircle,
	},
];

const userBottomNavItems = [
	{
		label: "Home",
		href: "/user/dashboard",
		icon: LayoutDashboard,
	},
	{
		label: "Scan",
		href: "/user/scan",
		icon: ScanLine,
	},
	{
		label: "AI Chat",
		href: "/user/chatbot",
		icon: MessageSquare,
	},
	{
		label: "Orders",
		href: "/user/order/history",
		icon: Receipt,
	},
	{
		label: "Profile",
		href: "/user/profile",
		icon: UserCircle,
	},
];

export default function UserLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [userLocation, setUserLocation] = useState<string | undefined>(undefined);
	const { user, logout, isAuthenticated, isLoading } = useAuthContext();
	const router = useRouter();

	// Auth guard
	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.replace("/login");
		}
	}, [isLoading, isAuthenticated, router]);

	// Fetch addresses to get location for navbar
	useEffect(() => {
		if (!isAuthenticated) return;
		patientService.getAddresses().then((res) => {
			const addresses = (res as any)?.data?.addresses ?? (res as any)?.data;
			if (Array.isArray(addresses) && addresses.length > 0) {
				const defaultAddr =
					addresses.find((a: any) => a.isDefault) ?? addresses[0];
				if (defaultAddr?.city) {
					setUserLocation(
						`${defaultAddr.city}, ${defaultAddr.state || "India"}`,
					);
				}
			}
		}).catch(() => {});
	}, [isAuthenticated]);

	const handleLogout = async () => {
		await logout();
		router.push("/login");
	};

	const typedUser = user as User | null;
	const userName = typedUser?.name || "User";
	const userEmail = typedUser?.email || "";

	if (isLoading) return null;

	return (
		<CartProvider>
		<MedicineCartProvider>
		<NotificationProvider>
		<div className="min-h-screen bg-gray-50">
			{/* Desktop Sidebar */}
			<Sidebar
				items={userSidebarItems}
				title="QuickMedi"
				// logo={
				// 	<div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold text-lg shrink-0">
				// 		Q
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
					title="Dashboard"
					userRole="user"
					userName={userName}
					userEmail={userEmail}
					userLocation={userLocation}
					isCollapsed={isCollapsed}
					onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
					onLogout={handleLogout}
				/>

				{/* Page Content */}
				<main className="p-4  pt-20 lg:pb-4 pb-20">
					<div className="max-w-full mx-auto">
						{children}
					</div>
				</main>
			</div>

			{/* Mobile Bottom Navigation */}
			<BottomNav items={userBottomNavItems} />
			<Toaster richColors position="top-right" />
		</div>
		</NotificationProvider>
		</MedicineCartProvider>
		</CartProvider>
	);
}
