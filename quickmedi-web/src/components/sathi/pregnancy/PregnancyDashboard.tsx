"use client";

import React from "react";
import { PregnancyOverviewCard } from "./PregnancyOverviewCard";
import { BabyDevelopmentCard } from "./BabyDevelopmentCard";
import { MaternalRemindersCard, type SathiReminderItem } from "./MaternalRemindersCard";
import { MedicineSafetyCard } from "./MedicineSafetyCard";
import { NutritionTipsCard } from "./NutritionTipsCard";
import { PregnancyEmergencyCard } from "./PregnancyEmergencyCard";
import { ComputedPregnancy, PregnancyData } from "./pregnancyTypes";

interface PregnancyDashboardProps {
  computed: ComputedPregnancy;
  onUpdate: (data: PregnancyData) => void;
  onDisable: () => void;
  reminders?: SathiReminderItem[];
  onToggleReminder?: (id: string) => void;
}

export function PregnancyDashboard({
  computed,
  onUpdate,
  onDisable,
  reminders,
  onToggleReminder,
}: PregnancyDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Pregnancy Overview — full width */}
      <PregnancyOverviewCard computed={computed} onUpdate={onUpdate} onDisable={onDisable} />

      {/* Row 2: Baby Development | Maternal Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BabyDevelopmentCard computed={computed} />
        <MaternalRemindersCard reminders={reminders} onToggle={onToggleReminder} />
      </div>

      {/* Row 3: Medicine Safety | Nutrition Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MedicineSafetyCard />
        <NutritionTipsCard computed={computed} />
      </div>

      {/* Row 4: Emergency Support — full width */}
      <PregnancyEmergencyCard />
    </div>
  );
}
