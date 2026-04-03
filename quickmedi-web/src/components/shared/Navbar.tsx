"use client";

import Link from "next/link";
import { Search, HelpCircle, Crown, SquareChevronLeft, SquareChevronRight, MapPin, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/Input";
import { useCartSafe } from "@/context/CartContext";
import { useMedicineCartSafe } from "@/context/MedicineCartContext";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface NavbarProps {
	title?: string;
	userRole: "user" | "vendor" | "admin";
	userName?: string;
	userEmail?: string;
	userLocation?: string;
	isCollapsed?: boolean;
	onToggleSidebar?: () => void;
	onLogout?: () => void;
}

export function Navbar({
	title = "Dashboard",
	userRole,
	userName = "Guest User",
	userEmail = "user@example.com",
	userLocation,
	isCollapsed = false,
	onToggleSidebar,
	onLogout,
}: NavbarProps) {
	const { totalItems: cartCount } = useCartSafe();
	const { totalItems: medicineCartCount } = useMedicineCartSafe();
	const totalCartCount = cartCount + medicineCartCount;

	const getRoleBadgeColor = () => {
		switch (userRole) {
			case "admin":
				return "bg-purple-100 text-purple-700";
			case "vendor":
				return "bg-blue-100 text-blue-700";
			default:
				return "bg-green-100 text-green-700";
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<header className={`fixed top-0 right-0 z-30 bg-white border-b border-border transition-all duration-300 ${isCollapsed ? 'left-0 md:left-16' : 'left-0 md:left-64'}`}>
			<div className="flex items-center h-15 px-4 gap-2 md:gap-4">
				{/* Left Section - Toggle & Logo */}
				<div className="flex items-center gap-2 md:gap-3">
					{/* Sidebar Toggle - Desktop only */}
					<Button
						variant="ghost"
						size="icon"
						onClick={onToggleSidebar}
						className="hidden md:flex h-10 w-10"
					>
						{isCollapsed ? (
							<SquareChevronRight className="w-6 h-6" />
						) : (
							<SquareChevronLeft className="w-6 h-6" />
						)}
					</Button>

					{/* Logo - Mobile only */}
					<div className="flex items-center gap-2 md:hidden">
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 p-0"
						>
						</Button>
						<span className="font-semibold text-foreground text-base">QuickMedi</span>
					</div>
				</div>

				{/* Center - Search Bar */}
				<div className="hidden md:flex items-center flex-1 max-w-md">
					<div className="relative w-full">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search..."
							className="w-full pl-10 pr-16 h-9 bg-background"
						/>
						<kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100">
							<span className="text-xs">⌘</span>K
						</kbd>
					</div>
				</div>

				{/* Right Section */}
				<div className="flex items-center gap-1 ml-auto">
					{/* Location Button */}
					{userLocation && (
						<Button
							variant="ghost"
							size="sm"
							className="hidden md:flex items-center gap-2 h-9 px-3"
						>
							<MapPin className="w-4 h-4 text-primary" />
							<span className="text-sm font-medium">{userLocation}</span>
						</Button>
					)}

					{/* Cart Button — only for users */}
					{userRole === "user" && (
						<Link href="/user/order/cart">
							<Button variant="ghost" size="icon" className="relative h-9 w-9">
								<ShoppingCart className="w-5 h-5" />
								{totalCartCount > 0 && (
									<span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center justify-center">
										{totalCartCount > 99 ? "99+" : totalCartCount}
									</span>
								)}
							</Button>
						</Link>
					)}

					{/* Notifications */}
					<NotificationBell />

					{/* Help */}
					<Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9">
						<HelpCircle className="w-5 h-5" />
					</Button>

					{/* User Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" className="h-9 w-9 rounded-full p-0">
								<Avatar className="w-9 h-9">
									<AvatarImage src="" alt={userName} />
									<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
										{getInitials(userName)}
									</AvatarFallback>
								</Avatar>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<DropdownMenuLabel>
								<div className="flex items-center gap-3 py-2">
									<Avatar className="w-10 h-10">
										<AvatarImage src="" alt={userName} />
										<AvatarFallback className="bg-primary text-primary-foreground">
											{getInitials(userName)}
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-semibold leading-none">{userName}</p>
										<p className="text-xs leading-none text-muted-foreground">
											{userEmail}
										</p>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Crown className="w-4 h-4 mr-2" />
								Upgrade to Pro
							</DropdownMenuItem>
							<DropdownMenuItem>Account</DropdownMenuItem>
							<DropdownMenuItem>Billing</DropdownMenuItem>
							<DropdownMenuItem>Notifications</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive cursor-pointer"
								onClick={onLogout}
							>
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
