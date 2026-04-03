"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Baby } from "lucide-react";
import { PregnancyData } from "./pregnancyTypes";

interface UpdatePregnancyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pregnancyData: PregnancyData;
  onSave: (data: PregnancyData) => void;
}

export function UpdatePregnancyModal({
  open,
  onOpenChange,
  pregnancyData,
  onSave,
}: UpdatePregnancyModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 280);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const [dueDate, setDueDate] = useState(pregnancyData.dueDate);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDueDate(pregnancyData.dueDate);
      setError("");
    }
  }, [open, pregnancyData]);

  function handleSave() {
    if (!dueDate) {
      setError("Please enter your estimated due date.");
      return;
    }
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) {
      setError("Due date must be a future date.");
      return;
    }
    const daysAway = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
    if (daysAway > 280) {
      setError("Due date cannot be more than 40 weeks away.");
      return;
    }
    onSave({ dueDate });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
              <Baby className="w-4 h-4 text-pink-500" />
            </div>
            <DialogTitle className="text-gray-900">Update Pregnancy Details</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Estimated Due Date (EDD)
            </label>
            <Input
              type="date"
              value={dueDate}
              min={todayStr}
              max={maxDateStr}
              onChange={(e) => {
                setDueDate(e.target.value);
                setError("");
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-400">
              Your doctor provides this as your Estimated Due Date (EDD).
            </p>
          </div>

          {/* Live preview */}
          {dueDate && (
            <div className="bg-pink-50 border border-pink-100 rounded-md p-3">
              <p className="text-xs text-pink-600 font-medium">
                Due:{" "}
                {new Date(dueDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
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
            className="rounded-full bg-pink-500 hover:bg-pink-600 text-white"
            onClick={handleSave}
          >
            Save Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
