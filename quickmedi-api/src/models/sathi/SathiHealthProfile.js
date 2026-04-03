/**
 * SathiHealthProfile
 * ─────────────────────────────────────────────────────────────────────────────
 * One document per user. Acts as the root "settings + aggregate stats" record
 * for the Sathi feature.  All other Sathi collections reference userId back
 * to User._id AND to this document's _id via healthProfileId.
 *
 * Relationship:  User  1 ──► 1  SathiHealthProfile
 */

import mongoose from 'mongoose';

// ── Symptom frequency sub-schema ──────────────────────────────────────────────
// Stores how many times each symptom was logged (updated by background job /
// AI insight trigger) so the frontend can show "Top symptoms this month" fast.
const symptomFrequencySchema = new mongoose.Schema(
  {
    symptom: {
      type: String,
      enum: [
        'cramps', 'headache', 'fatigue', 'bloating',
        'mood_swings', 'back_pain', 'acne', 'nausea', 'sleep_issues',
      ],
      required: true,
    },
    count: { type: Number, default: 0 },
    lastLoggedAt: { type: Date },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────
const sathiHealthProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,   // strictly one profile per user
      index: true,
    },

    // ── Cycle defaults (editable by user) ─────────────────────────────────
    defaultCycleLength: {
      type: Number,
      default: 28,
      min: 20,
      max: 45,
    },
    defaultPeriodDuration: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },

    // ── Known conditions for personalised AI advice ────────────────────────
    knownConditions: {
      type: [String],
      enum: ['pcos', 'endometriosis', 'fibroids', 'thyroid', 'none'],
      default: ['none'],
    },

    // ── Pregnancy mode toggle ──────────────────────────────────────────────
    pregnancyModeEnabled: {
      type: Boolean,
      default: false,
    },
    // Points to the currently active SathiPregnancyProfile document
    activePregnancyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiPregnancyProfile',
      default: null,
    },

    // ── Computed / cached aggregate stats ─────────────────────────────────
    // Updated by a background job after each symptom log or cycle update.
    stats: {
      averageCycleLength:     { type: Number, default: null },
      cycleRegularityScore:   { type: Number, default: null, min: 0, max: 10 },
      totalCyclesTracked:     { type: Number, default: 0 },
      totalSymptomLogs:       { type: Number, default: 0 },
      checkInConsistency:     { type: Number, default: 0, min: 0, max: 10 },
      // Number of check-ins in rolling 30-day window
      logsLast30Days:         { type: Number, default: 0 },
      // Dominant symptom from last 3 cycles
      topSymptoms:            { type: [String], default: [] },
      lastAnalysedAt:         { type: Date, default: null },
    },

    // ── Per-symptom frequency map (lifetime) ──────────────────────────────
    symptomFrequencies: [symptomFrequencySchema],

    // ── AI service interaction tracking ───────────────────────────────────
    lastInsightRequestedAt: { type: Date, default: null },
    totalInsightsGenerated: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sathiHealthProfileSchema.index({ userId: 1 });
sathiHealthProfileSchema.index({ pregnancyModeEnabled: 1 });

const SathiHealthProfile = mongoose.model('SathiHealthProfile', sathiHealthProfileSchema);

export default SathiHealthProfile;
