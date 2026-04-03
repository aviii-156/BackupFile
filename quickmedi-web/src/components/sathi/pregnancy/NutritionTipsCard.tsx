"use client";

import React from "react";
import { Leaf, Droplets, Ban, Zap, Utensils } from "lucide-react";
import { ComputedPregnancy, NUTRITION_BY_TRIMESTER } from "./pregnancyTypes";

const ICON_MAP: Record<string, React.ReactNode> = {
  leaf:     <Leaf className="w-3.5 h-3.5 text-green-500" />,
  droplets: <Droplets className="w-3.5 h-3.5 text-blue-400" />,
  ban:      <Ban className="w-3.5 h-3.5 text-red-400" />,
  zap:      <Zap className="w-3.5 h-3.5 text-amber-500" />,
  utensils: <Utensils className="w-3.5 h-3.5 text-orange-400" />,
};

const TRIMESTER_META = {
  First:  { label: "Focus on foundations",   badge: "bg-pink-50 text-pink-600 border-pink-100" },
  Second: { label: "Fuelling baby's growth",  badge: "bg-purple-50 text-purple-600 border-purple-100" },
  Third:  { label: "Preparing for birth",     badge: "bg-orange-50 text-orange-600 border-orange-100" },
};

interface NutritionTipsCardProps {
  computed: ComputedPregnancy;
}

export function NutritionTipsCard({ computed }: NutritionTipsCardProps) {
  const tips = NUTRITION_BY_TRIMESTER[computed.trimester];
  const meta = TRIMESTER_META[computed.trimester];

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Nutrition & Wellness</p>
            <p className="text-xs text-gray-400">{meta.label}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.badge}`}>
          {computed.trimester} Trimester
        </span>
      </div>

      {/* Tips */}
      <ul className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
              {ICON_MAP[tip.icon] ?? <Utensils className="w-3.5 h-3.5 text-gray-400" />}
            </span>
            <p className="text-sm text-gray-600 leading-snug">{tip.tip}</p>
          </li>
        ))}
      </ul>

      {/* Reminder banner */}
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-xs text-green-700 font-medium">
          💊 Remember to take your prenatal supplements as prescribed by your doctor.
        </p>
      </div>
    </div>
  );
}
