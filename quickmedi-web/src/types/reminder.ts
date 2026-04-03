export type Frequency = "daily" | "twice_daily" | "thrice_daily" | "weekly" | "custom";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type RiskLevel = "safe" | "warning" | "high";

export interface Reminder {
	id: string;
	userId: string;
	medicineName: string;
	medicineId?: string;
	dosage: string;
	instruction?: string;
	times: string[]; // ["08:00", "20:00"]
	frequency: Frequency;
	customDays?: DayOfWeek[];
	startDate: string; // ISO date string
	endDate?: string; // ISO date string
	isActive: boolean;
	prescriptionId?: string;
	totalDoses: number;
	takenDoses: number;
	missedDoses: number;
	consecutiveMisses: number;
	lastTakenAt?: string; // ISO timestamp of the most recent dose taken
	createdAt: string;
	updatedAt: string;
}

export interface ReminderFormData {
	medicineName: string;
	medicineId?: string;
	dosage: string;
	instruction?: string;
	times: string[];
	frequency: Frequency;
	customDays?: DayOfWeek[];
	startDate: string;
	endDate?: string;
	isActive: boolean;
	prescriptionId?: string;
}

export interface ReminderStats {
	active: number;
	today: number;
	taken: number;
	missed: number;
	highRisk: number;
}

export type FilterTab = "all" | "active" | "inactive" | "high_risk" | "expired";
