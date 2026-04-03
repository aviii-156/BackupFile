/**
 * Sathi Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Business-logic layer for the Sathi (women's health) feature.
 *
 * Responsibilities:
 *  • Get-or-create a SathiHealthProfile (auto-activated for female users)
 *  • Cycle management (log period, update, compute phase windows)
 *  • Daily symptom logging (upsert by userId + date, fire-and-forget AI call)
 *  • Relief recommendations + health insights (AI result persistence)
 *  • Pregnancy mode toggle, profile updates, reminders
 */

import mongoose from 'mongoose';
import {
  SathiHealthProfile,
  SathiCycleLog,
  SathiSymptomLog,
  SathiPregnancyProfile,
  SathiMaternalReminder,
  SathiHealthInsight,
  SathiReliefRecommendation,
} from '../models/sathi/index.js';
import { analyseSathiSymptoms, getSathiPregnancyTip } from './ai.service.js';
import { ApiError } from '../utils/apiError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return midnight UTC for a given date (or today if omitted).
 * Used so all "logDate" fields compare cleanly.
 */
const toMidnightUTC = (date) => {
  const d = date ? new Date(date) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Compute the four cycle phase windows from a cycle start date + length.
 * Returns an array of { phase, startDay, endDay, startDate, endDate }.
 */
const computePhaseWindows = (startDate, cycleLength, periodDuration = 5) => {
  const ovulationDay   = Math.round(cycleLength - 14); // luteal phase = 14 days
  const follicularEnd  = ovulationDay - 1;
  const ovulationEnd   = ovulationDay + 1;

  const dayOffset = (n) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + n - 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  return [
    {
      phase: 'menstrual',
      startDay: 1,
      endDay: periodDuration,
      startDate: dayOffset(1),
      endDate: dayOffset(periodDuration),
    },
    {
      phase: 'follicular',
      startDay: periodDuration + 1,
      endDay: follicularEnd,
      startDate: dayOffset(periodDuration + 1),
      endDate: dayOffset(follicularEnd),
    },
    {
      phase: 'ovulation',
      startDay: ovulationDay,
      endDay: ovulationEnd,
      startDate: dayOffset(ovulationDay),
      endDate: dayOffset(ovulationEnd),
    },
    {
      phase: 'luteal',
      startDay: ovulationEnd + 1,
      endDay: cycleLength,
      startDate: dayOffset(ovulationEnd + 1),
      endDate: dayOffset(cycleLength),
    },
  ];
};

/**
 * Derive the current cycle phase from an active SathiCycleLog and today.
 * Returns { phase, cycleDay } or null if outside cycle window.
 */
const getCurrentPhase = (cycleLog) => {
  if (!cycleLog) return { phase: null, cycleDay: null };
  const today  = toMidnightUTC();
  const start  = toMidnightUTC(cycleLog.startDate);
  const cycleDay = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  if (cycleDay < 1 || cycleDay > cycleLog.cycleLength) {
    return { phase: null, cycleDay };
  }
  const matched = cycleLog.phaseWindows.find(
    (w) => cycleDay >= w.startDay && cycleDay <= w.endDay,
  );
  return { phase: matched?.phase ?? 'luteal', cycleDay };
};

/**
 * Default maternal reminders seeded when pregnancy mode is first enabled.
 */
const DEFAULT_REMINDERS = [
  { type: 'prenatal_vitamins', title: 'Take prenatal vitamins',   icon: 'pill',          notificationTime: '08:00', description: 'Folic acid, iron, and DHA are crucial for baby\'s development.' },
  { type: 'hydration',         title: 'Drink 8+ glasses of water', icon: 'droplets',     notificationTime: '09:00', description: 'Staying hydrated reduces swelling and supports amniotic fluid.' },
  { type: 'sleep',             title: 'Get 8 hours of sleep',      icon: 'moon',         notificationTime: '21:30', description: 'Side sleeping (left side) improves blood flow to baby.' },
  { type: 'exercise',          title: 'Light prenatal exercise',   icon: 'activity',     notificationTime: '10:00', description: '20–30 minutes of walking or prenatal yoga keeps you feeling your best.' },
  { type: 'health_check',      title: 'Morning health check-in',   icon: 'heart',        notificationTime: '07:00', description: 'Note any unusual symptoms and share them with your doctor.' },
  { type: 'medication',        title: 'Track any medications',     icon: 'clipboard',    notificationTime: '08:30', description: 'Keep a log of all medications/supplements approved by your doctor.' },
].map((r) => ({ ...r, isDefault: true, frequency: 'daily', isEnabled: true }));

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * Get or create the SathiHealthProfile for a female user.
 * Throws 403 for non-female users.
 */
export const getOrCreateProfile = async (userId, user) => {
  if (user.gender !== 'female') {
    throw new ApiError(403, 'Sathi is designed for female users', 'SATHI_NOT_ELIGIBLE');
  }

  let profile = await SathiHealthProfile.findOne({ userId });

  if (!profile) {
    profile = await SathiHealthProfile.create({
      userId,
      defaultCycleLength:    28,
      defaultPeriodDuration: 5,
      knownConditions:       ['none'],
      pregnancyModeEnabled:  false,
    });
  }

  return profile;
};

/**
 * Update cycle defaults and known conditions.
 */
export const setupProfile = async (userId, data) => {
  const profile = await SathiHealthProfile.findOneAndUpdate(
    { userId },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!profile) throw new ApiError(404, 'Sathi profile not found', 'PROFILE_NOT_FOUND');
  return profile;
};

// ─── Cycle ───────────────────────────────────────────────────────────────────

/**
 * Fetch the currently active cycle log for the user.
 */
export const getActiveCycle = async (userId) => {
  return SathiCycleLog.findOne({ userId, status: 'active' }).sort({ startDate: -1 });
};

/**
 * Log the start of a new menstrual period.
 * Closes any existing active cycle, then creates a new one.
 */
export const logPeriod = async (userId, data) => {
  const profile = await SathiHealthProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, 'Sathi profile not found', 'PROFILE_NOT_FOUND');

  const startDate      = toMidnightUTC(data.startDate || new Date());
  const cycleLength    = data.cycleLength    || profile.defaultCycleLength    || 28;
  const periodDuration = data.periodDuration || profile.defaultPeriodDuration || 5;

  // Close any currently active cycle
  const prevActive = await SathiCycleLog.findOne({ userId, status: 'active' });
  if (prevActive) {
    prevActive.status  = 'completed';
    prevActive.endDate = startDate;
    prevActive.periodDuration = Math.round((startDate - prevActive.startDate) / (1000 * 60 * 60 * 24));
    await prevActive.save();
  }

  // Compute predicted dates
  const predictedNextPeriod  = new Date(startDate);
  predictedNextPeriod.setUTCDate(predictedNextPeriod.getUTCDate() + cycleLength);

  const predictedOvulation = new Date(startDate);
  predictedOvulation.setUTCDate(predictedOvulation.getUTCDate() + (cycleLength - 14));

  const phaseWindows = computePhaseWindows(startDate, cycleLength, periodDuration);

  const newCycle = await SathiCycleLog.create({
    userId,
    healthProfileId:           profile._id,
    startDate,
    cycleLength,
    flowIntensity:             data.flowIntensity || null,
    predictedNextPeriodDate:   predictedNextPeriod,
    predictedOvulationDate:    predictedOvulation,
    phaseWindows,
    status:                    'active',
  });

  // Update profile stats
  await SathiHealthProfile.findByIdAndUpdate(profile._id, {
    $set: { 'stats.lastPeriodStartDate': startDate },
  });

  return newCycle;
};

/**
 * Update the active cycle's editable fields.
 */
export const updateCycle = async (userId, data) => {
  const cycle = await SathiCycleLog.findOne({ userId, status: 'active' });
  if (!cycle) throw new ApiError(404, 'No active cycle found', 'NO_ACTIVE_CYCLE');

  Object.assign(cycle, data);

  // If cycle length changed, recompute phase windows + predicted dates
  if (data.cycleLength) {
    const profile      = await SathiHealthProfile.findOne({ userId });
    const periodDur    = profile?.defaultPeriodDuration || 5;
    cycle.phaseWindows = computePhaseWindows(cycle.startDate, data.cycleLength, periodDur);

    const predictedNext = new Date(cycle.startDate);
    predictedNext.setUTCDate(predictedNext.getUTCDate() + data.cycleLength);
    cycle.predictedNextPeriodDate = predictedNext;
  }

  await cycle.save();
  return cycle;
};

// ─── Symptom logging ──────────────────────────────────────────────────────────

/**
 * Upsert today's symptom log (one per user per day).
 * Fires AI analysis asynchronously after storing.
 */
export const logSymptoms = async (userId, data) => {
  const profile  = await SathiHealthProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, 'Sathi profile not found', 'PROFILE_NOT_FOUND');

  const logDate  = toMidnightUTC(data.logDate);  // defaults to today
  const activeCycle = await getActiveCycle(userId);
  const { phase, cycleDay } = getCurrentPhase(activeCycle);

  const logData = {
    userId,
    healthProfileId:  profile._id,
    cycleLogId:       activeCycle?._id   ?? null,
    logDate,
    cycleDay,
    cyclePhase:       phase,
    symptoms:         data.symptoms         ?? [],
    symptomCount:     (data.symptoms ?? []).length,
    symptomSeverity:  data.symptomSeverity  ?? [],
    notes:            data.notes            ?? '',
    mood:             data.mood             ?? null,
    energyLevel:      data.energyLevel      ?? null,
    sentToAI:         false,
  };

  // Upsert: one log per user per day
  const log = await SathiSymptomLog.findOneAndUpdate(
    { userId, logDate },
    { $set: logData },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // Fire-and-forget AI analysis — do NOT await
  triggerAIAnalysis(log._id, profile, activeCycle).catch((err) => {
    console.error(`[Sathi] AI analysis failed for log ${log._id}: ${err.message}`);
  });

  return log;
};

/**
 * Get symptom logs for a user (with optional date/limit filters).
 */
export const getSymptomLogs = async (userId, { date, limit = 30 } = {}) => {
  const query = { userId };
  if (date) query.logDate = toMidnightUTC(date);

  return SathiSymptomLog.find(query)
    .sort({ logDate: -1 })
    .limit(Math.min(Number(limit), 90));
};

/**
 * Background worker: call Python AI, persist recommendations + insights.
 * Called async (fire-and-forget) from logSymptoms.
 */
export const triggerAIAnalysis = async (logId, profile, activeCycle) => {
  const log = await SathiSymptomLog.findById(logId);
  if (!log || log.sentToAI) return;   // already processed or missing

  const { phase, cycleDay } = getCurrentPhase(activeCycle);

  const payload = {
    symptoms:                 log.symptoms,
    cycle_phase:              phase,
    cycle_day:                cycleDay,
    is_pregnancy_mode:        profile.pregnancyModeEnabled,
    known_conditions:         profile.knownConditions,
    recent_symptoms_history:  [],   // could be enriched with last 3 logs in future
    mood:                     log.mood,
    energy_level:             log.energyLevel,
  };

  const aiResult = await analyseSathiSymptoms(payload);

  // Persist relief recommendations (upsert per symptomLogId)
  const relief = await SathiReliefRecommendation.findOneAndUpdate(
    { symptomLogId: log._id },
    {
      $set: {
        userId:               log.userId,
        symptomLogId:         log._id,
        reliefItems:          (aiResult.recommendations || []).map((r) => ({
          type:         r.type,
          title:        r.title,
          description:  r.description,
          icon:         r.icon || 'heart',
          confidence:   r.confidence,
        })),
        overallConfidence:    aiResult.overall_confidence,
        aiModel:              aiResult.ai_model,
        generationLatencyMs:  aiResult.latency_ms,
      },
    },
    { new: true, upsert: true, runValidators: false },
  );

  // Persist health insights
  const insights = aiResult.insights || [];
  const insightDocs = insights.map((insight) => ({
    userId:            log.userId,
    healthProfileId:   profile._id,
    insightType:       insight.insight_type === 'symptom_pattern'  ? 'symptom_pattern'
                     : insight.insight_type === 'cycle_analysis'   ? 'cycle_analysis'
                     : 'general_wellness',
    title:             insight.title,
    body:              insight.body,
    severity:          insight.severity || 'info',
    tags:              insight.tags || [],
    sourceSymptomLogIds: [log._id],
    confidence:        aiResult.overall_confidence,
    isRead:            false,
  }));

  if (insightDocs.length) {
    await SathiHealthInsight.insertMany(insightDocs, { ordered: false });
  }

  // Mark log as sent to AI and link the recommendation
  await SathiSymptomLog.findByIdAndUpdate(log._id, {
    $set: {
      sentToAI:                true,
      reliefRecommendationId:  relief._id,
      aiProcessedAt:           new Date(),
    },
  });
};

// ─── Relief & insights ────────────────────────────────────────────────────────

/**
 * Get relief recommendations for a specific date (default: today).
 */
export const getRelief = async (userId, logDate) => {
  const date = toMidnightUTC(logDate);
  const log  = await SathiSymptomLog.findOne({ userId, logDate: date });
  if (!log) return null;

  return SathiReliefRecommendation.findOne({ symptomLogId: log._id });
};

/**
 * Get latest health insights (unread first, then older).
 */
export const getInsights = async (userId, limit = 20) => {
  return SathiHealthInsight.find({ userId })
    .sort({ isRead: 1, createdAt: -1 })
    .limit(Math.min(Number(limit), 50))
    .select('-rawAiPayload');
};

/**
 * Mark insights as read.
 */
export const markInsightsRead = async (userId, ids) => {
  return SathiHealthInsight.updateMany(
    { userId, _id: { $in: ids } },
    { $set: { isRead: true } },
  );
};

// ─── Pregnancy mode ───────────────────────────────────────────────────────────

/**
 * Enable or disable pregnancy mode.
 * When enabling, creates a SathiPregnancyProfile and seeds default reminders.
 */
export const togglePregnancyMode = async (userId, enabled, estimatedDueDate, source = 'manual') => {
  const profile = await SathiHealthProfile.findOne({ userId });
  if (!profile) throw new ApiError(404, 'Sathi profile not found', 'PROFILE_NOT_FOUND');

  if (!enabled) {
    // Disable: mark current pregnancy profile inactive, clear reference
    if (profile.activePregnancyProfileId) {
      await SathiPregnancyProfile.findByIdAndUpdate(
        profile.activePregnancyProfileId,
        { $set: { isActive: false } },
      );
    }
    profile.pregnancyModeEnabled     = false;
    profile.activePregnancyProfileId = null;
    await profile.save();
    return { enabled: false };
  }

  // Enable: create new pregnancy profile
  const dueDate          = new Date(estimatedDueDate);
  const pregnancyStart   = new Date(dueDate);
  pregnancyStart.setUTCDate(pregnancyStart.getUTCDate() - 280);  // 40 weeks

  const pregnancyProfile = await SathiPregnancyProfile.create({
    userId,
    healthProfileId:    profile._id,
    estimatedDueDate:   dueDate,
    pregnancyStartDate: pregnancyStart,
    source,
    isActive:           true,
    outcome:            'ongoing',
  });

  // Seed default reminders
  const reminderDocs = DEFAULT_REMINDERS.map((r) => ({
    ...r,
    userId,
    pregnancyProfileId: pregnancyProfile._id,
  }));
  await SathiMaternalReminder.insertMany(reminderDocs, { ordered: false });

  profile.pregnancyModeEnabled     = true;
  profile.activePregnancyProfileId = pregnancyProfile._id;
  await profile.save();

  return pregnancyProfile;
};

/**
 * Get the active pregnancy profile (with reminders count).
 */
export const getPregnancyProfile = async (userId) => {
  const profile = await SathiHealthProfile.findOne({ userId });
  if (!profile?.pregnancyModeEnabled) return null;
  return SathiPregnancyProfile.findById(profile.activePregnancyProfileId);
};

/**
 * Update pregnancy details such as due date correction or add a weekly milestone.
 */
export const updatePregnancyProfile = async (userId, data) => {
  const profile = await SathiHealthProfile.findOne({ userId });
  if (!profile?.activePregnancyProfileId) {
    throw new ApiError(404, 'No active pregnancy profile', 'NO_PREGNANCY_PROFILE');
  }

  const { milestoneEntry, ...directUpdates } = data;
  const update = {};

  if (Object.keys(directUpdates).length) {
    // Recompute pregnancyStartDate if due date changes
    if (directUpdates.estimatedDueDate) {
      const dueDate = new Date(directUpdates.estimatedDueDate);
      directUpdates.pregnancyStartDate = new Date(dueDate);
      directUpdates.pregnancyStartDate.setUTCDate(
        directUpdates.pregnancyStartDate.getUTCDate() - 280,
      );
    }
    update.$set = directUpdates;
  }

  if (milestoneEntry) {
    update.$push = { weeklyMilestones: milestoneEntry };
  }

  return SathiPregnancyProfile.findByIdAndUpdate(
    profile.activePregnancyProfileId,
    update,
    { new: true, runValidators: true },
  );
};

/**
 * Fetch the AI-generated weekly pregnancy tip.
 */
export const fetchPregnancyTip = async (userId) => {
  const pregnancyProfile = await getPregnancyProfile(userId);
  if (!pregnancyProfile) throw new ApiError(404, 'No active pregnancy profile', 'NO_PREGNANCY_PROFILE');

  const sathiProfile = await SathiHealthProfile.findOne({ userId });

  const payload = {
    weeks_pregnant:   pregnancyProfile.currentWeek,
    trimester:        pregnancyProfile.trimester,
    known_conditions: sathiProfile?.knownConditions ?? [],
  };

  const tip = await getSathiPregnancyTip(payload);

  // Persist as a pregnancy_update insight
  await SathiHealthInsight.create({
    userId,
    healthProfileId: sathiProfile._id,
    insightType:     'pregnancy_update',
    title:           tip.tip_title || `Week ${pregnancyProfile.currentWeek} Tip`,
    body:            tip.tip_body  || '',
    confidence:      0.9,
    isRead:          false,
    expiresAt:       (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })(),
  });

  return tip;
};

// ─── Reminders ────────────────────────────────────────────────────────────────

/**
 * Get all maternal reminders for the currently active pregnancy profile.
 */
export const getReminders = async (userId) => {
  const profile = await SathiHealthProfile.findOne({ userId });
  if (!profile?.activePregnancyProfileId) return [];

  const today = toMidnightUTC();
  const reminders = await SathiMaternalReminder.find({
    userId,
    pregnancyProfileId: profile.activePregnancyProfileId,
  }).sort({ isDefault: -1, createdAt: 1 });

  // Annotate each reminder with a `completedToday` boolean for the UI
  return reminders.map((r) => {
    const completedToday = r.completions.some(
      (c) => c.completedDate.getTime() === today.getTime(),
    );
    return { ...r.toObject(), completedToday };
  });
};

/**
 * Update a reminder's settings (title, time, enabled flag).
 */
export const updateReminder = async (userId, reminderId, data) => {
  const reminder = await SathiMaternalReminder.findOneAndUpdate(
    { _id: reminderId, userId },
    { $set: data },
    { new: true, runValidators: true },
  );
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  return reminder;
};

/**
 * Toggle today's completion for a reminder.
 * If already completed today, removes the entry (toggle off).
 */
export const toggleReminderCompletion = async (userId, reminderId) => {
  const today = toMidnightUTC();
  const reminder = await SathiMaternalReminder.findOne({ _id: reminderId, userId });
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');

  const alreadyDone = reminder.completions.some(
    (c) => c.completedDate.getTime() === today.getTime(),
  );

  if (alreadyDone) {
    // Toggle off
    reminder.completions = reminder.completions.filter(
      (c) => c.completedDate.getTime() !== today.getTime(),
    );
  } else {
    reminder.completions.push({ completedDate: today });
  }

  await reminder.save();
  return { completedToday: !alreadyDone, reminderId };
};
