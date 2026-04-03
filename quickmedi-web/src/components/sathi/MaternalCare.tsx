"use client";

import React, { useState } from "react";
import { Heart, Sparkles, Baby, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

interface MaternalCareProps {
  pregnancyMode: boolean;
  onEnable: (dueDate: string, source?: string) => Promise<void>;
  onDisable: () => Promise<void>;
}

export function MaternalCare({ pregnancyMode, onEnable, onDisable }: MaternalCareProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [dueDateError, setDueDateError] = useState("");

  function handleButtonClick() {
    setDueDateError("");
    setDialogOpen(true);
  }

  async function handleConfirm() {
    if (!pregnancyMode) {
      if (!dueDate) {
        setDueDateError("Please enter your estimated due date.");
        return;
      }
      const selected = new Date(dueDate);
      const today = new Date();
      if (selected <= today) {
        setDueDateError("Due date must be in the future.");
        return;
      }
    }
    try {
      setLoading(true);
      if (pregnancyMode) {
        await onDisable();
      } else {
        await onEnable(dueDate);
      }
      setDialogOpen(false);
      setDueDate("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-md shadow-xs border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              pregnancyMode ? "bg-pink-500" : "bg-pink-100"
            }`}
          >
            {pregnancyMode ? (
              <Baby className="w-5 h-5 text-white" />
            ) : (
              <Heart className="w-5 h-5 text-pink-500" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Maternal Care</p>
            <p className="text-xs text-gray-400">
              {pregnancyMode
                ? "Pregnancy tracking is active."
                : "Pregnancy support when you're ready."}
            </p>
          </div>
        </div>

        {pregnancyMode ? (
          <div className="space-y-2">
            <div className="bg-pink-50 rounded-md p-3 border border-pink-100">
              <p className="text-sm font-semibold text-pink-700 mb-1">
                Pregnancy Mode Active 🌸
              </p>
              <ul className="text-xs text-pink-600 space-y-1 list-disc list-inside">
                <li>Weekly growth updates enabled</li>
                <li>Prenatal vitamin reminders scheduled</li>
                <li>Appointment nudges turned on</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 leading-relaxed">
            Switch to pregnancy tracking mode to receive weekly insights, gentle
            reminders and personalised health tips for you and your baby.
          </p>
        )}

        <button
          onClick={handleButtonClick}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-md transition-colors border ${
            pregnancyMode
              ? "border-pink-300 text-pink-600 hover:bg-pink-50"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-pink-400" />
          {pregnancyMode ? "Disable Pregnancy Mode" : "Enable Pregnancy Mode"}
        </button>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!loading) setDialogOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <Baby className="w-4 h-4 text-pink-500" />
              </div>
              <DialogTitle className="text-gray-900">
                {pregnancyMode ? "Disable Pregnancy Mode?" : "Enable Pregnancy Mode"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {pregnancyMode ? (
            <p className="text-sm text-gray-500 py-2">
              This will switch you back to standard cycle tracking. Your pregnancy
              data will be saved.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-500">
                Enter your estimated due date to activate your personalised
                pregnancy companion.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Estimated Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); setDueDateError(""); }}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-700"
                />
                {dueDateError && (
                  <p className="text-xs text-red-500">{dueDateError}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className={`rounded-full text-white flex items-center gap-2 ${
                pregnancyMode
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-pink-500 hover:bg-pink-600"
              }`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pregnancyMode ? "Yes, Disable" : "Yes, Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
