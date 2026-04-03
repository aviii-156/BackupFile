"use client";

import React, { useState } from "react";
import { Activity, Droplets, Edit3 } from "lucide-react";
import { CycleRing } from "./CycleRing";
import { EditCycleModal } from "./EditCycleModal";
import { LogPeriodModal } from "./LogPeriodModal";
import { ComputedCycle, CycleData, PHASE_CONFIG } from "./types";

interface CycleOverviewCardProps {
  computed: ComputedCycle;
  onCycleUpdate: (data: CycleData) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function CycleOverviewCard({ computed, onCycleUpdate }: CycleOverviewCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const phaseConfig = PHASE_CONFIG[computed.phase];

  function handlePeriodLog(date: string) {
    onCycleUpdate({ lastPeriodDate: date, cycleLength: computed.cycleLength });
  }

  return (
    <>
      <div className="bg-white rounded-md shadow-xs border border-orange-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* ── Left info ── */}
          <div className="flex-1 space-y-4">
            {/* Title row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Your Cycle</p>
                <p className="text-xs text-gray-400">
                  {computed.phase} phase · listening to your rhythm
                </p>
              </div>
            </div>

            {/* Phase + day */}
            <div>
              <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">
                Current Phase – {computed.phase}
              </span>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">
                Today is Day {computed.currentDay}
              </h2>
              <p className={`text-xs mt-1 ${phaseConfig.color}`}>
                {phaseConfig.description}
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-5">
              <div>
                <p className="text-xs text-gray-400">Next Period</p>
                <p className="text-sm font-semibold text-gray-800">
                  {computed.nextPeriodIn > 0 ? `${computed.nextPeriodIn} days` : "Today"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cycle Length</p>
                <p className="text-sm font-semibold text-gray-800">
                  {computed.cycleLength} days
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Last Period</p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatDate(computed.lastPeriodDate)}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <Droplets className="w-4 h-4" />
                Log Period
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Cycle
              </button>
            </div>
          </div>

          {/* ── Right: ring ── */}
          <div className="flex justify-center md:justify-end">
            <CycleRing
              progress={computed.progress}
              day={computed.currentDay}
              totalDays={computed.cycleLength}
              phase={computed.phase}
            />
          </div>
        </div>
      </div>

      <EditCycleModal
        open={editOpen}
        onOpenChange={setEditOpen}
        cycleData={{ lastPeriodDate: computed.lastPeriodDate, cycleLength: computed.cycleLength }}
        onSave={onCycleUpdate}
      />

      <LogPeriodModal
        open={logOpen}
        onOpenChange={setLogOpen}
        onLog={handlePeriodLog}
      />
    </>
  );
}
