"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Droplets } from "lucide-react";

interface LogPeriodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: (date: string) => void;
}

export function LogPeriodModal({ open, onOpenChange, onLog }: LogPeriodModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [flow, setFlow] = useState<"light" | "medium" | "heavy">("medium");
  const [error, setError] = useState("");

  function handleLog() {
    if (!selectedDate) {
      setError("Please select a date.");
      return;
    }
    onLog(selectedDate);
    onOpenChange(false);
  }

  const flowOptions: { value: "light" | "medium" | "heavy"; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "medium", label: "Medium" },
    { value: "heavy", label: "Heavy" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-red-500" />
            </div>
            <DialogTitle className="text-gray-900">Log Your Period</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Period Start Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setError("");
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Flow Intensity
            </label>
            <div className="flex gap-2">
              {flowOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFlow(opt.value)}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold border transition-all ${
                    flow === opt.value
                      ? "bg-red-500 border-red-500 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-red-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <p className="text-xs text-gray-400 bg-orange-50 rounded-lg px-3 py-2">
            Logging a period will reset your cycle tracking from this date.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-red-500 hover:bg-red-600 text-white"
            onClick={handleLog}
          >
            <Droplets className="w-4 h-4" />
            Log Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
