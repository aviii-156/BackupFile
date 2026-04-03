import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
	title: string;
	value: string | number;
	icon: LucideIcon;
	trend?: {
		value: string;
		isPositive: boolean;
	};
	className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
	return (
		<div
			className={cn(
				"bg-white rounded-lg p-4 border border-border card-shadow hover:card-shadow-hover transition-shadow",
				className
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
					<p className="text-2xl font-bold text-foreground">{value}</p>
					{trend && (
						<p
							className={cn(
								"text-xs font-medium mt-1.5",
								trend.isPositive ? "text-success" : "text-destructive"
							)}
						>
							{trend.isPositive ? "↑" : "↓"} {trend.value}
						</p>
					)}
				</div>
				<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50">
					<Icon className="w-5 h-5 text-primary" />
				</div>
			</div>
		</div>
	);
}

interface ActionCardProps {
	title: string;
	description: string;
	icon: LucideIcon;
	onClick?: () => void;
	variant?: "default" | "primary";
}

export function ActionCard({
	title,
	description,
	icon: Icon,
	onClick,
	variant = "default",
}: ActionCardProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full text-left rounded-lg p-4 border transition-all card-shadow hover:card-shadow-hover",
				variant === "primary"
					? "bg-primary text-primary-foreground border-primary"
					: "bg-white border-border hover:border-primary/50"
			)}
		>
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0",
						variant === "primary"
							? "bg-white/20"
							: "bg-orange-50"
					)}
				>
					<Icon className={cn("w-5 h-5", variant === "primary" ? "text-white" : "text-primary")} />
				</div>
				<div className="flex-1 min-w-0">
					<h3
						className={cn(
							"font-semibold mb-1",
							variant === "primary" ? "text-white" : "text-foreground"
						)}
					>
						{title}
					</h3>
					<p
						className={cn(
							"text-sm",
							variant === "primary" ? "text-white/90" : "text-muted-foreground"
						)}
					>
						{description}
					</p>
				</div>
			</div>
		</button>
	);
}

interface InfoCardProps {
	title: string;
	subtitle?: string;
	children?: React.ReactNode;
	action?: React.ReactNode;
}

export function InfoCard({ title, subtitle, children, action }: InfoCardProps) {
	return (
		<div className="rounded-md">
			<div className="flex items-start justify-between mb-4">
				<div>
					<h3 className="font-semibold text-foreground">{title}</h3>
					{subtitle && (
						<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
					)}
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}
