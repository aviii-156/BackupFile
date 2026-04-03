/**
 * SathiMaternalReminder
 * ─────────────────────────────────────────────────────────────────────────────
 * Each document is one recurring or one-off reminder for a pregnant user.
 * Default reminders (prenatal_vitamins, hydration, etc.) are seeded when
 * pregnancyMode is first enabled. Users can add custom reminders on top.
 *
 * Relationship:  SathiPregnancyProfile  1 ──► N  SathiMaternalReminder
 *                User                   1 ──► N  SathiMaternalReminder
 *
 * Daily completion is tracked via completions[] so we can show a progress
 * bar ("5 of 6 done today") without mutating the reminder document itself.
 */

import mongoose from 'mongoose';

// ── Completion record sub-schema ──────────────────────────────────────────────
// Appended each time the user taps the reminder's checkbox.
// TTL index (90 days) keeps this from growing indefinitely.
const completionSchema = new mongoose.Schema(
  {
    completedDate: {
      type: Date,
      required: true,   // midnight UTC of the local day
      index: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────
const sathiMaternalReminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pregnancyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiPregnancyProfile',
      required: true,
      // index: true,
    },

    // ── Reminder identity ──────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'prenatal_vitamins',
        'hydration',
        'doctor_appointment',
        'health_check',
        'sleep',
        'exercise',
        'medication',
        'custom',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    icon: {
      // Lucide icon name stored as string so the frontend can map it dynamically
      type: String,
      default: 'bell',
    },

    // ── Schedule ──────────────────────────────────────────────────────────
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom', 'once'],
      default: 'daily',
    },
    // ISO time string "HH:MM" — used by notification service
    notificationTime: {
      type: String,
      match: [/^\d{2}:\d{2}$/, 'notificationTime must be in HH:MM format'],
      default: '09:00',
    },
    nextReminderAt: {
      type: Date,
      index: true,   // scheduler picks up reminders due in the next window
    },
    // For weekly / custom frequency: which days of the week (0=Sun … 6=Sat)
    scheduledDays: {
      type: [Number],
      default: [],
    },

    // ── State ─────────────────────────────────────────────────────────────
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Seeded reminders cannot be deleted — only disabled
    isDefault: {
      type: Boolean,
      default: false,
    },
    // Ordered position in UI list
    sortOrder: {
      type: Number,
      default: 0,
    },

    // ── Completion history (rolling 90-day window) ─────────────────────────
    completions: [completionSchema],
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sathiMaternalReminderSchema.index({ userId: 1, isEnabled: 1, sortOrder: 1 });
sathiMaternalReminderSchema.index({ pregnancyProfileId: 1 });
sathiMaternalReminderSchema.index({ nextReminderAt: 1, isEnabled: 1 });

const SathiMaternalReminder = mongoose.model('SathiMaternalReminder', sathiMaternalReminderSchema);

export default SathiMaternalReminder;
