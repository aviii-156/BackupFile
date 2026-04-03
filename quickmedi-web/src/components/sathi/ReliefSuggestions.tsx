"use client";

import React from "react";
import {
  Heart, MapPin, ShoppingBag, Pill, Flame, Droplets,
  Leaf, Moon, Ban, Activity, Utensils, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Symptom, SYMPTOM_RELIEF } from "./types";

// Map icon key → Lucide component
const ICON_MAP: Record<string, React.ReactNode> = {
  pill: <Pill className="w-4 h-4 text-orange-500" />,
  flame: <Flame className="w-4 h-4 text-orange-500" />,
  droplets: <Droplets className="w-4 h-4 text-blue-400" />,
  leaf: <Leaf className="w-4 h-4 text-green-500" />,
  moon: <Moon className="w-4 h-4 text-indigo-400" />,
  ban: <Ban className="w-4 h-4 text-red-400" />,
  activity: <Activity className="w-4 h-4 text-orange-400" />,
  utensils: <Utensils className="w-4 h-4 text-amber-500" />,
};

interface AiReliefItem {
  text: string;
  icon?: string;
  type?: string;
}

interface ReliefSuggestionsProps {
  selectedSymptoms: Set<Symptom>;
  /** AI-generated relief items from the backend (preferred over local lookup) */
  reliefItems?: AiReliefItem[];
}

export function ReliefSuggestions({ selectedSymptoms, reliefItems }: ReliefSuggestionsProps) {
  const detected = Array.from(selectedSymptoms);

  // Prefer AI items; fall back to local SYMPTOM_RELIEF map
  const displayItems: AiReliefItem[] = (reliefItems && reliefItems.length > 0)
    ? reliefItems.slice(0, 5)
    : detected
        .flatMap((s) => SYMPTOM_RELIEF[s] ?? [])
        .filter((item, idx, arr) => arr.findIndex((x) => x.text === item.text) === idx)
        .slice(0, 4);

  const isAiPowered = !!(reliefItems && reliefItems.length > 0);

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <Heart className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">Relief Suggestions</p>
            {isAiPowered && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {isAiPowered
              ? "Personalised by AI based on your symptoms."
              : "Personalised guidance linked to your pharmacy."}
          </p>
        </div>
      </div>

      {/* Detected symptom tags */}
      {detected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {detected.map((s) => (
            <span
              key={s}
              className="text-xs font-semibold bg-orange-100 text-orange-600 px-3 py-1 rounded-full"
            >
              Detected: {s.toLowerCase()}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">
          Select symptoms in the check-in to see relevant suggestions.
        </p>
      )}

      {/* Relief list */}
      {displayItems.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">
            Recommended Relief
          </p>
          <ul className="space-y-3">
            {displayItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                  {ICON_MAP[item.icon ?? ""] ?? <Pill className="w-4 h-4 text-gray-400" />}
                </span>
                <p className="text-sm text-gray-600 leading-snug">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Link href="/user/medicines">
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
            <ShoppingBag className="w-4 h-4" />
            Order Medicine
          </button>
        </Link>
        <Link href="/user/nearby-stores">
          <button className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors">
            <MapPin className="w-4 h-4" />
            Find Nearby Pharmacy
          </button>
        </Link>
      </div>
    </div>
  );
}
