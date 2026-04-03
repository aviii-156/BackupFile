import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PageHeaderProps {
	title: string;
	description?: string;
	icon?: LucideIcon;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
			<div className="flex items-center gap-3">
				{Icon && (
					<div className="flex items-center justify-center w-12 h-12 rounded-md bg-accent">
						<Icon className="w-6 h-6 text-primary" />
					</div>
				)}
				<div>
					<h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
					{description && (
						<p className="text-sm md:text-base text-muted-foreground mt-1">
							{description}
						</p>
					)}
				</div>
			</div>
			{action && (
				<Button onClick={action.onClick} className="w-full md:w-auto">
					{action.label}
				</Button>
			)}
		</div>
	);
}

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
			<div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
				<Icon className="w-8 h-8 text-primary" />
			</div>
			<h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
			{action && (
				<Button onClick={action.onClick}>{action.label}</Button>
			)}
		</div>
	);
}
