"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Reminder,
  ReminderFormData,
  FilterTab,
  ReminderStats,
} from "@/types/reminder";
import { PageHeader } from "@/components/shared/PageComponents";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { reminderService } from "@/services/reminderService";
import {
  Bell,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Activity,
} from "lucide-react";
import {
  isReminderExpired,
  determineRiskLevel,
  shouldShowToday,
} from "@/utils/reminderHelpers";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tick every 30 s so time-window badges stay current without heavy re-renders
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Debounce search input — avoids re-filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load reminders once on mount
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await reminderService.getReminders();
      setReminders(data);
    } catch {
      setError("Failed to load reminders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Stats derived directly from reminders — no extra state or effect
  const stats = useMemo<ReminderStats>(
    () => ({
      active: reminders.filter((r) => r.isActive && !isReminderExpired(r))
        .length,
      today: reminders.filter((r) => shouldShowToday(r)).length,
      taken: reminders.reduce((sum, r) => sum + r.takenDoses, 0),
      missed: reminders.reduce((sum, r) => sum + r.missedDoses, 0),
      highRisk: reminders.filter(
        (r) => determineRiskLevel(r.consecutiveMisses) === "high",
      ).length,
    }),
    [reminders],
  );

  // Filtered list derived from reminders + tab + debounced search — no extra state or effect
  const filteredReminders = useMemo(() => {
    let list = reminders;

    switch (activeTab) {
      case "active":
        list = list.filter((r) => r.isActive && !isReminderExpired(r));
        break;
      case "inactive":
        list = list.filter((r) => !r.isActive);
        break;
      case "high_risk":
        list = list.filter(
          (r) => determineRiskLevel(r.consecutiveMisses) === "high",
        );
        break;
      case "expired":
        list = list.filter((r) => isReminderExpired(r));
        break;
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.medicineName.toLowerCase().includes(q) ||
          r.dosage.toLowerCase().includes(q) ||
          r.instruction?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [reminders, activeTab, debouncedSearch]);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ message, type });
      toastTimer.current = setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  // ── Helpers for optimistic state updates ──────────────────────────────────

  const applyOptimistic = useCallback(
    (id: string, patch: Partial<Reminder>) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [],
  );

  const revertOptimistic = useCallback((original: Reminder) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === original.id ? original : r)),
    );
  }, []);

  // ── Handlers — optimistic-first, revert on failure ────────────────────────

  const handleAddReminder = async (data: ReminderFormData) => {
    try {
      const created = await reminderService.createReminder(data);
      setReminders((prev) => [created, ...prev]);
      showToast("Reminder created successfully", "success");
      setIsModalOpen(false);
      setEditingReminder(null);
    } catch {
      showToast("Failed to create reminder", "error");
    }
  };

  const handleUpdateReminder = async (data: ReminderFormData) => {
    if (!editingReminder) return;
    const original = editingReminder;
    applyOptimistic(original.id, data as Partial<Reminder>);
    setIsModalOpen(false);
    setEditingReminder(null);
    try {
      const updated = await reminderService.updateReminder(original.id, data);
      applyOptimistic(original.id, updated);
      showToast("Reminder updated successfully", "success");
    } catch {
      revertOptimistic(original);
      showToast("Failed to update reminder", "error");
    }
  };

  const handleMarkTaken = async (id: string): Promise<void> => {
    const original = reminders.find((r) => r.id === id)!;
    applyOptimistic(id, {
      takenDoses: original.takenDoses + 1,
      totalDoses: original.totalDoses + 1,
      consecutiveMisses: 0,
    });
    showToast("Dose marked as taken", "success");
    try {
      const updated = await reminderService.markDoseTaken(id);
      applyOptimistic(id, updated);
    } catch {
      revertOptimistic(original);
      showToast("Failed to mark dose", "error");
    }
  };

  const handleMarkMissed = async (id: string): Promise<void> => {
    const original = reminders.find((r) => r.id === id)!;
    applyOptimistic(id, {
      missedDoses: original.missedDoses + 1,
      totalDoses: original.totalDoses + 1,
      consecutiveMisses: original.consecutiveMisses + 1,
    });
    showToast("Dose marked as missed", "success");
    try {
      const updated = await reminderService.markDoseMissed(id);
      applyOptimistic(id, updated);
    } catch {
      revertOptimistic(original);
      showToast("Failed to mark dose", "error");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const original = reminders.find((r) => r.id === id)!;
    applyOptimistic(id, { isActive });
    showToast(isActive ? "Reminder activated" : "Reminder paused", "success");
    try {
      const updated = await reminderService.toggleActive(id, isActive);
      applyOptimistic(id, updated);
    } catch {
      revertOptimistic(original);
      showToast("Failed to update reminder", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const original = reminders.find((r) => r.id === id)!;
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showToast("Reminder deleted successfully", "success");
    try {
      await reminderService.deleteReminder(id);
    } catch {
      setReminders((prev) => [original, ...prev]);
      showToast("Failed to delete reminder", "error");
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const handleCancelForm = () => {
    setIsModalOpen(false);
    setEditingReminder(null);
  };

  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setIsModalOpen(true);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Medicine Reminders"
          description="Loading your reminders..."
          icon={Bell}
        />
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Medicine Reminders"
          description="Never miss your medication"
          icon={Bell}
        />
        <Card className="border-none shadow-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadReminders}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 animate-slide-in ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Medicine Reminders"
        description="Never miss your medication with smart reminders"
        icon={Bell}
        action={{
          label: "Add Reminder",
          onClick: handleOpenAddModal,
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Active */}
        <Card className="border-none py-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800">{stats.active}</p>
              <p className="text-[11px] text-green-600 font-medium mt-0.5">reminders running</p>
            </div>
          </CardContent>
        </Card>

        {/* Today */}
        <Card className="border-none py-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <CardContent className="p-0"> 
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today</p>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800">{stats.today}</p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">scheduled today</p>
            </div>
          </CardContent>
        </Card>

        {/* Taken */}
        <Card className="border-none py-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <CardContent className="p-0"> 
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taken</p>
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800">{stats.taken}</p>
              <p className="text-[11px] text-teal-600 font-medium mt-0.5">doses taken</p>
            </div>
          </CardContent>
        </Card>

        {/* Missed */}
        <Card className="border-none py-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
          <CardContent className="p-0"> 
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Missed</p>
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-gray-800">{stats.missed}</p>
              <p className="text-[11px] text-orange-500 font-medium mt-0.5">doses missed</p>
            </div>
          </CardContent>
        </Card>

        {/* High Risk */}
        <Card className={`border-none py-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden ${stats.highRisk > 0 ? "ring-1 ring-red-200" : ""}`}>
          <CardContent className="p-0"> 
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">High Risk</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats.highRisk > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                  <AlertCircle className={`w-3.5 h-3.5 ${stats.highRisk > 0 ? "text-red-500" : "text-gray-400"}`} />
                </div>
              </div>
              <p className={`text-2xl font-extrabold ${stats.highRisk > 0 ? "text-red-600" : "text-gray-800"}`}>{stats.highRisk}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${stats.highRisk > 0 ? "text-red-500" : "text-gray-400"}`}>
                {stats.highRisk > 0 ? "need attention" : "all on track"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? "Edit Reminder" : "Add New Reminder"}
            </DialogTitle>
            <DialogDescription>
              {editingReminder
                ? "Update reminder details and schedule"
                : "Create a new medicine reminder"}
            </DialogDescription>
          </DialogHeader>
          <ReminderForm
            reminder={editingReminder || undefined}
            onSubmit={
              editingReminder ? handleUpdateReminder : handleAddReminder
            }
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        {/* Search Bar */}
        <div className="relative w-1/2">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by medicine name, dosage, or instruction..."
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
            size="sm"
          >
            All ({reminders.length})
          </Button>
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            onClick={() => setActiveTab("active")}
            size="sm"
          >
            Active ({stats.active})
          </Button>
          <Button
            variant={activeTab === "inactive" ? "default" : "outline"}
            onClick={() => setActiveTab("inactive")}
            size="sm"
          >
            Inactive
          </Button>
          <Button
            variant={activeTab === "high_risk" ? "default" : "outline"}
            onClick={() => setActiveTab("high_risk")}
            size="sm"
            className={
              activeTab === "high_risk" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            High Risk ({stats.highRisk})
          </Button>
          <Button
            variant={activeTab === "expired" ? "default" : "outline"}
            onClick={() => setActiveTab("expired")}
            size="sm"
          >
            Expired
          </Button>
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="py-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              No reminders found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Create your first reminder to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenAddModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredReminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              now={now}
              onMarkTaken={handleMarkTaken}
              onMarkMissed={handleMarkMissed}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

