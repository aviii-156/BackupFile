"use client";

import { useState, useEffect } from "react";
import { Reminder, ReminderFormData, Frequency, DayOfWeek } from "@/types/reminder";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { X, Plus, Calendar } from "lucide-react";

interface ReminderFormProps {
	reminder?: Reminder;
	onSubmit: (data: ReminderFormData) => void;
	onCancel: () => void;
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
	{ value: "daily", label: "Daily" },
	{ value: "twice_daily", label: "Twice Daily" },
	{ value: "thrice_daily", label: "3x Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "custom", label: "Custom Days" },
];

const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
	{ value: "mon", label: "Mon" },
	{ value: "tue", label: "Tue" },
	{ value: "wed", label: "Wed" },
	{ value: "thu", label: "Thu" },
	{ value: "fri", label: "Fri" },
	{ value: "sat", label: "Sat" },
	{ value: "sun", label: "Sun" },
];

export function ReminderForm({ reminder, onSubmit, onCancel }: ReminderFormProps) {
	const [formData, setFormData] = useState<ReminderFormData>({
		medicineName: "",
		medicineId: "",
		dosage: "",
		instruction: "",
		times: ["08:00"],
		frequency: "daily",
		customDays: [],
		startDate: new Date().toISOString().split("T")[0],
		endDate: "",
		isActive: true,
		prescriptionId: "",
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Load reminder data if editing
	useEffect(() => {
		if (reminder) {
			setFormData({
				medicineName: reminder.medicineName,
				medicineId: reminder.medicineId,
				dosage: reminder.dosage,
				instruction: reminder.instruction,
				times: reminder.times,
				frequency: reminder.frequency,
				customDays: reminder.customDays || [],
				startDate: reminder.startDate.split("T")[0],
				endDate: reminder.endDate ? reminder.endDate.split("T")[0] : "",
				isActive: reminder.isActive,
				prescriptionId: reminder.prescriptionId,
			});
		}
	}, [reminder]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.medicineName.trim()) {
			newErrors.medicineName = "Medicine name is required";
		}

		if (formData.times.length === 0) {
			newErrors.times = "At least one reminder time is required";
		}

		if (!formData.startDate) {
			newErrors.startDate = "Start date is required";
		}

		if (formData.endDate && formData.startDate) {
			if (new Date(formData.endDate) < new Date(formData.startDate)) {
				newErrors.endDate = "End date must be after start date";
			}
		}

		if (
			formData.frequency === "custom" &&
			(!formData.customDays || formData.customDays.length === 0)
		) {
			newErrors.customDays = "Select at least one day for custom frequency";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateForm()) {
			onSubmit(formData);
		}
	};

	const addTime = () => {
		setFormData((prev) => ({
			...prev,
			times: [...prev.times, "12:00"],
		}));
	};

	const removeTime = (index: number) => {
		setFormData((prev) => ({
			...prev,
			times: prev.times.filter((_, i) => i !== index),
		}));
	};

	const updateTime = (index: number, value: string) => {
		setFormData((prev) => ({
			...prev,
			times: prev.times.map((time, i) => (i === index ? value : time)),
		}));
	};

	const toggleDay = (day: DayOfWeek) => {
		setFormData((prev) => ({
			...prev,
			customDays: prev.customDays?.includes(day)
				? prev.customDays.filter((d) => d !== day)
				: [...(prev.customDays || []), day],
		}));
	};

	return (
		<form onSubmit={handleSubmit}>
			<div className="space-y-4">
				{/* Medicine Name */}
				<div>
					<label className="block text-sm font-medium mb-2">
						Medicine Name <span className="text-red-500">*</span>
					</label>
					<Input
						value={formData.medicineName}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								medicineName: e.target.value,
							}))
						}
						placeholder="e.g., Paracetamol 500mg"
						className={errors.medicineName ? "border-red-500" : ""}
					/>
					{errors.medicineName && (
						<p className="text-xs text-red-500 mt-1">{errors.medicineName}</p>
					)}
				</div>

			{/* Dosage and Instruction */}
			<div className="grid md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium mb-2">Dosage</label>
					<Input
						value={formData.dosage}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								dosage: e.target.value,
							}))
						}
						placeholder="e.g., 1 tablet"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-2">
						Instruction
					</label>
					<Input
						value={formData.instruction}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								instruction: e.target.value,
							}))
						}
						placeholder="e.g., After food"
					/>
				</div>
			</div>

			{/* Frequency */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Frequency <span className="text-red-500">*</span>
				</label>
				<select
					value={formData.frequency}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							frequency: e.target.value as Frequency,
							...(e.target.value !== "custom" && { customDays: [] }),
						}))
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
				>
					{FREQUENCY_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
						{formData.frequency === "custom" && (
							<div>
								<label className="block text-sm font-medium mb-2">
									Select Days <span className="text-red-500">*</span>
								</label>
								<div className="flex flex-wrap gap-2">
									{DAYS_OF_WEEK.map((day) => (
										<Badge
											key={day.value}
											onClick={() => toggleDay(day.value)}
											className={`cursor-pointer ${
												formData.customDays?.includes(day.value)
													? "bg-teal-600 text-white hover:bg-teal-700"
													: "bg-gray-200 text-gray-700 hover:bg-gray-300"
											}`}
										>
											{day.label}
										</Badge>
									))}
								</div>
								{errors.customDays && (
									<p className="text-xs text-red-500 mt-1">
										{errors.customDays}
									</p>
								)}
							</div>
						)}

			{/* Reminder Times */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Reminder Times <span className="text-red-500">*</span>
				</label>
				<div className="space-y-2">
					{formData.times.map((time, index) => (
						<div key={index} className="flex gap-2">
							<Input
								type="time"
								value={time}
								onChange={(e) => updateTime(index, e.target.value)}
								className="flex-1"
							/>
							{formData.times.length > 1 && (
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => removeTime(index)}
								>
									<X className="w-4 h-4" />
								</Button>
							)}
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addTime}
						className="w-full"
					>
						<Plus className="w-4 h-4 mr-2" />
						Add Time
					</Button>
				</div>
				{errors.times && (
					<p className="text-xs text-red-500 mt-1">{errors.times}</p>
				)}
			</div>
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Start Date <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<Input
										type="date"
										value={formData.startDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												startDate: e.target.value,
											}))
										}
										className={errors.startDate ? "border-red-500" : ""}
									/>
									<Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
								</div>
								{errors.startDate && (
									<p className="text-xs text-red-500 mt-1">
										{errors.startDate}
									</p>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium mb-2">
									End Date (Optional)
								</label>
								<div className="relative">
									<Input
										type="date"
										value={formData.endDate}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												endDate: e.target.value,
											}))
										}
										className={errors.endDate ? "border-red-500" : ""}
									/>
									<Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
								</div>
								{errors.endDate && (
									<p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
								)}
							</div>
						</div>

			{/* Prescription ID */}
			<div>
				<label className="block text-sm font-medium mb-2">
					Link to Prescription (Optional)
				</label>
				<Input
					value={formData.prescriptionId}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							prescriptionId: e.target.value,
						}))
					}
					placeholder="Prescription ID"
				/>
			</div>

			{/* Active Toggle */}
			<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
				<input
					type="checkbox"
					id="isActive"
					checked={formData.isActive}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							isActive: e.target.checked,
						}))
					}
					className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
				/>
				<label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
					Activate this reminder immediately
				</label>
			</div>
				<div className="flex gap-2 pt-4">
					<Button type="submit" className="flex-1">
						{reminder ? "Update Reminder" : "Create Reminder"}
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				</div>
			</div>
		</form>
	);
}
