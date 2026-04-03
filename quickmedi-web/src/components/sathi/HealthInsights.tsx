"use client";

import React from "react";
import { Activity, Info, Sparkles, BookOpen } from "lucide-react";
import { ComputedCycle } from "./types";

interface AiInsight {
  _id: string;
  insightType: string;
  title?: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface HealthInsightsProps {
  computed: ComputedCycle;
  totalLogsThisMonth: number;
  consistencyScore: number;
  lastMonthSymptomCount: number;
  insights?: AiInsight[];
  onMarkRead?: (ids: string[]) => void;
}

export function HealthInsights({
  computed,
  totalLogsThisMonth,
  consistencyScore,
  lastMonthSymptomCount,
  insights = [],
  onMarkRead,
}: HealthInsightsProps) {
  const regularity =
    computed.cycleLength >= 21 && computed.cycleLength <= 35 ? "Normal" : "Irregular";

  const stats = [
    { label: "Average Cycle", value: `${computed.cycleLength} days` },
    { label: "Last Month Symptoms", value: `${lastMonthSymptomCount} logged` },
    { label: "Cycle Regularity", value: regularity },
    { label: "Consistency", value: `${consistencyScore}/10 check-ins` },
  ];

  // Show up to 2 unread AI insights
  const unreadInsights = insights.filter((i) => !i.isRead).slice(0, 2);
  const hasInsights = unreadInsights.length > 0;

  function handleMarkAllRead() {
    if (onMarkRead && unreadInsights.length > 0) {
      onMarkRead(unreadInsights.map((i) => i._id));
    }
  }

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Health Insights</p>
            <p className="text-xs text-gray-400">A quick pulse on your patterns.</p>
          </div>
        </div>
        <Info className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-0.5">
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-sm font-semibold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar for this month's logs */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Monthly check-in progress</span>
          <span>{totalLogsThisMonth} / 30 days</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-orange-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totalLogsThisMonth / 30) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* AI Insights section */}
      {hasInsights && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <p className="text-xs font-semibold text-gray-700">AI Insights</p>
            </div>
            {onMarkRead && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-orange-500 hover:text-orange-600 underline"
              >
                Mark read
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {unreadInsights.map((ins) => (
              <li
                key={ins._id}
                className="flex items-start gap-2 bg-orange-50 rounded-md p-2.5 border border-orange-100"
              >
                <BookOpen className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  {ins.title && (
                    <p className="text-xs font-semibold text-orange-700 mb-0.5">{ins.title}</p>
                  )}
                  <p className="text-xs text-orange-600 leading-snug">{ins.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
