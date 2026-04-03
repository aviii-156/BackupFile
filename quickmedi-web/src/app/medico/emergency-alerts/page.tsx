"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
	AlertCircle,
	Clock,
	CheckCircle,
	Phone,
	MapPin,
	Search,
	Users,
	Ambulance,
	MessageSquare,
	Shield,
	Eye,
	Ban,
	Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EmergencyType = "pharmacy_alert" | "ambulance" | "family_alert";
type EmergencyStatus = "sent" | "acknowledged" | "responded" | "resolved" | "expired";
type VendorAlertStatus = "alerted" | "ignored" | "responded";

interface AlertedVendor {
	vendorId: string;
	alertedAt: Date;
	status: VendorAlertStatus;
}

interface Emergency {
	_id: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	patientLocation: {
		type: "Point";
		coordinates: [number, number];
	};
	medicineNeeded: string;
	notes: string;
	type: EmergencyType;
	status: EmergencyStatus;
	alertedVendors: AlertedVendor[];
	respondedVendorId?: string;
	responseTime?: number;
	respondedAt?: Date;
	smsSent: boolean;
	smsFallback: boolean;
	familyContactsAlerted: string[];
	ambulanceCalled: boolean;
	orderId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const CURRENT_VENDOR_ID = "vendor-123";
const VENDOR_LOCATION: [number, number] = [72.8777, 19.0760];

const MOCK_EMERGENCIES: Emergency[] = [
	{
		_id: "EM-001",
		patientId: "P-001",
		patientName: "Anil Sharma",
		patientPhone: "+91 98765 43210",
		patientLocation: {
			type: "Point",
			coordinates: [72.8856, 19.0825],
		},
		medicineNeeded: "Insulin (Rapid Acting)",
		notes: "Patient with diabetes, urgent requirement. Running out of medicine.",
		type: "pharmacy_alert",
		status: "sent",
		alertedVendors: [
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 300000), status: "alerted" },
			{ vendorId: "vendor-456", alertedAt: new Date(Date.now() - 300000), status: "alerted" },
		],
		smsSent: true,
		smsFallback: false,
		familyContactsAlerted: [],
		ambulanceCalled: false,
		createdAt: new Date(Date.now() - 300000),
		updatedAt: new Date(Date.now() - 300000),
	},
	{
		_id: "EM-002",
		patientId: "P-002",
		patientName: "Meera Gupta",
		patientPhone: "+91 87654 32109",
		patientLocation: {
			type: "Point",
			coordinates: [72.8682, 19.1197],
		},
		medicineNeeded: "Asthma Inhaler (Salbutamol)",
		notes: "Acute asthma attack. Patient unable to breathe properly.",
		type: "ambulance",
		status: "sent",
		alertedVendors: [
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 720000), status: "alerted" },
			{ vendorId: "vendor-789", alertedAt: new Date(Date.now() - 720000), status: "alerted" },
			{ vendorId: "vendor-101", alertedAt: new Date(Date.now() - 720000), status: "alerted" },
		],
		smsSent: true,
		smsFallback: true,
		familyContactsAlerted: ["+91 98000 11111", "+91 97000 22222"],
		ambulanceCalled: true,
		createdAt: new Date(Date.now() - 720000),
		updatedAt: new Date(Date.now() - 720000),
	},
	{
		_id: "EM-003",
		patientId: "P-003",
		patientName: "Rajesh Verma",
		patientPhone: "+91 76543 21098",
		patientLocation: {
			type: "Point",
			coordinates: [72.8401, 19.0596],
		},
		medicineNeeded: "Blood Pressure Medicine (Amlodipine 5mg)",
		notes: "Running out of regular medication. BP reading 160/100.",
		type: "pharmacy_alert",
		status: "acknowledged",
		alertedVendors: [
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 1500000), status: "alerted" },
			{ vendorId: "vendor-202", alertedAt: new Date(Date.now() - 1500000), status: "ignored" },
		],
		smsSent: true,
		smsFallback: false,
		familyContactsAlerted: [],
		ambulanceCalled: false,
		createdAt: new Date(Date.now() - 1500000),
		updatedAt: new Date(Date.now() - 900000),
	},
	{
		_id: "EM-004",
		patientId: "P-004",
		patientName: "Priya Malhotra",
		patientPhone: "+91 99887 76655",
		patientLocation: {
			type: "Point",
			coordinates: [72.8567, 19.0728],
		},
		medicineNeeded: "Paracetamol 650mg, Antibiotic",
		notes: "High fever (103°F) for 2 days. Doctor prescribed medication.",
		type: "family_alert",
		status: "responded",
		alertedVendors: [
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 2100000), status: "responded" },
			{ vendorId: "vendor-303", alertedAt: new Date(Date.now() - 2100000), status: "alerted" },
		],
		respondedVendorId: CURRENT_VENDOR_ID,
		responseTime: 180,
		respondedAt: new Date(Date.now() - 1920000),
		smsSent: true,
		smsFallback: false,
		familyContactsAlerted: ["+91 98111 22333"],
		ambulanceCalled: false,
		createdAt: new Date(Date.now() - 2100000),
		updatedAt: new Date(Date.now() - 1920000),
	},
	{
		_id: "EM-005",
		patientId: "P-005",
		patientName: "Vikram Singh",
		patientPhone: "+91 88776 65544",
		patientLocation: {
			type: "Point",
			coordinates: [72.8921, 19.0892],
		},
		medicineNeeded: "Cardiac Emergency Kit",
		notes: "Chest pain and breathing difficulty. Family called for help.",
		type: "ambulance",
		status: "resolved",
		alertedVendors: [
			{ vendorId: "vendor-404", alertedAt: new Date(Date.now() - 3600000), status: "responded" },
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 3600000), status: "ignored" },
		],
		respondedVendorId: "vendor-404",
		responseTime: 150,
		respondedAt: new Date(Date.now() - 3450000),
		smsSent: true,
		smsFallback: true,
		familyContactsAlerted: ["+91 97222 33444", "+91 96333 44555"],
		ambulanceCalled: true,
		orderId: "ORD-12345",
		createdAt: new Date(Date.now() - 3600000),
		updatedAt: new Date(Date.now() - 3000000),
	},
	{
		_id: "EM-006",
		patientId: "P-006",
		patientName: "Sunita Desai",
		patientPhone: "+91 77665 54433",
		patientLocation: {
			type: "Point",
			coordinates: [72.8334, 19.0412],
		},
		medicineNeeded: "Thyroid Medicine (Levothyroxine)",
		notes: "Regular medication stock finished. Need urgent refill.",
		type: "pharmacy_alert",
		status: "expired",
		alertedVendors: [
			{ vendorId: CURRENT_VENDOR_ID, alertedAt: new Date(Date.now() - 7200000), status: "alerted" },
			{ vendorId: "vendor-505", alertedAt: new Date(Date.now() - 7200000), status: "ignored" },
		],
		smsSent: true,
		smsFallback: false,
		familyContactsAlerted: [],
		ambulanceCalled: false,
		createdAt: new Date(Date.now() - 7200000),
		updatedAt: new Date(Date.now() - 7200000),
	},
];

function calculateDistanceMock(coords: [number, number]): number {
	const [lon1, lat1] = VENDOR_LOCATION;
	const [lon2, lat2] = coords;
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
		Math.cos((lat2 * Math.PI) / 180) *
		Math.sin(dLon / 2) *
		Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function formatTimeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function formatResponseTime(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

interface EmergencyStatsProps {
	emergencies: Emergency[];
}

function EmergencyStats({ emergencies }: EmergencyStatsProps) {
	const stats = useMemo(() => {
		const active = emergencies.filter(
			(e) => e.status !== "resolved" && e.status !== "expired"
		).length;
		const responded = emergencies.filter((e) => e.status === "responded").length;
		const resolved = emergencies.filter((e) => e.status === "resolved").length;
		const responseTimes = emergencies
			.filter((e) => e.responseTime)
			.map((e) => e.responseTime!);
		const avgResponseTime =
			responseTimes.length > 0
				? Math.floor(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
				: 0;
		return { active, responded, resolved, avgResponseTime };
	}, [emergencies]);

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div className="bg-white rounded-md p-5 border-l-4 border-l-red-500 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
						<AlertCircle className="w-6 h-6 text-red-600" />
					</div>
					<div>
						<p className="text-2xl font-bold text-gray-900">{stats.active}</p>
						<p className="text-sm text-muted-foreground">Active Emergencies</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-md p-5 border-l-4 border-l-blue-500 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
						<Eye className="w-6 h-6 text-blue-600" />
					</div>
					<div>
						<p className="text-2xl font-bold text-gray-900">{stats.responded}</p>
						<p className="text-sm text-muted-foreground">Responded</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-md p-5 border-l-4 border-l-green-500 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
						<CheckCircle className="w-6 h-6 text-green-600" />
					</div>
					<div>
						<p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
						<p className="text-sm text-muted-foreground">Resolved</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-md p-5 border-l-4 border-l-purple-500 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
						<Timer className="w-6 h-6 text-purple-600" />
					</div>
					<div>
						<p className="text-2xl font-bold text-gray-900">
							{stats.avgResponseTime > 0 ? formatResponseTime(stats.avgResponseTime) : "N/A"}
						</p>
						<p className="text-sm text-muted-foreground">Avg Response Time</p>
					</div>
				</div>
			</div>
		</div>
	);
}

interface EmergencyFiltersProps {
	searchQuery: string;
	setSearchQuery: (value: string) => void;
	selectedTab: string;
	setSelectedTab: (value: string) => void;
}

function EmergencyFilters({
	searchQuery,
	setSearchQuery,
	selectedTab,
	setSelectedTab,
}: EmergencyFiltersProps) {
	const tabs = [
		"All",
		"Sent",
		"Acknowledged",
		"Responded",
		"Resolved",
		"Expired",
		"Ambulance Only",
	];

	return (
		<div className="bg-white rounded-md p-4 border shadow-sm">
			<div className="flex flex-col gap-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
					<Input
						placeholder="Search by patient name or medicine needed..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					{tabs.map((tab) => (
						<Button
							key={tab}
							variant={selectedTab === tab ? "default" : "outline"}
							size="sm"
							onClick={() => setSelectedTab(tab)}
						>
							{tab}
						</Button>
					))}
				</div>
			</div>
		</div>
	);
}

interface EmergencyCardProps {
	emergency: Emergency;
}

function EmergencyCard({ emergency }: EmergencyCardProps) {
	const distance = calculateDistanceMock(emergency.patientLocation.coordinates);
	const isThisVendorResponded = emergency.respondedVendorId === CURRENT_VENDOR_ID;
	const thisVendorAlert = emergency.alertedVendors.find((v) => v.vendorId === CURRENT_VENDOR_ID);

	const typeConfig = {
		pharmacy_alert: { label: "Pharmacy Alert", bgColor: "bg-orange-100", textColor: "text-orange-700", borderColor: "border-orange-200" },
		ambulance: { label: "Ambulance", bgColor: "bg-red-100", textColor: "text-red-700", borderColor: "border-red-300" },
		family_alert: { label: "Family Alert", bgColor: "bg-blue-100", textColor: "text-blue-700", borderColor: "border-blue-200" },
	};

	const statusConfig = {
		sent: { color: "bg-yellow-100 text-yellow-700" },
		acknowledged: { color: "bg-blue-100 text-blue-700" },
		responded: { color: "bg-green-100 text-green-700" },
		resolved: { color: "bg-gray-100 text-gray-700" },
		expired: { color: "bg-gray-200 text-gray-600" },
	};

	const isResolved = emergency.status === "resolved" || emergency.status === "expired";
	const isAmbulance = emergency.type === "ambulance";

	return (
		<div
			className={cn(
				"bg-white rounded-md p-6 border-2 shadow-md transition-all",
				isResolved && "opacity-60",
				isAmbulance && "animate-pulse-border border-red-300",
				!isAmbulance && "border-gray-200"
			)}
		>
			<div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
				<div className="flex items-start gap-3">
					<div
						className={cn(
							"w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
							emergency.type === "pharmacy_alert" && "bg-orange-500",
							emergency.type === "ambulance" && "bg-red-600",
							emergency.type === "family_alert" && "bg-blue-500"
						)}
					>
						{emergency.type === "ambulance" ? (
							<Ambulance className="w-6 h-6 text-white" />
						) : emergency.type === "family_alert" ? (
							<Users className="w-6 h-6 text-white" />
						) : (
							<AlertCircle className="w-6 h-6 text-white" />
						)}
					</div>
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1 flex-wrap">
							<span
								className={cn(
									"text-xs px-2.5 py-1 rounded-full font-medium border",
									typeConfig[emergency.type].bgColor,
									typeConfig[emergency.type].textColor,
									typeConfig[emergency.type].borderColor
								)}
							>
								{typeConfig[emergency.type].label}
							</span>
							<span
								className={cn(
									"text-xs px-2.5 py-1 rounded-full font-medium",
									statusConfig[emergency.status].color
								)}
							>
								{emergency.status}
							</span>
							<span className="text-xs text-muted-foreground">
								{formatTimeAgo(emergency.createdAt)}
							</span>
						</div>
						<h3 className="font-bold text-lg text-gray-900 mb-1">{emergency.medicineNeeded}</h3>
						<p className="text-sm text-muted-foreground">ID: {emergency._id}</p>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="grid md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold text-muted-foreground uppercase">Patient</p>
						<p className="font-semibold text-gray-900">{emergency.patientName}</p>
						<button className="text-sm text-primary flex items-center gap-1 hover:underline">
							<Phone className="w-3.5 h-3.5" />
							{emergency.patientPhone}
						</button>
					</div>
					<div className="space-y-2">
						<p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
						<p className="text-sm flex items-start gap-1">
							<MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<span>
								{emergency.patientLocation.coordinates[1].toFixed(4)},{" "}
								{emergency.patientLocation.coordinates[0].toFixed(4)}
							</span>
						</p>
						<p className="text-sm text-orange-600 font-semibold">{distance.toFixed(2)} km away</p>
					</div>
				</div>

				<div className="bg-gray-50 p-4 rounded-lg">
					<p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Notes</p>
					<p className="text-sm text-gray-700">{emergency.notes}</p>
				</div>

				<div className="flex flex-wrap gap-2">
					{emergency.ambulanceCalled && (
						<span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
							<Ambulance className="w-3 h-3" />
							Ambulance Called
						</span>
					)}
					{emergency.smsFallback && (
						<span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium flex items-center gap-1">
							<MessageSquare className="w-3 h-3" />
							SMS Fallback
						</span>
					)}
					{emergency.familyContactsAlerted.length > 0 && (
						<span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
							{emergency.familyContactsAlerted.length} Family Contacts Alerted
						</span>
					)}
				</div>

				<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
					<div className="flex items-center justify-between mb-2">
						<p className="text-xs font-semibold text-blue-900 uppercase flex items-center gap-1">
							<Shield className="w-3.5 h-3.5" />
							Vendor Broadcast
						</p>
						<span className="text-xs text-blue-700 font-medium">
							{emergency.alertedVendors.length} vendors alerted
						</span>
					</div>
					{thisVendorAlert && (
						<p className="text-xs text-blue-700 mb-1">
							You were alerted {formatTimeAgo(thisVendorAlert.alertedAt)} • Status: {thisVendorAlert.status}
						</p>
					)}
					{emergency.respondedVendorId && (
						<div className="mt-2 pt-2 border-t border-blue-200">
							<p className="text-xs text-blue-900 font-semibold">
								{isThisVendorResponded ? "You" : `Vendor ${emergency.respondedVendorId}`} responded
							</p>
							<p className="text-xs text-blue-700">
								Response Time: {formatResponseTime(emergency.responseTime!)} •{" "}
								{formatTimeAgo(emergency.respondedAt!)}
							</p>
						</div>
					)}
				</div>

				{!isResolved && (
					<div className="flex flex-wrap gap-2 pt-2">
						{emergency.status === "sent" && (
							<>
								<Button size="sm" className="bg-blue-600 hover:bg-blue-700">
									<Eye className="w-4 h-4 mr-1.5" />
									Acknowledge
								</Button>
								<Button size="sm" className="bg-green-600 hover:bg-green-700">
									<CheckCircle className="w-4 h-4 mr-1.5" />
									Respond
								</Button>
								<Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
									<Ban className="w-4 h-4 mr-1.5" />
									Ignore
								</Button>
							</>
						)}
						{emergency.status === "acknowledged" && (
							<Button size="sm" className="bg-green-600 hover:bg-green-700">
								<CheckCircle className="w-4 h-4 mr-1.5" />
								Respond
							</Button>
						)}
						{emergency.status === "responded" && (
							<Button size="sm" className="bg-purple-600 hover:bg-purple-700">
								<CheckCircle className="w-4 h-4 mr-1.5" />
								Mark as Resolved
							</Button>
						)}
						<Button size="sm" variant="outline">
							<Phone className="w-4 h-4 mr-1.5" />
							Call Patient
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export default function EmergencyAlertsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTab, setSelectedTab] = useState("All");

	const filteredEmergencies = useMemo(() => {
		let filtered = MOCK_EMERGENCIES;

		if (selectedTab !== "All") {
			if (selectedTab === "Ambulance Only") {
				filtered = filtered.filter((e) => e.type === "ambulance");
			} else {
				const status = selectedTab.toLowerCase() as EmergencyStatus;
				filtered = filtered.filter((e) => e.status === status);
			}
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(e) =>
					e.patientName.toLowerCase().includes(query) ||
					e.medicineNeeded.toLowerCase().includes(query)
			);
		}

		return filtered.sort((a, b) => {
			if (a.type === "ambulance" && b.type !== "ambulance") return -1;
			if (a.type !== "ambulance" && b.type === "ambulance") return 1;
			return b.createdAt.getTime() - a.createdAt.getTime();
		});
	}, [searchQuery, selectedTab]);

	const hasCritical = MOCK_EMERGENCIES.some(
		(e) => (e.type === "ambulance" || e.ambulanceCalled) && e.status !== "resolved" && e.status !== "expired"
	);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
						<AlertCircle className="w-8 h-8 text-red-600" />
						Emergency Command Center
						{hasCritical && (
							<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
								CRITICAL
							</span>
						)}
					</h1>
					<p className="text-muted-foreground mt-1">Live emergency alerts from nearby patients</p>
				</div>
			</div>

			<EmergencyStats emergencies={MOCK_EMERGENCIES} />

			<EmergencyFilters
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				selectedTab={selectedTab}
				setSelectedTab={setSelectedTab}
			/>

			<div className="space-y-4">
				{filteredEmergencies.length === 0 ? (
					<div className="bg-white rounded-md p-12 text-center border shadow-sm">
						<CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
						<h3 className="text-xl font-semibold mb-2">No emergencies found</h3>
						<p className="text-muted-foreground">
							{searchQuery
								? "Try adjusting your search or filters"
								: "All caught up! No pending emergency alerts."}
						</p>
					</div>
				) : (
					filteredEmergencies.map((emergency) => (
						<EmergencyCard key={emergency._id} emergency={emergency} />
					))
				)}
			</div>
		</div>
	);
}
