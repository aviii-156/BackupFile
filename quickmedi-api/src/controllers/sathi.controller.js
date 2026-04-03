/**
 * Sathi Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin request/response layer — delegates all logic to sathi.service.js.
 * Every handler is wrapped in asyncHandler so unhandled rejections surface as
 * proper ApiError responses via the global error middleware.
 */

import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse }  from '../utils/apiResponse.js';
import * as sathi       from '../services/sathi.service.js';

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * GET /api/sathi/profile
 * Auto-creates a SathiHealthProfile for first-time female users.
 * Frontend can call this on mount to know if Sathi is available.
 */
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await sathi.getOrCreateProfile(req.userId, req.user);
  apiResponse(res, 200, 'Sathi profile fetched', { profile });
});

/**
 * PUT /api/sathi/profile/setup
 * Update cycle defaults and known health conditions.
 */
export const setupProfile = asyncHandler(async (req, res) => {
  const profile = await sathi.setupProfile(req.userId, req.body);
  apiResponse(res, 200, 'Sathi profile updated', { profile });
});

// ─── Cycle ───────────────────────────────────────────────────────────────────

/**
 * GET /api/sathi/cycle
 * Returns the currently active cycle log (or null if none).
 */
export const getActiveCycle = asyncHandler(async (req, res) => {
  const cycle = await sathi.getActiveCycle(req.userId);
  apiResponse(res, 200, 'Active cycle fetched', { cycle: cycle ?? null });
});

/**
 * POST /api/sathi/cycle/log-period
 * Log the start of a menstrual period, creating a new cycle document.
 */
export const logPeriod = asyncHandler(async (req, res) => {
  const cycle = await sathi.logPeriod(req.userId, req.body);
  apiResponse(res, 201, 'Period logged successfully', { cycle });
});

/**
 * PUT /api/sathi/cycle
 * Edit the active cycle (length, flow, end date).
 */
export const updateCycle = asyncHandler(async (req, res) => {
  const cycle = await sathi.updateCycle(req.userId, req.body);
  apiResponse(res, 200, 'Cycle updated', { cycle });
});

// ─── Symptoms ────────────────────────────────────────────────────────────────

/**
 * POST /api/sathi/symptoms
 * Upsert today's symptom check-in. Triggers AI analysis asynchronously.
 */
export const logSymptoms = asyncHandler(async (req, res) => {
  const log = await sathi.logSymptoms(req.userId, req.body);
  apiResponse(res, 201, 'Symptoms logged. AI analysis is processing.', { log });
});

/**
 * GET /api/sathi/symptoms
 * List symptom logs. Supports ?date=YYYY-MM-DD and ?limit=N query params.
 */
export const getSymptomLogs = asyncHandler(async (req, res) => {
  const logs = await sathi.getSymptomLogs(req.userId, {
    date:  req.query.date,
    limit: req.query.limit,
  });
  apiResponse(res, 200, 'Symptom logs fetched', { logs });
});

// ─── Relief & insights ────────────────────────────────────────────────────────

/**
 * GET /api/sathi/relief
 * Returns AI relief recommendations for a specific date (?date=YYYY-MM-DD).
 * Defaults to today if "date" param is omitted.
 */
export const getRelief = asyncHandler(async (req, res) => {
  const relief = await sathi.getRelief(req.userId, req.query.date);
  apiResponse(res, 200, 'Relief recommendations fetched', { relief: relief ?? null });
});

/**
 * GET /api/sathi/insights
 * Returns the latest health insights for the user.
 * Unread insights appear first. Supports ?limit=N.
 */
export const getInsights = asyncHandler(async (req, res) => {
  const insights = await sathi.getInsights(req.userId, req.query.limit);
  apiResponse(res, 200, 'Insights fetched', { insights });
});

/**
 * POST /api/sathi/insights/read
 * Mark a list of insight IDs as read. Body: { ids: ['...'] }
 */
export const markInsightsRead = asyncHandler(async (req, res) => {
  await sathi.markInsightsRead(req.userId, req.body.ids || []);
  apiResponse(res, 200, 'Insights marked as read');
});

// ─── Pregnancy ───────────────────────────────────────────────────────────────

/**
 * POST /api/sathi/pregnancy/toggle
 * Enable / disable pregnancy mode. Body: { enabled, estimatedDueDate, source? }
 */
export const togglePregnancyMode = asyncHandler(async (req, res) => {
  const { enabled, estimatedDueDate, source } = req.body;
  const result = await sathi.togglePregnancyMode(req.userId, enabled, estimatedDueDate, source);
  const msg    = enabled ? 'Pregnancy mode enabled' : 'Pregnancy mode disabled';
  apiResponse(res, 200, msg, { pregnancy: result });
});

/**
 * GET /api/sathi/pregnancy
 * Returns the active pregnancy profile (or null if not in pregnancy mode).
 */
export const getPregnancy = asyncHandler(async (req, res) => {
  const pregnancy = await sathi.getPregnancyProfile(req.userId);
  apiResponse(res, 200, 'Pregnancy profile fetched', { pregnancy: pregnancy ?? null });
});

/**
 * PUT /api/sathi/pregnancy
 * Update EDD, source, or add a weekly milestone entry.
 */
export const updatePregnancy = asyncHandler(async (req, res) => {
  const pregnancy = await sathi.updatePregnancyProfile(req.userId, req.body);
  apiResponse(res, 200, 'Pregnancy profile updated', { pregnancy });
});

/**
 * GET /api/sathi/pregnancy/tip
 * Fetch or regenerate the AI weekly pregnancy tip for the current week.
 */
export const getPregnancyTip = asyncHandler(async (req, res) => {
  const tip = await sathi.fetchPregnancyTip(req.userId);
  apiResponse(res, 200, 'Pregnancy tip fetched', { tip });
});

// ─── Reminders ───────────────────────────────────────────────────────────────

/**
 * GET /api/sathi/reminders
 * Returns all maternal reminders for the active pregnancy profile.
 */
export const getReminders = asyncHandler(async (req, res) => {
  const reminders = await sathi.getReminders(req.userId);
  apiResponse(res, 200, 'Reminders fetched', { reminders });
});

/**
 * PUT /api/sathi/reminders/:reminderId
 * Update a reminder's title, notification time, or enabled state.
 */
export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await sathi.updateReminder(
    req.userId,
    req.params.reminderId,
    req.body,
  );
  apiResponse(res, 200, 'Reminder updated', { reminder });
});

/**
 * POST /api/sathi/reminders/:reminderId/complete
 * Toggle today's completion for a reminder (tap-to-check / tap-to-uncheck).
 */
export const toggleReminderCompletion = asyncHandler(async (req, res) => {
  const result = await sathi.toggleReminderCompletion(
    req.userId,
    req.params.reminderId,
  );
  apiResponse(res, 200, 'Reminder completion toggled', result);
});
