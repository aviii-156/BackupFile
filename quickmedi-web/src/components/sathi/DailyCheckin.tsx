"use client";

import React from "react";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { Symptom } from "./types";

const ALL_SYMPTOMS: Symptom[] = [
  "Cramps", "Headache", "Fatigue", "Bloating",
  "Mood Swings", "Back Pain", "Acne", "Nausea", "Sleep Issues",
];

const MOOD_LABELS: Record<number, string> = {
  1: "😔 Low", 2: "😐 Meh", 3: "🙂 Okay", 4: "😊 Good", 5: "😄 Great",
};

const ENERGY_LABELS: Record<number, string> = {
  1: "🔋 Drained", 2: "😴 Tired", 3: "⚡ Moderate", 4: "💪 Active", 5: "🚀 Energised",
};

interface DailyCheckinProps {
  selectedSymptoms: Set<Symptom>;
  onToggleSymptom: (s: Symptom) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  savedToday: boolean;
  isSaving?: boolean;
  mood?: number | null;
  energyLevel?: number | null;
  onMoodChange?: (v: number | null) => void;
  onEnergyLevelChange?: (v: number | null) => void;
}

export function DailyCheckin({
  selectedSymptoms,
  onToggleSymptom,
  notes,
  onNotesChange,
  onSave,
  savedToday,
  isSaving = false,
  mood,
  energyLevel,
  onMoodChange,
  onEnergyLevelChange,
}: DailyCheckinProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Daily Check-in</p>
            <p className="text-xs text-gray-400">Tap what feels true for you today.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {savedToday ? "Saved today" : timeStr}
        </div>
      </div>

      <p className="text-sm text-gray-600 font-medium">How are you feeling today?</p>

      {/* Symptoms */}
      <div className="flex flex-wrap gap-2">
        {ALL_SYMPTOMS.map((s) => (
          <button
            key={s}
            onClick={() => onToggleSymptom(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              selectedSymptoms.has(s)
                ? "bg-orange-500 border-orange-500 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Mood rating */}
      {onMoodChange && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">
            Mood {mood ? <span className="text-orange-500">{MOOD_LABELS[mood]}</span> : "(optional)"}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => onMoodChange(mood === v ? null : v)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  mood === v
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Energy level rating */}
      {onEnergyLevelChange && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">
            Energy Level{" "}
            {energyLevel ? (
              <span className="text-orange-500">{ENERGY_LABELS[energyLevel]}</span>
            ) : (
              "(optional)"
            )}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => onEnergyLevelChange(energyLevel === v ? null : v)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  energyLevel === v
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">Notes (optional)</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any other symptoms, emotions or reminders for yourself…"
          className="w-full text-sm text-gray-700 border border-gray-200 rounded-md px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400"
        />
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={savedToday || isSaving}
        className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-md transition-colors ${
          savedToday
            ? "bg-green-100 text-green-600 cursor-default"
            : isSaving
            ? "bg-orange-200 text-orange-400 cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 text-white"
        }`}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CalendarDays className="w-4 h-4" />
        )}
        {savedToday ? "Log Saved ✓" : isSaving ? "Saving…" : "Save Today's Log"}
      </button>
    </div>
  );
}
