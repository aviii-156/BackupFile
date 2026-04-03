"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
	label: string;
	href: string;
	icon: LucideIcon;
}

interface BottomNavProps {
	items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden">
			<div className="flex items-center justify-around h-16 px-2">
				{items.map((item) => {
					const Icon = item.icon;
					const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<Icon className={cn("w-5 h-5", isActive && "fill-current")} />
							<span className="text-xs font-medium">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
