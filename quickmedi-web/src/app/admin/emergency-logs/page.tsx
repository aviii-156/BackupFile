"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, Search, Clock, CheckCircle, XCircle, MapPin, Phone, MessageSquare, Siren, RefreshCw } from "lucide-react";
import { adminService } from "@/services/admin.service";

type EStatus = "sent" | "acknowledged" | "responded" | "resolved" | "expired";
type EType = "pharmacy_alert" | "ambulance" | "family_alert";

type Emergency = {
_id: string;
patientName: string;
patientPhone: string;
patientLocation?: { coordinates?: [number, number] };
medicineNeeded?: string;
notes?: string;
type: EType;
status: EStatus;
alertedVendors: { vendorId?: string; alertedAt?: string; status?: string }[];
respondedVendorId?: { storeName?: string };
responseTime?: number;
smsSent: boolean;
familyContactsAlerted?: string[];
ambulanceCalled: boolean;
createdAt: string;
};

type FilterTab = "all" | EStatus;

export default function EmergencyLogsPage() {
const [emergencies, setEmergencies] = useState<Emergency[]>([]);
const [loading, setLoading] = useState(true);
const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalEmergencies: 0 });
const [page, setPage] = useState(1);
const [searchQuery, setSearchQuery] = useState("");
const [selectedTab, setSelectedTab] = useState<FilterTab>("all");

const loadEmergencies = useCallback(async () => {
setLoading(true);
try {
const res = await adminService.getAllEmergencies({
status: selectedTab === "all" ? undefined : selectedTab,
page,
limit: 20,
});
if (res.success && res.data) {
setEmergencies(res.data.emergencies as unknown as Emergency[]);
setPagination(res.data.pagination as any);
}
} catch {
// ignore
} finally {
setLoading(false);
}
}, [selectedTab, page]);

useEffect(() => { loadEmergencies(); }, [loadEmergencies]);

const filtered = emergencies.filter((log) => {
const q = searchQuery.toLowerCase();
if (!q) return true;
return (
log.patientName.toLowerCase().includes(q) ||
(log.medicineNeeded ?? "").toLowerCase().includes(q) ||
log._id.toLowerCase().includes(q)
);
});

const resolved = emergencies.filter((e) => e.status === "resolved").length;
const active = emergencies.filter((e) => ["sent","acknowledged","responded"].includes(e.status)).length;
const expired = emergencies.filter((e) => e.status === "expired").length;

const statusBadge: Record<EStatus, string> = {
sent: "bg-blue-100 text-blue-700",
acknowledged: "bg-yellow-100 text-yellow-700",
responded: "bg-purple-100 text-purple-700",
resolved: "bg-green-100 text-green-700",
expired: "bg-red-100 text-red-600",
};
const typeBadge: Record<EType, string> = {
pharmacy_alert: "bg-orange-100 text-orange-700",
ambulance: "bg-red-100 text-red-700",
family_alert: "bg-purple-100 text-purple-700",
};

return (
<div className="space-y-4">
<div className="flex items-center justify-between">
<div>
<h1 className="text-lg font-bold">Emergency Logs</h1>
<p className="text-xs text-muted-foreground mt-0.5">Monitor and resolve emergency medicine requests</p>
</div>
<div className="flex gap-2">
<Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => loadEmergencies()}>
<RefreshCw className="w-3 h-3" /> Refresh
</Button>
<Button size="sm" className="h-8 text-xs">Export</Button>
</div>
</div>

<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
{[
{ label: "Total Requests", value: String(pagination.totalEmergencies), icon: AlertCircle, bg: "bg-blue-50", color: "text-blue-600" },
{ label: "Resolved", value: String(resolved), icon: CheckCircle, bg: "bg-green-50", color: "text-green-600" },
{ label: "Active / Sent", value: String(active), icon: Clock, bg: "bg-yellow-50", color: "text-yellow-600" },
{ label: "Expired", value: String(expired), icon: XCircle, bg: "bg-red-50", color: "text-red-600" },
].map(({ label, value, icon: Icon, bg, color }) => (
<div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
<div className="flex items-center gap-2">
<div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
<div><p className="text-lg font-bold">{loading ? "—" : value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
</div>
</div>
))}
</div>

<div className="bg-white rounded-lg p-3 border border-border card-shadow flex flex-col md:flex-row gap-3">
<div className="flex-1 relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
<Input placeholder="Search by patient, medicine or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
</div>
<div className="flex gap-1.5 bg-muted rounded-lg p-1 flex-wrap">
{(["all","sent","resolved","expired"] as const).map((tab) => (
<button key={tab} onClick={() => { setSelectedTab(tab); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{tab}</button>
))}
</div>
</div>

<div className="bg-white rounded-lg border border-border card-shadow overflow-hidden">
<div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
{["Patient","Request Details","Response","Alerts Sent","Status"].map((h) => (
<span key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
))}
</div>
<div className="divide-y divide-border">
{loading ? (
<div className="text-center py-10 text-sm text-muted-foreground">Loading emergency logs...</div>
) : filtered.map((log) => (
<div key={log._id} className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_auto] gap-3 px-4 py-3 items-start hover:bg-accent/30 transition-colors">
<div>
<p className="text-sm font-semibold">{log.patientName}</p>
<p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{log.patientPhone}</p>
{log.patientLocation?.coordinates && (
<p className="text-[11px] text-muted-foreground flex items-center gap-1">
<MapPin className="w-2.5 h-2.5" />{log.patientLocation.coordinates[1].toFixed(4)}, {log.patientLocation.coordinates[0].toFixed(4)}
</p>
)}
<p className="text-[10px] text-muted-foreground">{log._id.slice(-8).toUpperCase()} · {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
</div>
<div>
<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge[log.type]}`}>{log.type.replace(/_/g, " ")}</span>
{log.medicineNeeded && <p className="text-xs font-medium mt-1">{log.medicineNeeded}</p>}
{log.notes && <p className="text-[11px] text-muted-foreground">{log.notes}</p>}
</div>
<div>
{log.respondedVendorId?.storeName
? <p className="text-xs font-medium text-green-700">{log.respondedVendorId.storeName}</p>
: <p className="text-xs text-muted-foreground">No response yet</p>}
{log.responseTime && (
<p className="text-[11px] text-muted-foreground flex items-center gap-1">
<Clock className="w-2.5 h-2.5" />{Math.floor(log.responseTime / 60)} min {log.responseTime % 60}s
</p>
)}
</div>
<div className="flex flex-wrap gap-1">
{log.alertedVendors.length > 0 && <span className="text-[10px] font-medium bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{log.alertedVendors.length} vendors</span>}
{log.smsSent && <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />SMS</span>}
{log.ambulanceCalled && <span className="text-[10px] font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Siren className="w-2.5 h-2.5" />Ambulance</span>}
{(log.familyContactsAlerted ?? []).length > 0 && <span className="text-[10px] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Family</span>}
</div>
<span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${statusBadge[log.status]}`}>{log.status}</span>
</div>
))}
</div>
{!loading && filtered.length === 0 && (
<div className="text-center py-10 text-sm text-muted-foreground">No emergency logs found.</div>
)}
</div>

{pagination.totalPages > 1 && (
<div className="flex items-center justify-between pt-1">
<p className="text-xs text-muted-foreground">Page {pagination.currentPage} of {pagination.totalPages} &mdash; {pagination.totalEmergencies} total</p>
<div className="flex gap-2">
<Button size="sm" variant="outline" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
<Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
</div>
</div>
)}
</div>
);
}
