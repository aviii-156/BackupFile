"use client";

import React from "react";
import { Star, Baby } from "lucide-react";
import { ComputedPregnancy, getBabyInfo } from "./pregnancyTypes";

interface BabyDevelopmentCardProps {
  computed: ComputedPregnancy;
}

// Trimester-specific illustration emojis
const TRIMESTER_EMOJI = {
  First: "🫀",
  Second: "👶",
  Third: "🍼",
};

export function BabyDevelopmentCard({ computed }: BabyDevelopmentCardProps) {
  const babyInfo = getBabyInfo(computed.weeksPregnant);

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Baby className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Baby Development This Week</p>
          <p className="text-xs text-gray-400">Week {computed.weeksPregnant} highlights.</p>
        </div>
      </div>

      {/* Size comparison banner */}
      <div className="flex items-center gap-4 bg-amber-50 rounded-md p-4 border border-amber-100">
        <div className="w-16 h-16 rounded-md bg-amber-100 flex items-center justify-center text-3xl shrink-0 select-none">
          {babyInfo.sizeEmoji}
        </div>
        <div>
          <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wide">
            Baby Size · Week {computed.weeksPregnant}
          </p>
          <p className="text-sm font-bold text-amber-800 mt-0.5 capitalize">
            About {babyInfo.size}
          </p>
          <p className="text-xs text-amber-500 mt-0.5">{computed.trimester} Trimester</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">{babyInfo.description}</p>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Milestones */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          This Week's Milestones
        </p>
        <ul className="space-y-2">
          {babyInfo.milestones.map((milestone, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-sm text-gray-700">{milestone}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trimester stage indicator */}
      <div className="flex items-center gap-2 bg-amber-50 rounded-md px-3 py-2 border border-amber-100">
        <span className="text-lg">{TRIMESTER_EMOJI[computed.trimester]}</span>
        <div>
          <p className="text-xs font-semibold text-amber-700">{computed.trimester} Trimester</p>
          <p className="text-[10px] text-amber-500">
            {computed.trimester === "First" && "Weeks 1–13 · Foundation phase"}
            {computed.trimester === "Second" && "Weeks 14–26 · Growth phase"}
            {computed.trimester === "Third" && "Weeks 27–40 · Final preparation"}
          </p>
        </div>
      </div>
    </div>
  );
}
