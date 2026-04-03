"use client";

import React from "react";
import { CheckCircle2, Circle, Bell, CalendarDays, Pill, Droplets, Activity, Moon } from "lucide-react";

export interface SathiReminderItem {
  _id: string;
  type: string;
  title: string;
  description?: string;
  isEnabled: boolean;
  completedToday: boolean;
}

interface MaternalRemindersCardProps {
  reminders?: SathiReminderItem[];
  onToggle?: (id: string) => void;
}

// Icon map for backend reminder types
const TYPE_ICON: Record<string, React.ReactNode> = {
  vitamin:  <Pill className="w-3.5 h-3.5 text-pink-500" />,
  water:    <Droplets className="w-3.5 h-3.5 text-blue-400" />,
  exercise: <Activity className="w-3.5 h-3.5 text-orange-400" />,
  doctor:   <CalendarDays className="w-3.5 h-3.5 text-green-500" />,
  sleep:    <Moon className="w-3.5 h-3.5 text-indigo-400" />,
  custom:   <Bell className="w-3.5 h-3.5 text-amber-500" />,
};

// Static fallback when no backend data is available yet
const STATIC_REMINDERS: SathiReminderItem[] = [
  { _id: "vitamins",  type: "vitamin",   title: "Take prenatal vitamins",       description: "Folic acid & iron included",           isEnabled: true, completedToday: false },
  { _id: "water",     type: "water",     title: "Drink enough water",           description: "Aim for 8–10 glasses today",            isEnabled: true, completedToday: false },
  { _id: "exercise",  type: "exercise",  title: "Light exercise or walk",       description: "20–30 minutes is perfect",              isEnabled: true, completedToday: false },
  { _id: "doctor",    type: "doctor",    title: "Book next doctor visit",       description: "Confirm or schedule appointment",       isEnabled: true, completedToday: false },
  { _id: "sleep",     type: "sleep",     title: "Rest & sleep well",            description: "Aim for 8 hours of sleep",              isEnabled: true, completedToday: false },
  { _id: "reminder",  type: "custom",    title: "Set medication reminder",      description: "Timely reminders help compliance",      isEnabled: true, completedToday: false },
];

export function MaternalRemindersCard({ reminders, onToggle }: MaternalRemindersCardProps) {
  // Use backend reminders if available, else static fallback
  const list = (reminders && reminders.length > 0) ? reminders.filter((r) => r.isEnabled) : STATIC_REMINDERS;
  const isBackend = !!(reminders && reminders.length > 0);

  const completedCount = list.filter((r) => r.completedToday).length;
  const allDone = completedCount === list.length && list.length > 0;

  function handleToggle(id: string) {
    if (isBackend && onToggle) {
      onToggle(id);
    }
    // Static fallback is read-only (no local toggle needed — page provides state)
  }

  return (
    <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-pink-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Maternal Health Reminders</p>
            <p className="text-xs text-gray-400">Your daily pregnancy care checklist.</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
          {completedCount}/{list.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-pink-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${list.length > 0 ? (completedCount / list.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">
          {list.length > 0 ? Math.round((completedCount / list.length) * 100) : 0}% complete
        </p>
      </div>

      {/* Reminders list */}
      <ul className="space-y-2">
        {list.map((reminder) => {
          const isDone = reminder.completedToday;
          return (
            <li
              key={reminder._id}
              onClick={() => handleToggle(reminder._id)}
              className={`flex items-center gap-3 p-3 rounded-md transition-all border select-none ${
                isBackend ? "cursor-pointer" : "cursor-default"
              } ${
                isDone
                  ? "bg-pink-50 border-pink-100"
                  : "bg-gray-50 border-transparent hover:border-gray-200 hover:bg-white"
              }`}
            >
              {/* Icon badge */}
              <div className="shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                {TYPE_ICON[reminder.type] ?? <Bell className="w-3.5 h-3.5 text-gray-400" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${isDone ? "text-pink-600 line-through" : "text-gray-800"}`}>
                  {reminder.title}
                </p>
                {reminder.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{reminder.description}</p>
                )}
              </div>

              {/* Checkbox */}
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-pink-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Completion banner */}
      {allDone && (
        <div className="bg-pink-50 border border-pink-200 rounded-md p-3 text-center">
          <p className="text-sm font-semibold text-pink-600">🌸 Great job! All tasks done for today.</p>
        </div>
      )}
    </div>
  );
}
