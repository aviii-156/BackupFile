import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { apiResponse } from '../utils/apiResponse.js';
import { sendMedicineReminderNotification } from '../services/notification.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip empty-string optional ObjectId / date fields so Mongoose doesn't choke */
const sanitiseBody = (body) => {
  const optionalIds = ['medicineId', 'prescriptionId'];
  const optionalDates = ['endDate'];
  const out = { ...body };
  for (const key of optionalIds) {
    if (out[key] === '' || out[key] === null) delete out[key];
  }
  for (const key of optionalDates) {
    if (out[key] === '' || out[key] === null) delete out[key];
  }
  return out;
};

const toClientReminder = (doc) => {
  const obj = doc.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

const isTodayInRange = (reminder) => {
  const now = new Date();
  const start = new Date(reminder.startDate);
  start.setHours(0, 0, 0, 0);
  if (now < start) return false;
  if (reminder.endDate) {
    const end = new Date(reminder.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }
  return true;
};

const isActiveToday = (reminder) => {
  if (!reminder.isActive) return false;
  if (!isTodayInRange(reminder)) return false;
  if (reminder.frequency === 'weekly') {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    return reminder.customDays && reminder.customDays.includes(today);
  }
  if (reminder.frequency === 'custom') {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = days[new Date().getDay()];
    return reminder.customDays && reminder.customDays.includes(today);
  }
  return true;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/reminders
 * Get all reminders for the authenticated patient
 */
export const getReminders = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .lean();

  const result = reminders.map(({ _id, __v, ...rest }) => ({ id: _id.toString(), ...rest }));
  apiResponse(res, 200, 'Reminders fetched successfully', { reminders: result });
});

/**
 * GET /api/reminders/stats
 * Get reminder statistics for the authenticated patient
 */
export const getReminderStats = asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ userId: req.userId }).lean();

  const now = new Date();
  const active = reminders.filter((r) => {
    if (!r.isActive) return false;
    if (r.endDate && new Date(r.endDate) < now) return false;
    return true;
  }).length;

  const today = reminders.filter((r) => isActiveToday(r)).length;
  const taken = reminders.reduce((sum, r) => sum + (r.takenDoses || 0), 0);
  const missed = reminders.reduce((sum, r) => sum + (r.missedDoses || 0), 0);
  const highRisk = reminders.filter((r) => (r.consecutiveMisses || 0) >= 4).length;

  apiResponse(res, 200, 'Stats fetched', { stats: { active, today, taken, missed, highRisk } });
});

/**
 * GET /api/reminders/:id
 * Get a single reminder by ID
 */
export const getReminderById = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  apiResponse(res, 200, 'Reminder fetched', { reminder: toClientReminder(reminder) });
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
export const createReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.create({
    userId: req.userId,
    ...sanitiseBody(req.body),
  });
  apiResponse(res, 201, 'Reminder created successfully', { reminder: toClientReminder(reminder) });
});

/**
 * PATCH /api/reminders/:id
 * Update an existing reminder
 */
export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: sanitiseBody(req.body) },
    { new: true, runValidators: true }
  );
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  apiResponse(res, 200, 'Reminder updated successfully', { reminder: toClientReminder(reminder) });
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  apiResponse(res, 200, 'Reminder deleted successfully', null);
});

/**
 * POST /api/reminders/:id/mark-taken
 * Mark a dose as taken — increments takenDoses, resets consecutiveMisses
 */
export const markDoseTaken = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    {
      $inc: { takenDoses: 1, totalDoses: 1 },
      $set: { consecutiveMisses: 0, lastTakenAt: new Date() },
    },
    { new: true }
  );
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  apiResponse(res, 200, 'Dose marked as taken', { reminder: toClientReminder(reminder) });
});

/**
 * POST /api/reminders/:id/mark-missed
 * Mark a dose as missed — increments missedDoses and consecutiveMisses
 */
export const markDoseMissed = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    {
      $inc: { missedDoses: 1, totalDoses: 1, consecutiveMisses: 1 },
    },
    { new: true }
  );
  if (!reminder) throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');

  // Optionally warn at high-risk threshold
  if (reminder.consecutiveMisses >= 4) {
    const user = await User.findById(req.userId).select('fcmTokens');
    if (user?.fcmTokens?.length) {
      const tokens = user.fcmTokens.map((t) => t.token);
      sendMedicineReminderNotification(
        tokens,
        reminder.medicineName,
        reminder.dosage || '',
        'High risk: 4+ consecutive missed doses'
      ).catch(() => {}); // fire-and-forget
    }
  }

  apiResponse(res, 200, 'Dose marked as missed', { reminder: toClientReminder(reminder) });
});
