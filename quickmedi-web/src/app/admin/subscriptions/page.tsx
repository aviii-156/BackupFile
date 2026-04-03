"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CreditCard, Search, TrendingUp, DollarSign, Users, Calendar, RefreshCcw, XCircle, RefreshCw,
} from "lucide-react";
import { adminService } from "@/services/admin.service";

type SubStatus = "active" | "cancelled" | "expired" | "paused";

type Subscription = {
  _id: string;
  userId?: { name?: string; email?: string; phone?: string };
  plan: "free" | "pro";
  amount?: number;
  startDate?: string;
  endDate?: string;
  status: SubStatus;
  autoRenew: boolean;
  cancelReason?: string;
  stripeSubscriptionId?: string;
};

type FilterTab = "all" | SubStatus;

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalSubscriptions: 0 });
  const [summary, setSummary] = useState({ totalRevenue: 0 });
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<FilterTab>("all");

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllSubscriptions({
        status: selectedTab === "all" ? undefined : selectedTab,
        page,
        limit: 20,
      });
      if (res.success && res.data) {
        setSubscriptions(res.data.subscriptions as unknown as Subscription[]);
        setPagination(res.data.pagination as any);
        setSummary(res.data.summary as any);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedTab, page]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  const filtered = subscriptions.filter((s) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (s.userId?.name ?? "").toLowerCase().includes(q) ||
      (s.userId?.email ?? "").toLowerCase().includes(q) ||
      s._id.toLowerCase().includes(q)
    );
  });

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const expiringCount = subscriptions.filter((s) => {
    if (!s.endDate) return false;
    const diff = new Date(s.endDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const statusBadge: Record<SubStatus, string> = {
    active: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-600",
    cancelled: "bg-gray-100 text-gray-600",
    paused: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Subscription Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage user subscriptions and revenue</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => loadSubscriptions()}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs">Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Subs", value: String(activeCount), icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Total Revenue", value: loading ? "—" : `₹${(summary.totalRevenue / 100).toFixed(0)}`, icon: DollarSign, bg: "bg-green-50", color: "text-green-600" },
          { label: "Total Subscriptions", value: String(pagination.totalSubscriptions), icon: CreditCard, bg: "bg-purple-50", color: "text-purple-600" },
          { label: "Expiring in 7d", value: String(expiringCount), icon: Calendar, bg: "bg-orange-50", color: "text-orange-600" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{loading ? "—" : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-3 border border-border card-shadow flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user, email or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-1.5 bg-muted rounded-lg p-1">
          {(["all","active","expired","cancelled"] as const).map((tab) => (
            <button key={tab} onClick={() => { setSelectedTab(tab); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border card-shadow overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
          {["User","Plan","Period","Status","Actions"].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Loading subscriptions...</div>
          ) : filtered.map((s) => (
            <div key={s._id} className="grid grid-cols-[2fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-3 items-start hover:bg-accent/30 transition-colors">
              <div>
                <p className="text-sm font-medium">{s.userId?.name ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">{s.userId?.email ?? ""}</p>
                <p className="text-[11px] text-muted-foreground">{s.userId?.phone ?? ""} · {s._id.slice(-8).toUpperCase()}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full capitalize">{s.plan}</span>
                {s.amount != null && (
                  <p className="text-sm font-bold mt-1">₹{s.amount}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></p>
                )}
                {s.stripeSubscriptionId && <p className="text-[10px] text-muted-foreground font-mono">{s.stripeSubscriptionId.slice(0, 14)}…</p>}
              </div>
              <div>
                {s.startDate && s.endDate && (
                  <p className="text-xs">{new Date(s.startDate).toLocaleDateString("en-IN")} → {new Date(s.endDate).toLocaleDateString("en-IN")}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  {s.autoRenew ? (
                    <><RefreshCcw className="w-3 h-3 text-green-600" /><span className="text-[11px] text-green-600">Auto-renew on</span></>
                  ) : (
                    <><XCircle className="w-3 h-3 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">No auto-renew</span></>
                  )}
                </div>
                {s.cancelReason && <p className="text-[10px] text-red-500 mt-0.5">Reason: {s.cancelReason}</p>}
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${statusBadge[s.status]}`}>{s.status}</span>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs">View</Button>
            </div>
          ))}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">No subscriptions found.</div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">Page {pagination.currentPage} of {pagination.totalPages} &mdash; {pagination.totalSubscriptions} total</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
