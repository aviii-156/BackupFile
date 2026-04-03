"use client";

import React, { useState } from "react";
import { Baby, Edit3, ShieldOff } from "lucide-react";
import { ComputedPregnancy, PregnancyData, getBabyInfo } from "./pregnancyTypes";
import { UpdatePregnancyModal } from "./UpdatePregnancyModal";

// ─── Inline SVG Ring ──────────────────────────────────────────────────────────

function PregnancyRing({
  progress,
  weeksPregnant,
}: {
  progress: number;
  weeksPregnant: number;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="bg-pink-100 text-pink-600 text-xs font-semibold px-3 py-1 rounded-full">
        Week {weeksPregnant} of 40
      </span>

      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#FCE7F3" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#EC4899"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            PROGRESS
          </span>
          <span className="text-2xl font-bold text-pink-500 leading-none">{progress}%</span>
        </div>
      </div>

      {/* Trimester legend */}
      <div className="flex flex-col items-start gap-1.5 self-start">
        {[
          { label: "1st Trimester", weeks: "Wk 1–13",  active: weeksPregnant <= 13,                          dot: "bg-pink-400" },
          { label: "2nd Trimester", weeks: "Wk 14–26", active: weeksPregnant > 13 && weeksPregnant <= 26,  dot: "bg-purple-400" },
          { label: "3rd Trimester", weeks: "Wk 27–40", active: weeksPregnant > 26,                          dot: "bg-orange-400" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${t.active ? t.dot : "bg-gray-200"}`} />
            <span className={`text-[10px] ${t.active ? "font-semibold text-gray-700" : "text-gray-400"}`}>
              {t.label} · {t.weeks}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const TRIMESTER_COLORS = {
  First:  { badge: "bg-pink-100 text-pink-700",    bar: "from-pink-300 to-pink-500" },
  Second: { badge: "bg-purple-100 text-purple-700", bar: "from-purple-300 to-purple-500" },
  Third:  { badge: "bg-orange-100 text-orange-700", bar: "from-orange-300 to-orange-500" },
};

interface PregnancyOverviewCardProps {
  computed: ComputedPregnancy;
  onUpdate: (data: PregnancyData) => void;
  onDisable: () => void;
}

export function PregnancyOverviewCard({
  computed,
  onUpdate,
  onDisable,
}: PregnancyOverviewCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const babyInfo = getBabyInfo(computed.weeksPregnant);
  const colors = TRIMESTER_COLORS[computed.trimester];

  return (
    <>
      <div className="bg-white rounded-md shadow-xs border border-pink-100 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* ── Left ──────────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-5 min-w-0">
            {/* Card title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                <Baby className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Pregnancy Overview</p>
                <p className="text-xs text-gray-400">Your journey to meeting your little one.</p>
              </div>
            </div>

            {/* Week hero */}
            <div>
              <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${colors.badge}`}>
                {computed.trimester} Trimester
              </span>
              <h2 className="text-3xl font-bold text-gray-900 mt-3">
                Week {computed.weeksPregnant} of 40
              </h2>
              <p className="text-sm text-pink-500 font-medium mt-1.5">
                {babyInfo.sizeEmoji} Baby is about the size of {babyInfo.size}
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-400">Estimated Due Date</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{computed.dueDateFormatted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Weeks Remaining</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">
                  {40 - computed.weeksPregnant} weeks
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Progress</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{computed.progress}% complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Week 1</span>
                <span>Week 40</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full bg-linear-to-r ${colors.bar} transition-all duration-700`}
                  style={{ width: `${computed.progress}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Update Pregnancy Details
              </button>
              <button
                onClick={onDisable}
                className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <ShieldOff className="w-4 h-4" />
                Disable Pregnancy Mode
              </button>
            </div>
          </div>

          {/* ── Right — Ring ─────────────────────────────────────────────── */}
          <div className="flex justify-center md:justify-end shrink-0">
            <PregnancyRing progress={computed.progress} weeksPregnant={computed.weeksPregnant} />
          </div>
        </div>
      </div>

      <UpdatePregnancyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        pregnancyData={{ dueDate: computed.dueDate }}
        onSave={onUpdate}
      />
    </>
  );
}
