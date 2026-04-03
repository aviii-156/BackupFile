"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, BookOpen, MapPin } from "lucide-react";
import Link from "next/link";

const SAFETY_POINTS = [
  "All medicines you search will be cross-checked against pregnancy safety databases.",
  "Medicines marked unsafe during pregnancy will display clear warning labels.",
  "Dosage recommendations for pregnant women will be highlighted.",
  "Always consult your doctor or pharmacist before taking any new medication.",
];

export function MedicineSafetyCard() {
  return (
    <div className="bg-white rounded-md shadow-xs border border-orange-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">Medicine Safety Mode</p>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Pregnancy-aware medicine checks are enabled.</p>
        </div>
      </div>

      {/* Safety banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <p className="text-xs text-orange-700 font-medium leading-relaxed">
          Pregnancy Safety Mode is Active — All medicine searches are filtered and flagged for your safety.
        </p>
      </div>

      {/* Safety checklist */}
      <ul className="space-y-2.5">
        {SAFETY_POINTS.map((point, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">{point}</p>
          </li>
        ))}
      </ul>

      {/* CTA buttons */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <Link href="/user/medicines">
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors">
            <BookOpen className="w-4 h-4" />
            Learn Safe Medicines
          </button>
        </Link>
        <Link href="/user/nearby-stores">
          <button className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-gray-50 transition-colors">
            <MapPin className="w-4 h-4" />
            Find Nearby Pharmacy
          </button>
        </Link>
      </div>
    </div>
  );
}
