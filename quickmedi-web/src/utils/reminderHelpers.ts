import { Reminder, RiskLevel, DayOfWeek } from "@/types/reminder";

/**
 * Calculate the next scheduled dose time for a reminder
 */
export function calculateNextDose(reminder: Reminder): Date | null {
	if (!reminder.isActive || !reminder.times.length) return null;

	const now = new Date();
	const today = now.toISOString().split("T")[0];

	// Check if reminder has expired
	if (reminder.endDate && new Date(reminder.endDate) < now) {
		return null;
	}

	// Check if reminder has started
	if (new Date(reminder.startDate) > now) {
		// Return first dose on start date
		const [hours, minutes] = reminder.times[0].split(":");
		const nextDose = new Date(reminder.startDate);
		nextDose.setHours(parseInt(hours), parseInt(minutes), 0, 0);
		return nextDose;
	}

	// For custom frequency, check if today matches custom days
	if (reminder.frequency === "custom" && reminder.customDays) {
		const dayOfWeek = now
			.toLocaleDateString("en-US", { weekday: "short" })
			.toLowerCase()
			.substring(0, 3) as DayOfWeek;

		if (!reminder.customDays.includes(dayOfWeek)) {
			// Find next valid day
			return findNextCustomDay(reminder, now);
		}
	}

	// Check all times for today
	for (const time of reminder.times.sort()) {
		const [hours, minutes] = time.split(":");
		const doseTime = new Date();
		doseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

		if (doseTime > now) {
			return doseTime;
		}
	}

	// All doses for today passed, return first dose tomorrow
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	// For custom frequency, find next valid day
	if (reminder.frequency === "custom" && reminder.customDays) {
		const nextDay = findNextCustomDay(reminder, tomorrow);
		return nextDay;
	}

	// For weekly frequency, return next week same day
	if (reminder.frequency === "weekly") {
		tomorrow.setDate(tomorrow.getDate() + 6); // +7 days from today
	}

	const [hours, minutes] = reminder.times[0].split(":");
	tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
	return tomorrow;
}

/**
 * Find next valid day for custom frequency
 */
function findNextCustomDay(reminder: Reminder, fromDate: Date): Date | null {
	if (!reminder.customDays || reminder.customDays.length === 0) return null;

	const dayNames: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
	const currentDay = fromDate.getDay();

	// Check next 7 days
	for (let i = 1; i <= 7; i++) {
		const checkDate = new Date(fromDate);
		checkDate.setDate(checkDate.getDate() + i);
		const checkDayIndex = checkDate.getDay();
		const checkDayName = dayNames[checkDayIndex];

		if (reminder.customDays.includes(checkDayName)) {
			const [hours, minutes] = reminder.times[0].split(":");
			checkDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
			return checkDate;
		}
	}

	return null;
}

/**
 * Check if a reminder has expired
 */
export function isReminderExpired(reminder: Reminder): boolean {
	if (!reminder.endDate) return false;
	const endDate = new Date(reminder.endDate);
	const now = new Date();
	return endDate < now;
}

/**
 * Calculate adherence percentage
 */
export function calculateAdherencePercentage(
	takenDoses: number,
	totalDoses: number
): number {
	if (totalDoses === 0) return 0;
	return Math.round((takenDoses / totalDoses) * 100);
}

/**
 * Determine risk level based on consecutive misses
 */
export function determineRiskLevel(consecutiveMisses: number): RiskLevel {
	if (consecutiveMisses >= 4) return "high";
	if (consecutiveMisses >= 2) return "warning";
	return "safe";
}

/**
 * Get risk level color classes
 */
export function getRiskLevelColor(riskLevel: RiskLevel): string {
	switch (riskLevel) {
		case "high":
			return "text-red-600 bg-red-50 border-red-200";
		case "warning":
			return "text-orange-600 bg-orange-50 border-orange-200";
		case "safe":
			return "text-green-600 bg-green-50 border-green-200";
	}
}

/**
 * Format time string (24h to 12h)
 */
export function formatTime(time: string): string {
	const [hours, minutes] = time.split(":");
	const hour = parseInt(hours);
	const ampm = hour >= 12 ? "PM" : "AM";
	const hour12 = hour % 12 || 12;
	return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Get frequency label
 */
export function getFrequencyLabel(frequency: string): string {
	switch (frequency) {
		case "daily":
			return "Daily";
		case "twice_daily":
			return "Twice Daily";
		case "thrice_daily":
			return "3x Daily";
		case "weekly":
			return "Weekly";
		case "custom":
			return "Custom";
		default:
			return frequency;
	}
}

/**
 * Get relative time (e.g., "in 2 hours", "5 minutes ago")
 */
export function getRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMins = Math.round(diffMs / 60000);
	const diffHours = Math.round(diffMs / 3600000);
	const diffDays = Math.round(diffMs / 86400000);

	if (diffMins < 0) {
		if (Math.abs(diffMins) < 60) return `${Math.abs(diffMins)} min ago`;
		if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)} hours ago`;
		return `${Math.abs(diffDays)} days ago`;
	}

	if (diffMins < 60) return `in ${diffMins} min`;
	if (diffHours < 24) return `in ${diffHours} hours`;
	return `in ${diffDays} days`;
}

/**
 * Check if reminder should show today
 */
export function shouldShowToday(reminder: Reminder): boolean {
	const now = new Date();
	const startDate = new Date(reminder.startDate);

	if (startDate > now) return false;
	if (isReminderExpired(reminder)) return false;
	if (!reminder.isActive) return false;

	if (reminder.frequency === "custom" && reminder.customDays) {
		const today = now
			.toLocaleDateString("en-US", { weekday: "short" })
			.toLowerCase()
			.substring(0, 3) as DayOfWeek;
		return reminder.customDays.includes(today);
	}

	if (reminder.frequency === "weekly") {
		const startDay = startDate.getDay();
		const currentDay = now.getDay();
		return startDay === currentDay;
	}

	return true; // daily, twice_daily, thrice_daily
}

/**
 * Get day name abbreviations
 */
export function getDayAbbreviations(days?: DayOfWeek[]): string {
	if (!days || days.length === 0) return "None";
	return days.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");
}

// ─── Dose Take-Window helpers ─────────────────────────────────────────────────

/**
 * The state of a specific dose time slot relative to now.
 *  - too_early : window hasn't opened yet (more than 15 min before dose time)
 *  - active    : inside the take window [doseTime - 15min, doseTime + 2h30min]
 *  - expired   : the 2.5-hour take window has closed without the dose being taken
 */
export type DoseWindowState = "too_early" | "active" | "expired";

/** 15 min pre-window + 2.5 hr post-window in milliseconds */
const PRE_WINDOW_MS = 15 * 60_000;
const POST_WINDOW_MS = 150 * 60_000;

/**
 * Determine the take-window state for a "HH:MM" time string against `now`.
 * Returns "too_early" for invalid / empty strings, so callers are safe.
 */
export function getDoseWindowState(timeStr: string, now: Date = new Date()): DoseWindowState {
	const [hh, mm] = timeStr.split(":").map(Number);
	if (isNaN(hh) || isNaN(mm)) return "too_early";

	const doseTime = new Date(now);
	doseTime.setHours(hh, mm, 0, 0);

	const windowStart = new Date(doseTime.getTime() - PRE_WINDOW_MS);
	const windowEnd   = new Date(doseTime.getTime() + POST_WINDOW_MS);

	if (now < windowStart) return "too_early";
	if (now <= windowEnd)  return "active";
	return "expired";
}

/**
 * Return the first time slot (from a times[] array) that is currently in the
 * active take-window, or null if none is active right now.
 */
export function getActiveTimeSlot(times: string[], now: Date = new Date()): string | null {
	for (const t of times) {
		if (getDoseWindowState(t, now) === "active") return t;
	}
	return null;
}

/**
 * Return the number of minutes until the NEXT take-window opens across all time
 * slots. Returns null when a slot is already active or all slots have expired.
 */
/**
 * Returns true if lastTakenAt falls inside the active take-window for any slot
 * in `times`, meaning the current window has already been fulfilled.
 */
export function isCurrentWindowTaken(
	lastTakenAt: string | null | undefined,
	times: string[],
	now: Date = new Date(),
): boolean {
	if (!lastTakenAt) return false;
	const takenTime = new Date(lastTakenAt);
	if (isNaN(takenTime.getTime())) return false;
	for (const t of times) {
		const [hh, mm] = t.split(":").map(Number);
		if (isNaN(hh) || isNaN(mm)) continue;
		const doseTime = new Date(now);
		doseTime.setHours(hh, mm, 0, 0);
		const windowStart = new Date(doseTime.getTime() - PRE_WINDOW_MS);
		const windowEnd   = new Date(doseTime.getTime() + POST_WINDOW_MS);
		if (takenTime >= windowStart && takenTime <= windowEnd) return true;
	}
	return false;
}

export function getMinutesToNextWindow(times: string[], now: Date = new Date()): number | null {
	let minMs: number | null = null;
	for (const t of times) {
		const [hh, mm] = t.split(":").map(Number);
		if (isNaN(hh) || isNaN(mm)) continue;
		const doseTime = new Date(now);
		doseTime.setHours(hh, mm, 0, 0);
		const windowStart = new Date(doseTime.getTime() - PRE_WINDOW_MS);
		if (windowStart > now) {
			const diff = windowStart.getTime() - now.getTime();
			if (minMs === null || diff < minMs) minMs = diff;
		}
	}
	return minMs !== null ? Math.ceil(minMs / 60_000) : null;
}
