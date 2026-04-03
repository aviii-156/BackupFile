import axios from "axios";
import { Reminder, ReminderFormData, ReminderStats } from "@/types/reminder";
import { API_CONFIG, getAuthHeader } from "@/lib/api-config";

const BASE = API_CONFIG.BASE_API_URL;
const EP = API_CONFIG.API.REMINDERS;

/** Axios instance that always attaches the patient's JWT */
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
	config.headers = { ...config.headers, ...getAuthHeader() } as typeof config.headers;
	return config;
});

/** Unwrap the standard `{ success, message, data }` envelope */
const unwrap = <T>(responseData: { data: Record<string, T> }, key: string): T =>
	(responseData.data as Record<string, T>)[key];

export const reminderService = {
	async getReminders(): Promise<Reminder[]> {
		const res = await api.get(EP.LIST);
		return unwrap<Reminder[]>(res.data, "reminders");
	},

	async getReminderById(id: string): Promise<Reminder> {
		const res = await api.get(EP.GET(id));
		return unwrap<Reminder>(res.data, "reminder");
	},

	async createReminder(data: ReminderFormData): Promise<Reminder> {
		const res = await api.post(EP.CREATE, data);
		return unwrap<Reminder>(res.data, "reminder");
	},

	async updateReminder(id: string, data: Partial<ReminderFormData>): Promise<Reminder> {
		const res = await api.patch(EP.UPDATE(id), data);
		return unwrap<Reminder>(res.data, "reminder");
	},

	async deleteReminder(id: string): Promise<void> {
		await api.delete(EP.DELETE(id));
	},

	async markDoseTaken(id: string): Promise<Reminder> {
		const res = await api.post(EP.MARK_TAKEN(id));
		return unwrap<Reminder>(res.data, "reminder");
	},

	async markDoseMissed(id: string): Promise<Reminder> {
		const res = await api.post(EP.MARK_MISSED(id));
		return unwrap<Reminder>(res.data, "reminder");
	},

	async toggleActive(id: string, isActive: boolean): Promise<Reminder> {
		const res = await api.patch(EP.UPDATE(id), { isActive });
		return unwrap<Reminder>(res.data, "reminder");
	},

	async getStats(): Promise<ReminderStats> {
		const res = await api.get(EP.STATS);
		return unwrap<ReminderStats>(res.data, "stats");
	},
};
