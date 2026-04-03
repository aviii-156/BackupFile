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
import { CycleData } from "./types";

interface EditCycleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleData: CycleData;
  onSave: (data: CycleData) => void;
}

export function EditCycleModal({
  open,
  onOpenChange,
  cycleData,
  onSave,
}: EditCycleModalProps) {
  const [lastPeriodDate, setLastPeriodDate] = useState(cycleData.lastPeriodDate);
  const [cycleLength, setCycleLength] = useState(String(cycleData.cycleLength));
  const [error, setError] = useState("");

  // Sync when modal opens with latest values
  useEffect(() => {
    if (open) {
      setLastPeriodDate(cycleData.lastPeriodDate);
      setCycleLength(String(cycleData.cycleLength));
      setError("");
    }
  }, [open, cycleData]);

  function handleSave() {
    const len = parseInt(cycleLength, 10);
    if (!lastPeriodDate) {
      setError("Please enter your last period start date.");
      return;
    }
    if (isNaN(len) || len < 20 || len > 45) {
      setError("Cycle length must be between 20 and 45 days.");
      return;
    }
    onSave({ lastPeriodDate, cycleLength: len });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit Cycle Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Last Period Start Date
            </label>
            <Input
              type="date"
              value={lastPeriodDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setLastPeriodDate(e.target.value);
                setError("");
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Average Cycle Length (days)
            </label>
            <Input
              type="number"
              min={20}
              max={45}
              value={cycleLength}
              onChange={(e) => {
                setCycleLength(e.target.value);
                setError("");
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-400">Typical range: 21–35 days</p>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
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
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
