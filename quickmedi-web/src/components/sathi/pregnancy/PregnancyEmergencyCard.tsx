"use client";

import React from "react";
import { AlertTriangle, Phone, MapPin, Users } from "lucide-react";

const WARNING_SYMPTOMS = [
  "Severe or persistent abdominal pain",
  "Heavy vaginal bleeding",
  "Sudden severe swelling of face, hands, or feet",
  "Persistent severe headache or vision changes",
  "Decreased or no fetal movement (after week 24)",
  "High fever above 38°C",
  "Difficulty breathing or chest pain",
  "Painful, burning urination",
];

export function PregnancyEmergencyCard() {
  return (
    <div className="bg-white rounded-md shadow-xs border border-red-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Pregnancy Emergency Support</p>
          <p className="text-xs text-gray-400">Know when to seek immediate medical help.</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-3">
        <p className="text-xs font-semibold text-red-700">
          ⚠️ Seek immediate medical attention if you experience any of the following:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WARNING_SYMPTOMS.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
              <span className="text-xs text-red-700 leading-snug">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reassurance note */}
      <p className="text-xs text-gray-500 italic">
        When in doubt, it is always safer to call your doctor or go to the nearest hospital.
        Trust your instincts — you know your body.
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <a href="tel:112">
          <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
            <Phone className="w-4 h-4" />
            Call Emergency (112)
          </button>
        </a>
        <Link_NearbyHospital />
        <button className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-50 transition-colors">
          <Users className="w-4 h-4" />
          Alert Family
        </button>
      </div>
    </div>
  );
}

// Internal helper to avoid href in JSX
function Link_NearbyHospital() {
  return (
    <a href="/user/nearby-stores">
      <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors">
        <MapPin className="w-4 h-4" />
        Find Nearby Hospital
      </button>
    </a>
  );
}
