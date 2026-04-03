"use client";

import { useState, useEffect } from "react";
import { Reminder } from "@/types/reminder";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
	Pill,
	Clock,
	Calendar,
	Edit,
	Trash2,
	Power,
	CheckCircle,
	XCircle,
	AlertTriangle,
	Loader2,
} from "lucide-react";
import {
	calculateNextDose,
	calculateAdherencePercentage,
	determineRiskLevel,
	getRiskLevelColor,
	formatTime,
	formatDate,
	getFrequencyLabel,
	getRelativeTime,
	getDayAbbreviations,
	isReminderExpired,
	getActiveTimeSlot,
	getMinutesToNextWindow,
	isCurrentWindowTaken,
} from "@/utils/reminderHelpers";

interface ReminderCardProps {
	reminder: Reminder;
	now: Date;
	onMarkTaken: (id: string) => Promise<void>;
	onMarkMissed: (id: string) => Promise<void>;
	onToggleActive: (id: string, isActive: boolean) => void;
	onEdit: (reminder: Reminder) => void;
	onDelete: (id: string) => void;
}

export function ReminderCard({
	reminder,
	now,
	onMarkTaken,
	onMarkMissed,
	onToggleActive,
	onEdit,
	onDelete,
}: ReminderCardProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [pendingDose, setPendingDose] = useState<"taken" | "missed" | null>(null);

	const nextDose = calculateNextDose(reminder);
	const adherence = calculateAdherencePercentage(reminder.takenDoses, reminder.totalDoses);
	const riskLevel = determineRiskLevel(reminder.consecutiveMisses);
	const isExpired = isReminderExpired(reminder);

	// Determine whether the "Mark Taken / Mark Missed" buttons should be visible
	const activeSlot = getActiveTimeSlot(reminder.times, now);
	const minutesToNext = !activeSlot ? getMinutesToNextWindow(reminder.times, now) : null;

	// Derive markedAs from server data so it survives refresh:
	// if lastTakenAt falls inside the current active window → already taken this slot
	const alreadyTakenThisWindow = isCurrentWindowTaken(reminder.lastTakenAt, reminder.times, now);
	const [markedAs, setMarkedAs] = useState<"taken" | "missed" | null>(
		alreadyTakenThisWindow ? "taken" : null,
	);

	// Reset confirmation when the active time slot changes (next window opens)
	useEffect(() => {
		if (!isCurrentWindowTaken(reminder.lastTakenAt, reminder.times, now)) {
			setMarkedAs(null);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeSlot]);

	const handleTaken = async () => {
		if (pendingDose || markedAs) return;
		setPendingDose("taken");
		try {
			await onMarkTaken(reminder.id);
			setMarkedAs("taken");
		} catch {
			// parent handles error toast; don't set markedAs on failure
		} finally {
			setPendingDose(null);
		}
	};

	const handleMissed = async () => {
		if (pendingDose || markedAs) return;
		setPendingDose("missed");
		try {
			await onMarkMissed(reminder.id);
			setMarkedAs("missed");
		} catch {
			// parent handles error toast
		} finally {
			setPendingDose(null);
		}
	};

	const handleDelete = () => {
		if (window.confirm(`Are you sure you want to delete "${reminder.medicineName}"?`)) {
			setIsDeleting(true);
			onDelete(reminder.id);
		}
	};

	return (
		<Card className={`border-none shadow-xs hover:shadow-sm transition-shadow py-0 ${isDeleting ? "opacity-50" : ""}`}>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					{/* Icon */}
					<div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
						<Pill className="w-5 h-5 text-teal-600" />
					</div>

					{/* Main Content */}
					<div className="flex-1 min-w-0">
						{/* Header Row */}
						<div className="flex items-start justify-between gap-2 mb-2">
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-base text-gray-900 truncate">
									{reminder.medicineName}
								</h3>
								<p className="text-sm text-gray-600 truncate">
									{reminder.dosage}
									{reminder.instruction && ` • ${reminder.instruction}`}
								</p>
							</div>
							<div className="flex items-center gap-1 shrink-0">
								{isExpired ? (
									<Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs px-2 py-0">
										Expired
									</Badge>
								) : (
									<Badge
										className={`text-xs px-2 py-0 ${
											reminder.isActive
												? "bg-green-100 text-green-700 border-green-300"
												: "bg-gray-100 text-gray-600 border-gray-300"
										}`}
									>
										{reminder.isActive ? "Active" : "Inactive"}
									</Badge>
								)}
								{riskLevel !== "safe" && (
									<Badge className={`${getRiskLevelColor(riskLevel)} text-xs px-2 py-0`}>
										<AlertTriangle className="w-3 h-3 mr-1" />
										{riskLevel === "high" ? "High Risk" : "Warning"}
									</Badge>
								)}
							</div>
						</div>

						{/* Next Dose & Schedule Row */}
						<div className="flex items-center gap-4 mb-2 text-xs">
							{nextDose && !isExpired && (
								<div className="flex items-center gap-1 text-blue-700 font-medium">
									<Clock className="w-3.5 h-3.5" />
									<span>Next: {formatTime(nextDose.toTimeString().substring(0, 5))}</span>
									<span className="text-blue-600">({getRelativeTime(nextDose)})</span>
								</div>
							)}
							<div className="flex items-center gap-1 text-gray-600">
								<Calendar className="w-3.5 h-3.5" />
								<span>{formatDate(reminder.startDate)}</span>
								{reminder.endDate && <span>to {formatDate(reminder.endDate)}</span>}
							</div>
						</div>

						{/* Times & Frequency Row */}
						<div className="flex items-center gap-2 mb-2 flex-wrap">
							<span className="text-xs text-gray-500">
								{getFrequencyLabel(reminder.frequency)}
								{reminder.frequency === "custom" && reminder.customDays && (
									<span className="ml-1">({getDayAbbreviations(reminder.customDays)})</span>
								)}
							</span>
							<span className="text-gray-300">•</span>
							<div className="flex gap-1 flex-wrap">
								{reminder.times.map((time, idx) => (
									<span
										key={idx}
										className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-700"
									>
										{formatTime(time)}
									</span>
								))}
							</div>
						</div>

						{/* Adherence Bar - Inline */}
						<div className="flex items-center gap-2 mb-2">
							<span className="text-xs text-gray-600 shrink-0">Adherence:</span>
							<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
								<div
									className={`h-full transition-all ${
										adherence >= 80
											? "bg-green-500"
											: adherence >= 60
											? "bg-yellow-500"
											: "bg-red-500"
									}`}
									style={{ width: `${adherence}%` }}
								/>
							</div>
							<span className="text-xs font-semibold text-teal-600 shrink-0">{adherence}%</span>
							<span className="text-xs text-gray-500 shrink-0">
								{reminder.takenDoses}/{reminder.totalDoses}
							</span>
							{reminder.missedDoses > 0 && (
								<span className="text-xs text-orange-600 shrink-0">
									({reminder.missedDoses} missed)
								</span>
							)}
						</div>

						{/* Consecutive Misses Warning - Inline */}
						{reminder.consecutiveMisses > 0 && (
							<div
								className={`mb-2 px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${
									reminder.consecutiveMisses >= 4
										? "bg-red-50 border border-red-200 text-red-800"
										: reminder.consecutiveMisses >= 2
										? "bg-orange-50 border border-orange-200 text-orange-800"
										: "bg-yellow-50 border border-yellow-200 text-yellow-800"
								}`}
							>
								⚠️ {reminder.consecutiveMisses} consecutive{" "}
								{reminder.consecutiveMisses === 1 ? "miss" : "misses"}
							</div>
						)}

						{/* Action Buttons - Compact */}
						<div className="flex flex-wrap gap-1.5">
							{!isExpired && reminder.isActive && (
								<>
									{activeSlot ? (
										<>
											{/* Window is open — show confirmation badge or Take / Missed buttons */}
											{markedAs ? (
												<span
													className={`text-xs flex items-center gap-1 font-medium ${
														markedAs === "taken" ? "text-green-600" : "text-orange-500"
													}`}
												>
													{markedAs === "taken" ? (
														<CheckCircle className="w-3.5 h-3.5" />
													) : (
														<XCircle className="w-3.5 h-3.5" />
													)}
													{markedAs === "taken" ? "Dose Taken" : "Marked Missed"}
												</span>
											) : (
												<>
													<Button
														size="sm"
														className="h-7 px-2 text-xs"
														onClick={handleTaken}
														disabled={pendingDose !== null}
													>
														{pendingDose === "taken" ? (
															<Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
														) : (
															<CheckCircle className="w-3.5 h-3.5 mr-1" />
														)}
														Taken
													</Button>
													<Button
														size="sm"
														variant="outline"
														className="h-7 px-2 text-xs"
														onClick={handleMissed}
														disabled={pendingDose !== null}
													>
														{pendingDose === "missed" ? (
															<Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
														) : (
															<XCircle className="w-3.5 h-3.5 mr-1" />
														)}
														Missed
													</Button>
												</>
											)}
										</>
									) : minutesToNext !== null ? (
										// Window not open yet — show countdown
										<span className="text-xs text-blue-500 flex items-center gap-1">
											<Clock className="w-3.5 h-3.5" />
											Opens in {minutesToNext} min
										</span>
									) : (
										// All slots expired today — window closed
										<span className="text-xs text-orange-500 flex items-center gap-1">
											<AlertTriangle className="w-3.5 h-3.5" />
											Dose window closed
										</span>
									)}
								</>
							)}
							<Button
								size="sm"
								variant="outline"
								className="h-7 px-2 text-xs"
								onClick={() => onToggleActive(reminder.id, !reminder.isActive)}
								disabled={isExpired}
							>
								<Power className="w-3.5 h-3.5 mr-1" />
								{reminder.isActive ? "Pause" : "Activate"}
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="h-7 px-2 text-xs"
								onClick={() => onEdit(reminder)}
							>
								<Edit className="w-3.5 h-3.5 mr-1" />
								Edit
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
								onClick={handleDelete}
								disabled={isDeleting}
							>
								<Trash2 className="w-3.5 h-3.5 mr-1" />
								Delete
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
