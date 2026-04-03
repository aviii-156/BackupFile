"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Store,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  X,
  ShieldOff,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  Hash,
} from "lucide-react";
import { adminService } from "@/services/admin.service";

type VendorData = {
  _id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; pincode?: string };
  licenseNumber: string;
  gstNumber?: string;
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  createdAt: string;
  approvalNote?: string;
  approvedAt?: string;
  rejectedAt?: string;
  storePhoto?: string;
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; storeName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewVendor, setViewVendor] = useState<VendorData | null>(null);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllVendors({
        status: selectedTab,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });
      if (res.success && res.data) {
        setVendors(res.data.vendors as unknown as VendorData[]);
        setTotalPages((res.data.pagination as any)?.totalPages ?? 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedTab, searchQuery, page]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  // Load summary counts once on mount
  useEffect(() => {
    async function loadSummary() {
      try {
        const [all, pending, approved, rejected] = await Promise.all([
          adminService.getAllVendors({ status: "all", limit: 1 }),
          adminService.getAllVendors({ status: "pending", limit: 1 }),
          adminService.getAllVendors({ status: "approved", limit: 1 }),
          adminService.getAllVendors({ status: "rejected", limit: 1 }),
        ]);
        setSummary({
          total: (all.data?.pagination as any)?.totalVendors ?? 0,
          pending: (pending.data?.pagination as any)?.totalVendors ?? 0,
          approved: (approved.data?.pagination as any)?.totalVendors ?? 0,
          rejected: (rejected.data?.pagination as any)?.totalVendors ?? 0,
        });
      } catch { /* ignore */ }
    }
    loadSummary();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await adminService.approveVendor(id);
      if (res.success) {
        setVendors(v => v.map(x => x._id === id
          ? { ...x, approvalStatus: "approved", isActive: true, approvedAt: new Date().toISOString() }
          : x));
        setSummary(s => ({ ...s, pending: Math.max(0, s.pending - 1), approved: s.approved + 1 }));
      }
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const { id } = rejectModal;
    setActionLoading(id);
    try {
      const res = await adminService.rejectVendor(id, rejectReason);
      if (res.success) {
        setVendors(v => v.map(x => x._id === id
          ? { ...x, approvalStatus: "rejected", isActive: false, rejectedAt: new Date().toISOString(), approvalNote: rejectReason }
          : x));
        setSummary(s => ({ ...s, pending: Math.max(0, s.pending - 1), rejected: s.rejected + 1 }));
        setRejectModal(null);
        setRejectReason("");
      }
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const handleSuspendToggle = async (vendor: VendorData) => {
    const newActive = !vendor.isActive;
    setActionLoading(vendor._id);
    try {
      const res = await adminService.updateVendorStatus(vendor._id, newActive);
      if (res.success) {
        const updated = { ...vendor, isActive: newActive };
        setVendors(v => v.map(x => x._id === vendor._id ? updated : x));
        setViewVendor(updated);
      }
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const badge = (status: VendorData["approvalStatus"]) =>
    ({ pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" })[status];

  return (
    <div className="space-y-4">
      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-base">Reject &quot;{rejectModal.storeName}&quot;</h3>
            <p className="text-sm text-muted-foreground">Provide a reason for rejection. This will be recorded on the vendor&apos;s account.</p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!rejectReason.trim() || !!actionLoading}
                onClick={handleReject}
              >
                {actionLoading ? "Rejecting..." : "Reject Vendor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vendor Detail / Profile Modal ────────────────────────────────── */}
      {viewVendor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{viewVendor.storeName}</h3>
                  <p className="text-xs text-muted-foreground">Owner: {viewVendor.ownerName}</p>
                </div>
              </div>
              <button
                onClick={() => setViewVendor(null)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${badge(viewVendor.approvalStatus)}`}>
                  {viewVendor.approvalStatus}
                </span>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  viewVendor.isActive ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                }`}>
                  {viewVendor.isActive ? "Active" : "Suspended"}
                </span>
              </div>

              {/* Store photo */}
              {viewVendor.storePhoto && (
                <img
                  src={viewVendor.storePhoto}
                  alt="Store"
                  className="w-full h-36 object-cover rounded-md border border-border"
                />
              )}

              {/* Contact */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={viewVendor.email} />
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={viewVendor.phone ?? "—"} />
                <InfoRow
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label="Address"
                  value={[viewVendor.address?.street, viewVendor.address?.city, viewVendor.address?.state, viewVendor.address?.pincode].filter(Boolean).join(", ") || "—"}
                />
              </div>

              {/* Docs */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">License &amp; Documents</h4>
                <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="License No." value={viewVendor.licenseNumber} mono />
                {viewVendor.gstNumber && (
                  <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="GST Number" value={viewVendor.gstNumber} mono />
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Registered" value={new Date(viewVendor.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                {viewVendor.approvedAt && (
                  <InfoRow icon={<CheckCircle className="w-3.5 h-3.5 text-green-600" />} label="Approved On" value={new Date(viewVendor.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                )}
                {viewVendor.rejectedAt && (
                  <InfoRow icon={<XCircle className="w-3.5 h-3.5 text-red-500" />} label="Rejected On" value={new Date(viewVendor.rejectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
                )}
                {viewVendor.approvalNote && (
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic">
                    Note: {viewVendor.approvalNote}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-2 justify-between sticky bottom-0">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewVendor(null)}>
                Close
              </Button>
              {viewVendor.approvalStatus === "approved" && (
                <Button
                  size="sm"
                  className={`h-8 text-xs gap-1.5 ${
                    viewVendor.isActive
                      ? "bg-orange-600 hover:bg-orange-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                  disabled={actionLoading === viewVendor._id}
                  onClick={() => handleSuspendToggle(viewVendor)}
                >
                  {viewVendor.isActive ? (
                    <><ShieldOff className="w-3.5 h-3.5" />{actionLoading === viewVendor._id ? "Suspending…" : "Suspend Vendor"}</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5" />{actionLoading === viewVendor._id ? "Unsuspending…" : "Unsuspend Vendor"}</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Vendor Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage pharmacy partners and applications</p>
        </div>
        <Button size="sm" className="h-8 text-xs">Export</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Vendors", value: String(summary.total), icon: Store, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Pending Review", value: String(summary.pending), icon: Clock, bg: "bg-yellow-50", color: "text-yellow-600" },
          { label: "Approved", value: String(summary.approved), icon: CheckCircle, bg: "bg-green-50", color: "text-green-600" },
          { label: "Rejected", value: String(summary.rejected), icon: XCircle, bg: "bg-red-50", color: "text-red-600" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Banner */}
      {summary.pending > 0 && selectedTab !== "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-700 flex-1">
            <span className="font-semibold">{summary.pending} vendor applications</span> are waiting for review.
          </p>
          <button onClick={() => { setSelectedTab("pending"); setPage(1); }} className="text-xs font-semibold text-yellow-700 underline">
            View now
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 border border-border card-shadow flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by store name, owner or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 bg-muted rounded-lg p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setSelectedTab(tab); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                selectedTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg border border-border card-shadow overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
          {["Store", "Contact & Location", "License / GST", "Status", "Actions"].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No vendors found.</div>
          ) : vendors.map((v) => (
            <div key={v._id} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-4 py-3 items-start hover:bg-accent/30 transition-colors">
              {/* Store */}
              <div>
                <p className="text-sm font-semibold">{v.storeName}</p>
                <p className="text-[11px] text-muted-foreground">Owner: {v.ownerName}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(v.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              {/* Contact */}
              <div>
                <p className="text-xs">{v.email}</p>
                <p className="text-[11px] text-muted-foreground">{v.phone ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {v.address?.city ?? "—"}, {v.address?.state ?? "—"}
                </p>
              </div>
              {/* License */}
              <div>
                <p className="text-[11px] font-mono">{v.licenseNumber}</p>
                {v.gstNumber && <p className="text-[11px] text-muted-foreground font-mono">{v.gstNumber}</p>}
                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-blue-600">
                  <FileText className="w-2.5 h-2.5" />
                  Docs submitted
                </span>
              </div>
              {/* Status */}
              <div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${badge(v.approvalStatus)}`}>
                  {v.approvalStatus}
                </span>
                {!v.isActive && v.approvalStatus === "approved" && (
                  <p className="text-[10px] text-orange-600 mt-0.5 font-medium">Suspended</p>
                )}
                {v.approvedAt && (
                  <p className="text-[10px] text-green-600 mt-0.5">Approved: {new Date(v.approvedAt).toLocaleDateString("en-IN")}</p>
                )}
                {v.rejectedAt && (
                  <p className="text-[10px] text-red-500 mt-0.5">Rejected: {new Date(v.rejectedAt).toLocaleDateString("en-IN")}</p>
                )}
                {v.approvalNote && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5 max-w-30 truncate" title={v.approvalNote}>Note: {v.approvalNote}</p>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-1.5">
                {v.approvalStatus === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                      disabled={actionLoading === v._id}
                      onClick={() => handleApprove(v._id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {actionLoading === v._id ? "…" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      disabled={actionLoading === v._id}
                      onClick={() => setRejectModal({ id: v._id, storeName: v.storeName })}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewVendor(v)}
                  >
                    View
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm flex items-center px-3">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xs font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
