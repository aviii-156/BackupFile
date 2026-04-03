"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import { emergencyService } from "@/services/emergency.service";
import type { Emergency } from "@/types/api-types";

// ─── Types ────────────────────────────────────────────────────────────────────
type EmergencyType = "pharmacy_alert" | "ambulance" | "family_alert";

interface EmergencyContextValue {
  activeEmergency: Emergency | null;
  isTriggering: boolean;
  triggerEmergency: (
    type: EmergencyType,
    latitude: number,
    longitude: number,
    note?: string
  ) => Promise<Emergency>;
  resolveEmergency: () => Promise<void>;
  pollStatus: (emergencyId: string) => void;
  stopPolling: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const EmergencyContext = createContext<EmergencyContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [activeEmergency, setActiveEmergency] = useState<Emergency | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerEmergency = useCallback(
    async (
      type: EmergencyType,
      latitude: number,
      longitude: number,
      note?: string
    ): Promise<Emergency> => {
      setIsTriggering(true);
      try {
        const res = await emergencyService.triggerEmergency({
          type,
          latitude,
          longitude,
          note,
        });
        if (!res.success || !res.data) throw new Error(res.message || "Emergency trigger failed");
        setActiveEmergency(res.data);
        return res.data;
      } finally {
        setIsTriggering(false);
      }
    },
    []
  );

  const resolveEmergency = useCallback(async () => {
    if (!activeEmergency) return;
    stopPolling();
    await emergencyService.resolveEmergency(activeEmergency._id);
    setActiveEmergency(null);
  }, [activeEmergency]);

  const pollStatus = useCallback((emergencyId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await emergencyService.getEmergencyStatus(emergencyId);
        if (res.success && res.data) {
          setActiveEmergency(res.data);
          if (res.data.status === "resolved" || res.data.status === "cancelled") {
            stopPolling();
          }
        }
      } catch {}
    }, 5000); // poll every 5s
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  return (
    <EmergencyContext.Provider
      value={{
        activeEmergency,
        isTriggering,
        triggerEmergency,
        resolveEmergency,
        pollStatus,
        stopPolling,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useEmergencyContext() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error("useEmergencyContext must be used inside <EmergencyProvider>");
  return ctx;
}
