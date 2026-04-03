"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DollarSign, TrendingUp, Users, Package, Percent, RefreshCw } from "lucide-react";
import { adminService } from "@/services/admin.service";

type Overview = {
  totalSaved: number;
  usersBenefited: number;
  avgSavingPerUser: number;
  thisMonthSaved: number;
  totalDeliveredOrders: number;
};

type MonthTrend = { _id: { year: number; month: number }; saved: number };
type RecentSaving = { _id: string; patientId?: { name?: string }; items: { medicineName?: string }[]; savedAmount: number; totalAmount: number; createdAt: string };

const MONTH_LABELS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

function formatLakh(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

export default function SavingsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthTrend[]>([]);
  const [recentSavings, setRecentSavings] = useState<RecentSaving[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSavingsStats();
      if (res.success && res.data) {
        setOverview(res.data.overview as Overview);
        setMonthlyTrend(res.data.monthlyTrend as MonthTrend[]);
        setRecentSavings(res.data.recentSavings as RecentSaving[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSavings(); }, []);

  // Pad / slice trend to last 12 entries
  const trend = monthlyTrend.slice(-12);
  const maxTrend = Math.max(...trend.map((t) => t.saved), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">User Savings Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track savings generated for users through generic alternatives & discounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={loadSavings}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs" variant="outline">Download Report</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Savings Generated", value: overview ? formatLakh(overview.totalSaved) : "—", icon: DollarSign, bg: "bg-green-50", color: "text-green-600" },
          { label: "Users Benefited", value: overview ? overview.usersBenefited.toLocaleString("en-IN") : "—", icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Avg. per User", value: overview ? formatLakh(overview.avgSavingPerUser) : "—", icon: TrendingUp, bg: "bg-purple-50", color: "text-purple-600" },
          { label: "This Month", value: overview ? formatLakh(overview.thisMonthSaved) : "—", icon: Package, bg: "bg-orange-50", color: "text-orange-600" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold mt-0.5">{loading ? "—" : value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Savings Trend Chart */}
      {trend.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Savings Trend</h3>
            <p className="text-xs text-muted-foreground">Monthly savings over the last {trend.length} months</p>
          </div>
          <div className="h-40 flex items-end justify-between gap-1.5">
            {trend.map((t, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-medium text-green-600">{formatLakh(t.saved)}</div>
                <div
                  className="w-full bg-linear-to-t from-green-500 to-green-300 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${(t.saved / maxTrend) * 100}%`, minHeight: "4px" }}
                />
                <p className="text-[10px] text-muted-foreground">{MONTH_LABELS[(t._id.month - 1) % 12]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent High Savings */}
      {recentSavings.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <h3 className="text-sm font-semibold mb-3">Recent High-Savings Orders</h3>
          <div className="divide-y divide-border">
            {recentSavings.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-2.5 px-1 hover:bg-accent/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.patientId?.name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.items[0]?.medicineName ?? "Medicine"}{t.items.length > 1 ? ` +${t.items.length - 1} more` : ""} · {new Date(t.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">₹{t.savedAmount} saved</p>
                  <p className="text-[11px] text-muted-foreground line-through">₹{t.totalAmount + t.savedAmount} MRP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impact Metrics */}
      <div className="grid md:grid-cols-3 gap-3">
        {[
          {
            icon: Percent,
            iconBg: "bg-green-50",
            iconColor: "text-green-600",
            value: overview
              ? `${overview.totalDeliveredOrders > 0 ? Math.round((overview.totalSaved / (overview.totalDeliveredOrders * 500)) * 100) : 0}%`
              : "—",
            valueColor: "text-green-600",
            label: "Est. Savings Rate",
          },
          {
            icon: Users,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            value: overview && overview.usersBenefited > 0
              ? (overview.totalDeliveredOrders / overview.usersBenefited).toFixed(1)
              : "—",
            valueColor: "text-blue-600",
            label: "Orders per Saving User",
          },
          {
            icon: TrendingUp,
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600",
            value: overview ? formatLakh(overview.totalSaved) : "—",
            valueColor: "text-purple-600",
            label: "Total Savings All Time",
          },
        ].map(({ icon: Icon, iconBg, iconColor, value, valueColor, label }) => (
          <div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow text-center">
            <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
            <p className={`text-2xl font-bold ${valueColor} mb-1`}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
