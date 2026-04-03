"use client";

/**
 * useSathi
 * Central state-management hook for the Sathi (women's health) page.
 * Loads profile, active cycle, today's log/relief, insights, and pregnancy data.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  sathiService,
  type SathiProfile,
  type SathiCycle,
  type SathiSymptomLog,
  type SathiRelief,
  type SathiInsight,
  type SathiPregnancy,
  type SathiReminder,
  type PregnancyTip,
} from "@/services/sathi.service";

type Symptom = string;

/** Maps frontend display labels → backend snake_case enum values */
const SYMPTOM_TO_API: Record<string, string> = {
  "Cramps":      "cramps",
  "Headache":    "headache",
  "Fatigue":     "fatigue",
  "Bloating":    "bloating",
  "Mood Swings": "mood_swings",
  "Back Pain":   "back_pain",
  "Acne":        "acne",
  "Nausea":      "nausea",
  "Sleep Issues":"sleep_issues",
};

function toApiSymptoms(symptoms: Set<Symptom>): string[] {
  return Array.from(symptoms).map((s) => SYMPTOM_TO_API[s] ?? s.toLowerCase().replace(/\s+/g, "_"));
}

export interface UseSathiReturn {
  // Loading / error state
  loading: boolean;
  error: string | null;
  notEligible: boolean;         // true when user is not female

  // Data
  profile: SathiProfile | null;
  cycle: SathiCycle | null;
  todayLog: SathiSymptomLog | null;
  relief: SathiRelief | null;
  insights: SathiInsight[];
  pregnancy: SathiPregnancy | null;
  reminders: SathiReminder[];
  pregnancyTip: PregnancyTip | null;
  pregnancyMode: boolean;

  // Checkin local state
  selectedSymptoms: Set<Symptom>;
  notes: string;
  mood: number | null;
  energyLevel: number | null;
  savedToday: boolean;
  savingLog: boolean;

  // Actions
  setNotes: (v: string) => void;
  setMood: (v: number | null) => void;
  setEnergyLevel: (v: number | null) => void;
  toggleSymptom: (s: Symptom) => void;
  saveLog: () => Promise<void>;
  logPeriod: (startDate: string, flowIntensity?: string, cycleLength?: number) => Promise<void>;
  updateCycle: (data: { cycleLength?: number; flowIntensity?: string }) => Promise<void>;
  enablePregnancyMode: (dueDate: string, source?: string) => Promise<void>;
  disablePregnancyMode: () => Promise<void>;
  toggleReminderComplete: (id: string) => Promise<void>;
  updateReminder: (id: string, data: { isEnabled?: boolean; notificationTime?: string; title?: string }) => Promise<void>;
  refreshRelief: () => Promise<void>;
  markInsightsRead: (ids: string[]) => Promise<void>;
  refreshPregnancyTip: () => Promise<void>;
}

export function useSathi(): UseSathiReturn {
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [notEligible,        setNotEligible]        = useState(false);
  const [profile,            setProfile]            = useState<SathiProfile | null>(null);
  const [cycle,              setCycle]              = useState<SathiCycle | null>(null);
  const [todayLog,           setTodayLog]           = useState<SathiSymptomLog | null>(null);
  const [relief,             setRelief]             = useState<SathiRelief | null>(null);
  const [insights,           setInsights]           = useState<SathiInsight[]>([]);
  const [pregnancy,          setPregnancy]          = useState<SathiPregnancy | null>(null);
  const [reminders,          setReminders]          = useState<SathiReminder[]>([]);
  const [pregnancyTip,       setPregnancyTip]       = useState<PregnancyTip | null>(null);
  const [pregnancyMode,      setPregnancyMode]      = useState(false);

  // Checkin local state
  const [selectedSymptoms,   setSelectedSymptoms]   = useState<Set<Symptom>>(new Set());
  const [notes,              setNotes]              = useState("");
  const [mood,               setMood]               = useState<number | null>(null);
  const [energyLevel,        setEnergyLevel]        = useState<number | null>(null);
  const [savedToday,         setSavedToday]         = useState(false);
  const [savingLog,          setSavingLog]          = useState(false);

  const initialised = useRef(false);

  // ─── Initial data load ────────────────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Profile is the gateway — throws 403 for non-female users
      const profileRes = await sathiService.getProfile();
      if (!profileRes.success || !profileRes.data) {
        setError("Failed to load Sathi profile.");
        return;
      }

      const p = profileRes.data.profile;
      setProfile(p);
      setPregnancyMode(p.pregnancyModeEnabled);

      // Load cycle, insights, and (if pregnancy enabled) pregnancy data in parallel
      const [cycleRes, insightsRes] = await Promise.all([
        sathiService.getActiveCycle(),
        sathiService.getInsights(15),
      ]);

      if (cycleRes.success && cycleRes.data) setCycle(cycleRes.data.cycle);
      if (insightsRes.success && insightsRes.data) setInsights(insightsRes.data.insights);

      // Load today's symptom log + relief
      const todayStr = new Date().toISOString().split("T")[0];
      const [logsRes, reliefRes] = await Promise.all([
        sathiService.getSymptomLogs({ date: todayStr, limit: 1 }),
        sathiService.getRelief(todayStr),
      ]);

      if (logsRes.success && logsRes.data?.logs?.length) {
        const log = logsRes.data.logs[0];
        setTodayLog(log);
        setSavedToday(true);
        setSelectedSymptoms(new Set(log.symptoms));
        setNotes(log.notes ?? "");
        setMood(log.mood ?? null);
        setEnergyLevel(log.energyLevel ?? null);
      }

      if (reliefRes.success && reliefRes.data) setRelief(reliefRes.data.relief);

      // If pregnancy mode is on, load pregnancy profile + reminders
      if (p.pregnancyModeEnabled) {
        const [pregnancyRes, remindersRes] = await Promise.all([
          sathiService.getPregnancy(),
          sathiService.getReminders(),
        ]);
        if (pregnancyRes.success && pregnancyRes.data) setPregnancy(pregnancyRes.data.pregnancy);
        if (remindersRes.success && remindersRes.data) setReminders(remindersRes.data.reminders);
      }
    } catch (err: any) {
      // 403 = not a female user
      if (err.message?.includes("403") || err.message?.toLowerCase().includes("female")) {
        setNotEligible(true);
      } else {
        setError("Failed to load Sathi data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    loadInitialData();
  }, [loadInitialData]);

  // ─── Symptom toggle ───────────────────────────────────────────────────────

  const toggleSymptom = useCallback((s: Symptom) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
    setSavedToday(false);
  }, []);

  // ─── Save daily log ───────────────────────────────────────────────────────

  const saveLog = useCallback(async () => {
    if (savingLog) return;
    try {
      setSavingLog(true);
      const res = await sathiService.logSymptoms({
        symptoms: toApiSymptoms(selectedSymptoms),
        notes,
        mood,
        energyLevel,
      });
      if (!res.success) throw new Error(res.message || "Failed to save log");

      setTodayLog(res.data!.log);
      setSavedToday(true);
      toast.success("Today's log saved!", {
        description: `AI is processing your ${selectedSymptoms.size} symptom${selectedSymptoms.size !== 1 ? "s" : ""}.`,
      });

      // Poll for relief after a short delay (AI runs async on the backend)
      setTimeout(async () => {
        const reliefRes = await sathiService.getRelief();
        if (reliefRes.success && reliefRes.data?.relief) {
          setRelief(reliefRes.data.relief);
        }
      }, 8000);
    } catch (err: any) {
      toast.error("Could not save log", { description: err.message });
    } finally {
      setSavingLog(false);
    }
  }, [savingLog, selectedSymptoms, notes, mood, energyLevel]);

  // ─── Log period ───────────────────────────────────────────────────────────

  const logPeriod = useCallback(async (startDate: string, flowIntensity?: string, cycleLength?: number) => {
    try {
      const res = await sathiService.logPeriod({
        startDate,
        flowIntensity: flowIntensity as any,
        cycleLength,
      });
      if (!res.success) throw new Error(res.message || "Failed to log period");
      setCycle(res.data!.cycle);
      toast.success("Period logged! Cycle updated.");
    } catch (err: any) {
      toast.error("Could not log period", { description: err.message });
      throw err;
    }
  }, []);

  // ─── Update cycle ─────────────────────────────────────────────────────────

  const updateCycle = useCallback(async (data: { cycleLength?: number; flowIntensity?: string }) => {
    try {
      const res = await sathiService.updateCycle(data);
      if (!res.success) throw new Error(res.message || "Failed to update cycle");
      setCycle(res.data!.cycle);
      toast.success("Cycle updated!");
    } catch (err: any) {
      toast.error("Could not update cycle", { description: err.message });
      throw err;
    }
  }, []);

  // ─── Pregnancy mode ───────────────────────────────────────────────────────

  const enablePregnancyMode = useCallback(async (dueDate: string, source = "manual") => {
    try {
      const res = await sathiService.togglePregnancyMode({ enabled: true, estimatedDueDate: dueDate, source });
      if (!res.success) throw new Error(res.message || "Failed to enable pregnancy mode");

      setPregnancyMode(true);
      setProfile((p) => p ? { ...p, pregnancyModeEnabled: true } : p);

      const pregnancy = res.data?.pregnancy as SathiPregnancy;
      if (pregnancy) setPregnancy(pregnancy);

      // Load reminders that were just seeded
      const remRes = await sathiService.getReminders();
      if (remRes.success && remRes.data) setReminders(remRes.data.reminders);

      toast.success("Pregnancy mode enabled 🌸", {
        description: "Your personalised pregnancy companion is ready.",
      });
    } catch (err: any) {
      toast.error("Could not enable pregnancy mode", { description: err.message });
      throw err;
    }
  }, []);

  const disablePregnancyMode = useCallback(async () => {
    try {
      const res = await sathiService.togglePregnancyMode({ enabled: false });
      if (!res.success) throw new Error(res.message || "Failed to disable pregnancy mode");
      setPregnancyMode(false);
      setProfile((p) => p ? { ...p, pregnancyModeEnabled: false } : p);
      setPregnancy(null);
      setReminders([]);
      toast.success("Switched back to cycle tracking.");
    } catch (err: any) {
      toast.error("Could not disable pregnancy mode", { description: err.message });
      throw err;
    }
  }, []);

  // ─── Reminders ────────────────────────────────────────────────────────────

  const toggleReminderComplete = useCallback(async (id: string) => {
    try {
      const res = await sathiService.toggleReminderComplete(id);
      if (!res.success) throw new Error(res.message);
      const { completedToday } = res.data!;
      setReminders((prev) =>
        prev.map((r) => r._id === id ? { ...r, completedToday } : r)
      );
    } catch (err: any) {
      toast.error("Could not update reminder", { description: err.message });
    }
  }, []);

  const updateReminder = useCallback(async (id: string, data: { isEnabled?: boolean; notificationTime?: string; title?: string }) => {
    try {
      const res = await sathiService.updateReminder(id, data);
      if (!res.success) throw new Error(res.message);
      setReminders((prev) =>
        prev.map((r) => r._id === id ? { ...r, ...res.data!.reminder } : r)
      );
      toast.success("Reminder updated.");
    } catch (err: any) {
      toast.error("Could not update reminder", { description: err.message });
    }
  }, []);

  // ─── Refresh relief (manual) ─────────────────────────────────────────────

  const refreshRelief = useCallback(async () => {
    try {
      const res = await sathiService.getRelief();
      if (res.success && res.data) setRelief(res.data.relief);
    } catch { /* silent */ }
  }, []);

  // ─── Mark insights read ───────────────────────────────────────────────────

  const markInsightsRead = useCallback(async (ids: string[]) => {
    await sathiService.markInsightsRead(ids);
    setInsights((prev) =>
      prev.map((ins) => ids.includes(ins._id) ? { ...ins, isRead: true } : ins)
    );
  }, []);

  // ─── Refresh pregnancy tip ────────────────────────────────────────────────

  const refreshPregnancyTip = useCallback(async () => {
    try {
      const res = await sathiService.getPregnancyTip();
      if (res.success && res.data) setPregnancyTip(res.data.tip);
    } catch { /* silent */ }
  }, []);

  return {
    loading, error, notEligible,
    profile, cycle, todayLog, relief, insights, pregnancy, reminders, pregnancyTip, pregnancyMode,
    selectedSymptoms, notes, mood, energyLevel, savedToday, savingLog,
    setNotes, setMood, setEnergyLevel,
    toggleSymptom, saveLog,
    logPeriod, updateCycle,
    enablePregnancyMode, disablePregnancyMode,
    toggleReminderComplete, updateReminder,
    refreshRelief, markInsightsRead, refreshPregnancyTip,
  };
}
