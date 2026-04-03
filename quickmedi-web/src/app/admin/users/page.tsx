"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { adminService } from "@/services/admin.service";

type UserData = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  preferredLanguage?: string;
  createdAt: string;
  isActive: boolean;
  subscription?: { plan?: string; expiresAt?: string };
  dailyScansUsed?: number;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "active" | "inactive">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllUsers({
        search: searchQuery || undefined,
        page,
        limit: 20,
      });
      if (res.success && res.data) {
        setUsers(res.data.users as UserData[]);
        setPagination(res.data.pagination as any);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setActionLoading(id);
    try {
      const res = await adminService.updateUserStatus(id, !currentStatus);
      if (res.success) {
        setUsers(u => u.map(x => x._id === id ? { ...x, isActive: !currentStatus } : x));
      }
    } catch { /* ignore */ } finally { setActionLoading(null); }
  };

  const filtered = users.filter((u) => {
    if (selectedTab === "active") return u.isActive;
    if (selectedTab === "inactive") return !u.isActive;
    return true;
  });

  const activeCount = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and monitor platform users</p>
        </div>
        <Button size="sm" className="h-8 text-xs">Export CSV</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: String(pagination.totalUsers || 0), icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Active (this page)", value: String(activeCount), icon: CheckCircle, bg: "bg-green-50", color: "text-green-600" },
          { label: "Inactive (this page)", value: String(inactiveCount), icon: Ban, bg: "bg-red-50", color: "text-red-600" },
          { label: "Page", value: `${pagination.currentPage} / ${pagination.totalPages}`, icon: Calendar, bg: "bg-orange-50", color: "text-orange-600" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-lg p-4 border border-border card-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{loading ? "\u2026" : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 border border-border card-shadow flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1.5 bg-muted rounded-lg p-1">
          {(["all", "active", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                selectedTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-border card-shadow overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
          {["User", "Contact", "Subscription", "Status", "Actions"].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
          ))}
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No users found.</div>
          ) : filtered.map((user) => (
            <div key={user._id} className="grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {user.name?.charAt(0) ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {user.gender ?? "\u2014"} \u00b7 {user.preferredLanguage === "hi" ? "Hindi" : "English"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs">{user.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {user.phone ?? "\u2014"} \u00b7 Joined {new Date(user.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  user.subscription?.plan === "pro" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {user.subscription?.plan === "pro" ? "Pro" : "Free"}
                </span>
                {user.subscription?.expiresAt && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Exp: {new Date(user.subscription.expiresAt).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${
                  user.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"
                }`}
                disabled={actionLoading === user._id}
                onClick={() => handleToggleStatus(user._id, user.isActive)}
              >
                {actionLoading === user._id ? "\u2026" : user.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm flex items-center px-3">Page {page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

