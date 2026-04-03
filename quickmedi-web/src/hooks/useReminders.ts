/**
 * useReminders – CRUD for medication reminders connected to backend API
 */
import { useState, useCallback } from "react";
import { reminderService } from "@/services/reminderService";
import type { Reminder, ReminderFormData } from "@/types/reminder";

interface RemindersState {
  reminders: Reminder[];
  stats: any | null;
  isLoading: boolean;
  error: string | null;
}

export function useReminders() {
  const [state, setState] = useState<RemindersState>({
    reminders: [],
    stats: null,
    isLoading: false,
    error: null,
  });

  const setLoading = () => setState((prev) => ({ ...prev, isLoading: true, error: null }));
  const setError = (error: string) => setState((prev) => ({ ...prev, isLoading: false, error }));

  const fetchReminders = useCallback(async () => {
    setLoading();
    try {
      const reminders = await reminderService.getReminders();
      setState((prev) => ({ ...prev, reminders, isLoading: false }));
    } catch (e: any) {
      setError(e.message ?? "Failed to load reminders");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading();
    try {
      const stats = await reminderService.getStats();
      setState((prev) => ({ ...prev, stats, isLoading: false }));
    } catch (e: any) {
      setError(e.message ?? "Failed to load stats");
    }
  }, []);

  const createReminder = useCallback(async (data: ReminderFormData) => {
    setLoading();
    try {
      const reminder = await reminderService.createReminder(data);
      setState((prev) => ({
        ...prev,
        reminders: [reminder, ...prev.reminders],
        isLoading: false,
      }));
      return reminder;
    } catch (e: any) {
      setError(e.message ?? "Failed to create reminder");
      return null;
    }
  }, []);

  const updateReminder = useCallback(async (id: string, data: Partial<ReminderFormData>) => {
    try {
      const updated = await reminderService.updateReminder(id, data);
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? updated : r)),
      }));
    } catch (e: any) {
      setError(e.message ?? "Failed to update reminder");
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await reminderService.deleteReminder(id);
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.filter((r) => r.id !== id),
      }));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete reminder");
    }
  }, []);

  const markDoseTaken = useCallback(async (id: string) => {
    try {
      const updated = await reminderService.markDoseTaken(id);
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? updated : r)),
      }));
    } catch (e: any) {
      setError(e.message ?? "Failed to mark dose");
    }
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const updated = await reminderService.toggleActive(id, isActive);
      setState((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? updated : r)),
      }));
    } catch (e: any) {
      setError(e.message ?? "Failed to toggle reminder");
    }
  }, []);

  return {
    ...state,
    fetchReminders,
    fetchStats,
    createReminder,
    updateReminder,
    deleteReminder,
    markDoseTaken,
    toggleActive,
  };
}
