import cron from 'node-cron';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import { sendMedicineReminderNotification } from './notification.service.js';

/**
 * Check if a reminder should fire at a given HH:MM time string
 */
const shouldFireNow = (reminder, hhmm) => {
  if (!reminder.isActive) return false;

  const now = new Date();

  // Check date range
  const start = new Date(reminder.startDate);
  start.setHours(0, 0, 0, 0);
  if (now < start) return false;

  if (reminder.endDate) {
    const end = new Date(reminder.endDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  // Check if today is a valid day for this reminder
  if (reminder.frequency === 'weekly' || reminder.frequency === 'custom') {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = dayKeys[now.getDay()];
    if (!reminder.customDays || !reminder.customDays.includes(todayKey)) return false;
  }

  // Check if this time slot matches
  return reminder.times.includes(hhmm);
};

/** 2.5 hours in milliseconds */
const WINDOW_MS = 150 * 60_000;
/** 15 minutes pre-window in milliseconds */
const PRE_WINDOW_MS = 15 * 60_000;

/**
 * Check if a reminder's frequency is valid for a given date (weekly / custom days)
 */
const isValidDay = (reminder, date) => {
  if (reminder.frequency === 'weekly' || reminder.frequency === 'custom') {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return Array.isArray(reminder.customDays) && reminder.customDays.includes(dayKeys[date.getDay()]);
  }
  return true;
};

/**
 * Main scheduler — runs every minute.
 *  1. Fires push notifications when a reminder time matches now.
 *  2. Auto-marks doses as missed when the 2.5-hour take-window closes without the user acting.
 */
export const startReminderScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const hhmm = `${hh}:${mm}`;

      // ── 1. Push notifications for reminders firing right now ──────────────
      const reminders = await Reminder.find({
        isActive: true,
        times: hhmm,
        startDate: { $lte: now },
        $or: [{ endDate: { $gte: now } }, { endDate: null }, { endDate: { $exists: false } }],
      }).lean();

      if (reminders.length > 0) {
        const userIds = [...new Set(reminders.map((r) => r.userId.toString()))];
        const users = await User.find({ _id: { $in: userIds }, isActive: true })
          .select('_id fcmTokens')
          .lean();

        const userMap = {};
        for (const u of users) userMap[u._id.toString()] = u;

        const notificationPromises = [];
        for (const reminder of reminders) {
          if (!shouldFireNow(reminder, hhmm)) continue;
          const user = userMap[reminder.userId.toString()];
          if (!user?.fcmTokens?.length) continue;
          const tokens = user.fcmTokens.map((t) => t.token).filter(Boolean);
          if (!tokens.length) continue;
          notificationPromises.push(
            sendMedicineReminderNotification(tokens, reminder.medicineName, reminder.dosage || '', hhmm)
              .catch((err) => console.error(`[ReminderScheduler] Notif error [${reminder._id}]:`, err.message))
          );
        }
        await Promise.allSettled(notificationPromises);
        if (notificationPromises.length > 0) {
          console.log(`[ReminderScheduler] Sent ${notificationPromises.length} notifications at ${hhmm}`);
        }
      }

      // ── 2. Auto-mark missed: check the slot that closed exactly 2.5 hrs ago ─
      // At minute T+150, find reminders whose times[] contains T ("HH:MM 2.5hrs ago")
      // and where lastTakenAt is NOT within that slot's take-window.
      const slotTime = new Date(now.getTime() - WINDOW_MS);          // 2.5 hrs ago
      const windowStart = new Date(slotTime.getTime() - PRE_WINDOW_MS); // 15 min before slot
      const slotHH = String(slotTime.getHours()).padStart(2, '0');
      const slotMM = String(slotTime.getMinutes()).padStart(2, '0');
      const slotHHMM = `${slotHH}:${slotMM}`;

      const expiredCandidates = await Reminder.find({
        isActive: true,
        times: slotHHMM,
        startDate: { $lte: slotTime },
        $and: [
          { $or: [{ endDate: { $gte: slotTime } }, { endDate: null }, { endDate: { $exists: false } }] },
          // Not taken within the window
          { $or: [{ lastTakenAt: null }, { lastTakenAt: { $exists: false } }, { lastTakenAt: { $lt: windowStart } }] },
        ],
      }).lean();

      // Respect weekly / custom-day schedule for the slot's date (not necessarily today)
      const toMiss = expiredCandidates.filter((r) => isValidDay(r, slotTime));

      if (toMiss.length > 0) {
        const ids = toMiss.map((r) => r._id);
        await Reminder.updateMany(
          { _id: { $in: ids } },
          { $inc: { missedDoses: 1, totalDoses: 1, consecutiveMisses: 1 } }
        );
        console.log(`[ReminderScheduler] Auto-missed ${toMiss.length} dose(s) for slot ${slotHHMM}`);

        // Send high-risk alert for reminders crossing 4 consecutive misses
        const highRisk = toMiss.filter((r) => (r.consecutiveMisses || 0) + 1 >= 4);
        if (highRisk.length > 0) {
          const hrUserIds = [...new Set(highRisk.map((r) => r.userId.toString()))];
          const hrUsers = await User.find({ _id: { $in: hrUserIds } }).select('_id fcmTokens').lean();
          const hrUserMap = Object.fromEntries(hrUsers.map((u) => [u._id.toString(), u]));
          const hrPromises = highRisk
            .map((r) => {
              const u = hrUserMap[r.userId.toString()];
              if (!u?.fcmTokens?.length) return null;
              const tokens = u.fcmTokens.map((t) => t.token).filter(Boolean);
              if (!tokens.length) return null;
              return sendMedicineReminderNotification(
                tokens, r.medicineName, r.dosage || '', 'High risk: 4+ consecutive missed doses'
              ).catch((e) => console.error(`[ReminderScheduler] High-risk notif error:`, e.message));
            })
            .filter(Boolean);
          await Promise.allSettled(hrPromises);
        }
      }
    } catch (err) {
      console.error('[ReminderScheduler] Error:', err.message);
    }
  });

  console.log('[ReminderScheduler] Medicine reminder scheduler started');
};
