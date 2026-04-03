"use client";

import React, { useMemo } from "react";
import { Loader2, ShieldOff, AlertCircle } from "lucide-react";
import { useSathi } from "@/hooks/useSathi";
import { CycleOverviewCard } from "@/components/sathi/CycleOverviewCard";
import { DailyCheckin } from "@/components/sathi/DailyCheckin";
import { ReliefSuggestions } from "@/components/sathi/ReliefSuggestions";
import { MaternalCare } from "@/components/sathi/MaternalCare";
import { HealthInsights } from "@/components/sathi/HealthInsights";
import { CycleData, Symptom, computeCycle } from "@/components/sathi/types";
import { PregnancyDashboard } from "@/components/sathi/pregnancy/PregnancyDashboard";
import { computePregnancy } from "@/components/sathi/pregnancy/pregnancyTypes";

export default function SathiPage() {
  const {
    loading, error, notEligible,
    cycle, relief, insights, pregnancy, reminders, pregnancyTip, pregnancyMode,
    selectedSymptoms, notes, mood, energyLevel, savedToday, savingLog,
    setNotes, setMood, setEnergyLevel,
    toggleSymptom, saveLog,
    logPeriod, updateCycle,
    enablePregnancyMode, disablePregnancyMode,
    toggleReminderComplete,
    markInsightsRead,
  } = useSathi();

  // ── Derive CycleData from backend SathiCycle ────────────────────────────────
  const cycleData: CycleData = useMemo(() => ({
    lastPeriodDate: cycle?.startDate
      ? cycle.startDate.split("T")[0]
      : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    cycleLength: cycle?.cycleLength ?? 28,
  }), [cycle]);

  const computed = useMemo(() => computeCycle(cycleData), [cycleData]);

  const computedPregnancy = useMemo(() => {
    const dueDate = pregnancy?.estimatedDueDate
      ? pregnancy.estimatedDueDate.split("T")[0]
      : "";
    return computePregnancy({ dueDate });
  }, [pregnancy]);

  // Handle cycle update — decide whether it's a period log or settings change
  async function handleCycleUpdate(data: CycleData) {
    if (data.lastPeriodDate !== cycleData.lastPeriodDate) {
      await logPeriod(data.lastPeriodDate, undefined, data.cycleLength);
    } else {
      await updateCycle({ cycleLength: data.cycleLength });
    }
  }

  // ── Derived stats from insights ─────────────────────────────────────────────
  const totalLogsThisMonth = useMemo(() => {
    const now = new Date();
    return insights.filter((ins) => {
      const d = new Date(ins.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [insights]);

  const lastMonthSymptomCount = useMemo(() => {
    const now = new Date();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lmY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return insights.filter((ins) => {
      const d = new Date(ins.createdAt);
      return d.getMonth() === lm && d.getFullYear() === lmY;
    }).length;
  }, [insights]);

  const consistencyScore = Math.min(totalLogsThisMonth, 10);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading your Sathi dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Not eligible (non-female user) ──────────────────────────────────────────
  if (notEligible) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <ShieldOff className="w-10 h-10 text-gray-300 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-700">Sathi is for women</h2>
          <p className="text-sm text-gray-400">
            This section provides personalised cycle and pregnancy health support
            for female users.
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-orange-500 underline hover:text-orange-600"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pregnancyMode ? "Pregnancy Care" : "Your Cycle"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pregnancyMode
              ? "Your personalised pregnancy companion."
              : "A gentle snapshot of where your body is today."}
          </p>
        </div>
        <span
          className={`border text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${
            pregnancyMode
              ? "bg-pink-50 border-pink-200 text-pink-600"
              : "bg-orange-50 border-orange-200 text-orange-600"
          }`}
        >
          {pregnancyMode
            ? `Week ${computedPregnancy.weeksPregnant} \u00b7 ${computedPregnancy.trimester} Trimester`
            : `Cycle Progress: ${computed.progress}%`}
        </span>
      </div>

      {pregnancyMode ? (
        <PregnancyDashboard
          computed={computedPregnancy}
          onUpdate={async () => {}}
          onDisable={disablePregnancyMode}
          reminders={reminders}
          onToggleReminder={toggleReminderComplete}
        />
      ) : (
        <>
          {/* Cycle Overview */}
          <CycleOverviewCard
            computed={computed}
            onCycleUpdate={handleCycleUpdate}
          />

          {/* Daily Check-in + Relief Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DailyCheckin
              selectedSymptoms={selectedSymptoms as Set<Symptom>}
              onToggleSymptom={toggleSymptom}
              notes={notes}
              onNotesChange={setNotes}
              onSave={saveLog}
              savedToday={savedToday}
              isSaving={savingLog}
              mood={mood}
              energyLevel={energyLevel}
              onMoodChange={setMood}
              onEnergyLevelChange={setEnergyLevel}
            />
            <ReliefSuggestions
              selectedSymptoms={selectedSymptoms as Set<Symptom>}
              reliefItems={relief?.reliefItems?.map((r) => ({
                text: r.description || r.title,
                icon: r.icon,
                type: r.type,
              }))}
            />
          </div>

          {/* Maternal Care + Health Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MaternalCare
              pregnancyMode={pregnancyMode}
              onEnable={enablePregnancyMode}
              onDisable={disablePregnancyMode}
            />
            <HealthInsights
              computed={computed}
              totalLogsThisMonth={totalLogsThisMonth}
              lastMonthSymptomCount={lastMonthSymptomCount}
              consistencyScore={consistencyScore}
              insights={insights}
              onMarkRead={markInsightsRead}
            />
          </div>
        </>
      )}
    </div>
  );
}
