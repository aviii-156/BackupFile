import React from "react";
import { Phase } from "./types";

const PHASE_COLORS: Record<Phase, string> = {
  Menstrual: "#FCA5A5",
  Follicular: "#FED7AA",
  Ovulation: "#FCD34D",
  Luteal: "#F97316",
};

interface CycleRingProps {
  progress: number;
  day: number;
  totalDays: number;
  phase: Phase;
}

export function CycleRing({ progress, day, totalDays, phase }: CycleRingProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const arcColor = PHASE_COLORS[phase];

  const phases: { label: Phase; color: string }[] = [
    { label: "Menstrual", color: "bg-red-300" },
    { label: "Follicular", color: "bg-orange-200" },
    { label: "Ovulation", color: "bg-amber-300" },
    { label: "Luteal", color: "bg-orange-500" },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full">
        Day {day} of {totalDays}
      </span>

      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#FED7AA" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            CYCLE
          </span>
          <span className="text-2xl font-bold text-orange-500 leading-none">
            {progress}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
        {phases.map((p) => (
          <div key={p.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${p.color}`} />
            <span
              className={`text-[10px] ${
                p.label === phase ? "text-orange-600 font-semibold" : "text-gray-400"
              }`}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
