/**
 * Sathi Service
 * API client for all Sathi (women's health) endpoints.
 */

import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import type { ApiResponse } from '@/types/api-types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SathiProfile {
  _id: string;
  userId: string;
  defaultCycleLength: number;
  defaultPeriodDuration: number;
  knownConditions: string[];
  pregnancyModeEnabled: boolean;
  activePregnancyProfileId: string | null;
  stats: {
    averageCycleLength: number | null;
    cycleRegularityScore: number | null;
    lastPeriodStartDate: string | null;
    totalCyclesTracked: number;
    monthlyCheckInRate: number | null;
  };
}

export interface SathiCycle {
  _id: string;
  startDate: string;
  cycleLength: number;
  flowIntensity: 'light' | 'medium' | 'heavy' | null;
  predictedNextPeriodDate: string;
  predictedOvulationDate: string;
  phaseWindows: {
    phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
    startDay: number;
    endDay: number;
    startDate: string;
    endDate: string;
  }[];
  status: 'active' | 'completed' | 'predicted';
}

export interface SathiSymptomLog {
  _id: string;
  logDate: string;
  symptoms: string[];
  symptomSeverity: { symptom: string; severity: number }[];
  notes: string;
  mood: number | null;
  energyLevel: number | null;
  cycleDay: number | null;
  cyclePhase: string | null;
  sentToAI: boolean;
  reliefRecommendationId: string | null;
}

export interface ReliefItem {
  type: string;
  title: string;
  description: string;
  icon: string;
  confidence: number;
  is_medicine_suggestion: boolean;
  markedHelpful: boolean | null;
}

export interface SathiRelief {
  _id: string;
  reliefItems: ReliefItem[];
  overallConfidence: number;
  aiModel: string;
}

export interface SathiInsight {
  _id: string;
  insightType: string;
  title: string;
  body: string;
  severity: string;
  tags: string[];
  isRead: boolean;
  confidence: number;
  createdAt: string;
}

export interface SathiPregnancy {
  _id: string;
  estimatedDueDate: string;
  pregnancyStartDate: string;
  currentWeek: number;
  trimester: 'First' | 'Second' | 'Third';
  source: string;
  outcome: string;
  appointments: {
    _id: string;
    title: string;
    appointedAt: string;
    location?: string;
    doctorName?: string;
    notes?: string;
    isCompleted: boolean;
  }[];
  weeklyMilestones: {
    week: number;
    notes?: string;
    weight?: number;
    bloodPressure?: string;
    loggedAt: string;
  }[];
}

export interface SathiReminder {
  _id: string;
  type: string;
  title: string;
  description?: string;
  icon: string;
  frequency: string;
  notificationTime: string;
  isEnabled: boolean;
  isDefault: boolean;
  completedToday: boolean;
  completions: { completedDate: string }[];
}

export interface PregnancyTip {
  week: number;
  trimester: string;
  tip_title: string;
  tip_body: string;
  do_list: string[];
  avoid_list: string[];
  when_to_call_doctor: string[];
  nutrition_focus?: string;
  exercise_note?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const sathiService = {

  /** Get or create the Sathi health profile (auto-activates for female users) */
  async getProfile(): Promise<ApiResponse<{ profile: SathiProfile }>> {
    return apiClient.get(API_CONFIG.API.SATHI.PROFILE);
  },

  /** Update cycle defaults and known conditions */
  async setupProfile(data: {
    defaultCycleLength?: number;
    defaultPeriodDuration?: number;
    knownConditions?: string[];
  }): Promise<ApiResponse<{ profile: SathiProfile }>> {
    return apiClient.put(API_CONFIG.API.SATHI.PROFILE_SETUP, data);
  },

  /** Get the active cycle log */
  async getActiveCycle(): Promise<ApiResponse<{ cycle: SathiCycle | null }>> {
    return apiClient.get(API_CONFIG.API.SATHI.CYCLE);
  },

  /** Log the start of a new menstrual period */
  async logPeriod(data: {
    startDate: string;
    flowIntensity?: 'light' | 'medium' | 'heavy';
    cycleLength?: number;
    notes?: string;
  }): Promise<ApiResponse<{ cycle: SathiCycle }>> {
    return apiClient.post(API_CONFIG.API.SATHI.LOG_PERIOD, data);
  },

  /** Edit the active cycle */
  async updateCycle(data: {
    cycleLength?: number;
    flowIntensity?: string;
    notes?: string;
  }): Promise<ApiResponse<{ cycle: SathiCycle }>> {
    return apiClient.put(API_CONFIG.API.SATHI.CYCLE, data);
  },

  /** Log daily symptoms (triggers AI analysis async) */
  async logSymptoms(data: {
    symptoms: string[];
    symptomSeverity?: { symptom: string; severity: number }[];
    notes?: string;
    mood?: number | null;
    energyLevel?: number | null;
    logDate?: string;
  }): Promise<ApiResponse<{ log: SathiSymptomLog }>> {
    return apiClient.post(API_CONFIG.API.SATHI.SYMPTOMS, data);
  },

  /** Get symptom logs */
  async getSymptomLogs(opts?: { date?: string; limit?: number }): Promise<ApiResponse<{ logs: SathiSymptomLog[] }>> {
    const query = new URLSearchParams();
    if (opts?.date)  query.set('date',  opts.date);
    if (opts?.limit) query.set('limit', String(opts.limit));
    const qs = query.toString();
    return apiClient.get(`${API_CONFIG.API.SATHI.SYMPTOMS}${qs ? `?${qs}` : ''}`);
  },

  /** Get AI relief recommendations for a date (default: today) */
  async getRelief(date?: string): Promise<ApiResponse<{ relief: SathiRelief | null }>> {
    const qs = date ? `?date=${date}` : '';
    return apiClient.get(`${API_CONFIG.API.SATHI.RELIEF}${qs}`);
  },

  /** Get health insights */
  async getInsights(limit?: number): Promise<ApiResponse<{ insights: SathiInsight[] }>> {
    const qs = limit ? `?limit=${limit}` : '';
    return apiClient.get(`${API_CONFIG.API.SATHI.INSIGHTS}${qs}`);
  },

  /** Mark insights as read */
  async markInsightsRead(ids: string[]): Promise<ApiResponse<{}>> {
    return apiClient.post(API_CONFIG.API.SATHI.INSIGHTS_READ, { ids });
  },

  /** Toggle pregnancy mode on/off */
  async togglePregnancyMode(data: {
    enabled: boolean;
    estimatedDueDate?: string;
    source?: string;
  }): Promise<ApiResponse<{ pregnancy: SathiPregnancy | { enabled: false } }>> {
    return apiClient.post(API_CONFIG.API.SATHI.PREGNANCY_TOGGLE, data);
  },

  /** Get the active pregnancy profile */
  async getPregnancy(): Promise<ApiResponse<{ pregnancy: SathiPregnancy | null }>> {
    return apiClient.get(API_CONFIG.API.SATHI.PREGNANCY);
  },

  /** Update pregnancy details or add a milestone */
  async updatePregnancy(data: {
    estimatedDueDate?: string;
    source?: string;
    milestoneEntry?: {
      week: number;
      notes?: string;
      weight?: number;
      bloodPressure?: string;
    };
  }): Promise<ApiResponse<{ pregnancy: SathiPregnancy }>> {
    return apiClient.put(API_CONFIG.API.SATHI.PREGNANCY, data);
  },

  /** Fetch the AI weekly pregnancy tip */
  async getPregnancyTip(): Promise<ApiResponse<{ tip: PregnancyTip }>> {
    return apiClient.get(API_CONFIG.API.SATHI.PREGNANCY_TIP);
  },

  /** Get maternal reminders */
  async getReminders(): Promise<ApiResponse<{ reminders: SathiReminder[] }>> {
    return apiClient.get(API_CONFIG.API.SATHI.REMINDERS);
  },

  /** Update a reminder */
  async updateReminder(id: string, data: {
    isEnabled?: boolean;
    notificationTime?: string;
    title?: string;
    description?: string;
  }): Promise<ApiResponse<{ reminder: SathiReminder }>> {
    return apiClient.put(API_CONFIG.API.SATHI.REMINDER(id), data);
  },

  /** Toggle today's completion for a reminder */
  async toggleReminderComplete(id: string): Promise<ApiResponse<{
    completedToday: boolean;
    reminderId: string;
  }>> {
    return apiClient.post(API_CONFIG.API.SATHI.REMINDER_COMPLETE(id));
  },
};
