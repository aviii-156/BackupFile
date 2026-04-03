"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LucideIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface SidebarItem {
	label: string;
	href: string;
	icon: LucideIcon;
}

interface SidebarProps {
	items: SidebarItem[];
	title: string;
	logo?: React.ReactNode;
	isCollapsed: boolean;
	showPremium?: boolean;
}

export function Sidebar({ items, title, logo, isCollapsed, showPremium = false }: SidebarProps) {
	const pathname = usePathname();

	return (
		<aside
			className={cn(
				"hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:bg-white md:border-r md:border-border md:z-40 transition-all duration-300",
				isCollapsed ? "md:w-16" : "md:w-64"
			)}
		>
			{/* Logo & Title */}
			<div className={cn(
				"flex items-center border-border h-[5vh] px-4",
				isCollapsed ? "justify-center" : "gap-3"
			)}>
				<div className="flex items-center gap-3 mt-3">
					{logo ? (
						logo
					) : isCollapsed ? (
						<Image src="/assets/single.png" alt="QuickMedi" width={36} height={38} className="shrink-0" />
					) : (
						<Image src="/assets/logo.png" alt="QuickMedi" width={140} height={36} className="object-contain" />
					)}
				</div>
			</div>

			{/* Navigation Items */}
			<nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
				{items.map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

					return (
						<Link
							key={item.href}
							href={item.href}
							title={isCollapsed ? item.label : undefined}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
								isActive
									? "bg-accent text-accent-foreground border-l-2 border-primary"
									: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
								isCollapsed && "justify-center"
							)}
						>
							<Icon className="w-5 h-5 shrink-0" />
							{!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
						</Link>
					);
				})}
			</nav>

			{/* Premium Unlock Card */}
			{!isCollapsed && showPremium && (
				<div className="px-3 pb-4">
					<Card className="border-2 py-4 border-primary/20 bg-linear-to-br from-primary/5 to-primary/10">
						<CardHeader className="pb-3 px-5">
							<CardTitle className="text-base font-bold flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-primary" />
								Unlock Everything
							</CardTitle>
							<CardDescription className="text-xs">
								Get instant access to all premium features and unlimited projects.
							</CardDescription>
						</CardHeader>
						<CardContent className="pb-3 px-5">
							<Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
								<span className="flex items-center gap-2">
									Get Full Access
								</span>
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Footer Section */}
			{!isCollapsed && (
				<div className="py-3 px-4 border-t border-border">
					<p className="text-xs text-muted-foreground text-center">
						© 2026 QuickMedi
					</p>
				</div>
			)}
		</aside>
	);
}
