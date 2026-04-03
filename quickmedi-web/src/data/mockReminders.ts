import { Reminder } from "@/types/reminder";

/**
 * Mock reminders for testing different scenarios
 * Use this for development when backend is not available
 */
export const mockReminders: Reminder[] = [
	{
		id: "rem_001",
		userId: "user_123",
		medicineName: "Paracetamol 500mg",
		medicineId: "med_001",
		dosage: "1 tablet",
		instruction: "After food",
		times: ["08:00", "14:00", "20:00"],
		frequency: "thrice_daily",
		startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
		endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
		isActive: true,
		prescriptionId: "pres_001",
		totalDoses: 90,
		takenDoses: 82,
		missedDoses: 8,
		consecutiveMisses: 0, // Safe - good adherence
		createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "rem_002",
		userId: "user_123",
		medicineName: "Metformin 500mg",
		medicineId: "med_002",
		dosage: "1 tablet",
		instruction: "Before meals",
		times: ["09:00", "21:00"],
		frequency: "twice_daily",
		startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
		isActive: true,
		prescriptionId: "pres_002",
		totalDoses: 60,
		takenDoses: 52,
		missedDoses: 8,
		consecutiveMisses: 2, // Warning - 2 consecutive misses
		createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "rem_003",
		userId: "user_123",
		medicineName: "Vitamin D3 60000 IU",
		medicineId: "med_003",
		dosage: "1 capsule",
		instruction: "With breakfast",
		times: ["08:00"],
		frequency: "weekly",
		startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
		endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		isActive: true,
		prescriptionId: "pres_003",
		totalDoses: 12,
		takenDoses: 5,
		missedDoses: 7,
		consecutiveMisses: 5, // High Risk - multiple consecutive misses
		createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "rem_004",
		userId: "user_123",
		medicineName: "Atorvastatin 10mg",
		dosage: "1 tablet",
		instruction: "At bedtime",
		times: ["22:00"],
		frequency: "daily",
		startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
		isActive: false, // Inactive reminder
		totalDoses: 90,
		takenDoses: 85,
		missedDoses: 5,
		consecutiveMisses: 0,
		createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "rem_005",
		userId: "user_123",
		medicineName: "Antibiotic - Amoxicillin 500mg",
		medicineId: "med_005",
		dosage: "1 capsule",
		instruction: "Complete full course",
		times: ["08:00", "20:00"],
		frequency: "twice_daily",
		startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
		endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Expired 3 days ago
		isActive: true,
		prescriptionId: "pres_005",
		totalDoses: 14,
		takenDoses: 14,
		missedDoses: 0,
		consecutiveMisses: 0, // Perfect adherence but expired
		createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "rem_006",
		userId: "user_123",
		medicineName: "Omega-3 Fish Oil",
		medicineId: "med_006",
		dosage: "1 softgel",
		times: ["09:00"],
		frequency: "custom",
		customDays: ["mon", "wed", "fri"], // Custom days
		startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
		isActive: true,
		totalDoses: 12,
		takenDoses: 10,
		missedDoses: 2,
		consecutiveMisses: 1,
		createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "rem_007",
		userId: "user_123",
		medicineName: "Aspirin 75mg",
		dosage: "1 tablet",
		instruction: "After breakfast",
		times: ["09:30"],
		frequency: "daily",
		startDate: new Date().toISOString(), // Starts today
		isActive: true,
		totalDoses: 0,
		takenDoses: 0,
		missedDoses: 0,
		consecutiveMisses: 0, // Brand new reminder
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "rem_008",
		userId: "user_123",
		medicineName: "Insulin Glargine",
		medicineId: "med_008",
		dosage: "10 units",
		instruction: "Inject subcutaneously",
		times: ["08:00"],
		frequency: "daily",
		startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
		isActive: true,
		prescriptionId: "pres_008",
		totalDoses: 180,
		takenDoses: 175,
		missedDoses: 5,
		consecutiveMisses: 0, // Excellent long-term adherence
		createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

/**
 * Mock stats for testing
 */
export const mockStats = {
	active: 6,
	today: 5,
	taken: 423,
	missed: 35,
	highRisk: 1,
};

/**
 * Simulate API delay
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock API service for development
 * Replace with real reminderService in production
 */
export const mockReminderService = {
	async getReminders() {
		await delay(800);
		return mockReminders;
	},

	async getReminderById(id: string) {
		await delay(500);
		const reminder = mockReminders.find((r) => r.id === id);
		if (!reminder) throw new Error("Reminder not found");
		return reminder;
	},

	async createReminder(data: any) {
		await delay(600);
		const newReminder: Reminder = {
			id: `rem_${Date.now()}`,
			userId: "user_123",
			...data,
			totalDoses: 0,
			takenDoses: 0,
			missedDoses: 0,
			consecutiveMisses: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		mockReminders.push(newReminder);
		return newReminder;
	},

	async updateReminder(id: string, data: any) {
		await delay(600);
		const index = mockReminders.findIndex((r) => r.id === id);
		if (index === -1) throw new Error("Reminder not found");
		mockReminders[index] = {
			...mockReminders[index],
			...data,
			updatedAt: new Date().toISOString(),
		};
		return mockReminders[index];
	},

	async deleteReminder(id: string) {
		await delay(500);
		const index = mockReminders.findIndex((r) => r.id === id);
		if (index === -1) throw new Error("Reminder not found");
		mockReminders.splice(index, 1);
	},

	async markDoseTaken(id: string) {
		await delay(500);
		const reminder = mockReminders.find((r) => r.id === id);
		if (!reminder) throw new Error("Reminder not found");
		reminder.takenDoses += 1;
		reminder.totalDoses += 1;
		reminder.consecutiveMisses = 0;
		reminder.updatedAt = new Date().toISOString();
		return reminder;
	},

	async markDoseMissed(id: string) {
		await delay(500);
		const reminder = mockReminders.find((r) => r.id === id);
		if (!reminder) throw new Error("Reminder not found");
		reminder.missedDoses += 1;
		reminder.totalDoses += 1;
		reminder.consecutiveMisses += 1;
		reminder.updatedAt = new Date().toISOString();
		return reminder;
	},

	async toggleActive(id: string, isActive: boolean) {
		await delay(500);
		return this.updateReminder(id, { isActive });
	},

	async getStats() {
		await delay(400);
		return mockStats;
	},
};
