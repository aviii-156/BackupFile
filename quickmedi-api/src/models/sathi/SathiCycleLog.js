/**
 * SathiCycleLog
 * ─────────────────────────────────────────────────────────────────────────────
 * One document per menstrual cycle per user.
 * Represents the complete arc of a single cycle: period start → predicted or
 * actual next period start.
 *
 * Relationship:  User  1 ──► N  SathiCycleLog
 *                SathiHealthProfile  1 ──► N  SathiCycleLog
 *
 * Phases are NOT stored per-cycle (they are derived on read from startDate +
 * cycleLength), but the predicted phase boundaries ARE stored so the frontend
 * can render them without recomputing every time.
 */

import mongoose from 'mongoose';

// ── Predicted phase window sub-schema ─────────────────────────────────────────
const phaseWindowSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: ['menstrual', 'follicular', 'ovulation', 'luteal'],
      required: true,
    },
    startDay:    { type: Number, required: true },   // day-of-cycle number (1-based)
    endDay:      { type: Number, required: true },
    startDate:   { type: Date,   required: true },
    endDate:     { type: Date,   required: true },
  },
  { _id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────
const sathiCycleLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    healthProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiHealthProfile',
      required: true,
      index: true,
    },

    // ── Period dates ───────────────────────────────────────────────────────
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      // null while period is ongoing; set when user logs end or next period starts
      type: Date,
      default: null,
    },
    periodDuration: {
      // computed as (endDate - startDate) in days; null while ongoing
      type: Number,
      default: null,
    },

    // ── Cycle length for this specific cycle ──────────────────────────────
    cycleLength: {
      // Copied from user default at creation; may differ cycle-to-cycle
      type: Number,
      required: true,
      min: 20,
      max: 45,
    },

    // ── Predicted dates (derived on creation) ─────────────────────────────
    predictedNextPeriodDate: {
      type: Date,
      required: true,
    },
    predictedOvulationDate: {
      type: Date,
    },

    // ── Phase boundaries (precomputed for quick UI render) ─────────────────
    phaseWindows: [phaseWindowSchema],

    // ── Flow intensity of the period ──────────────────────────────────────
    flowIntensity: {
      type: String,
      enum: ['light', 'medium', 'heavy', null],
      default: null,
    },

    // ── Status lifecycle ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'completed', 'predicted'],
      default: 'active',
      index: true,
    },

    // ── Data provenance ────────────────────────────────────────────────────
    loggedVia: {
      type: String,
      enum: ['manual', 'ai_predicted', 'imported'],
      default: 'manual',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ── AI analysis state ─────────────────────────────────────────────────
    aiAnalysed: {
      type: Boolean,
      default: false,
    },
    aiAnalysedAt: {
      type: Date,
      default: null,
    },
    // ID of the SathiHealthInsight generated for this cycle summary
    cycleInsightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiHealthInsight',
      default: null,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sathiCycleLogSchema.index({ userId: 1, startDate: -1 });         // user's cycle history, latest first
sathiCycleLogSchema.index({ userId: 1, status: 1 });             // find active cycle quickly
sathiCycleLogSchema.index({ predictedNextPeriodDate: 1 });       // notification scheduler

const SathiCycleLog = mongoose.model('SathiCycleLog', sathiCycleLogSchema);

export default SathiCycleLog;
