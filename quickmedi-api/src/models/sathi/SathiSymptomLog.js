/**
 * SathiSymptomLog
 * ─────────────────────────────────────────────────────────────────────────────
 * One document per day per user.  Records the daily symptom check-in from the
 * Sathi page.  After creation, the Node backend optionally forwards this to the
 * Python AI service; the resulting recommendations are stored in
 * SathiReliefRecommendation and linked back here via reliefRecommendationId.
 *
 * Relationship:  User           1 ──► N  SathiSymptomLog
 *                SathiCycleLog  1 ──► N  SathiSymptomLog  (via cycleLogId)
 *                SathiSymptomLog 1 ──► 1  SathiReliefRecommendation
 */

import mongoose from 'mongoose';

const VALID_SYMPTOMS = [
  'cramps', 'headache', 'fatigue', 'bloating',
  'mood_swings', 'back_pain', 'acne', 'nausea', 'sleep_issues',
];

const sathiSymptomLogSchema = new mongoose.Schema(
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
    },
    // Nullable: a log may be created before a cycle record exists (e.g., first use)
    cycleLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiCycleLog',
      default: null,
      index: true,
    },

    // ── Date ──────────────────────────────────────────────────────────────
    // Stored as midnight UTC of the local date to support "one log per day" uniqueness.
    logDate: {
      type: Date,
      required: true,
      index: true,
    },

    // ── Cycle context (snapshot at log time, denormalised for fast queries) ─
    cycleDay: {
      type: Number,    // 1-based day within the current cycle
      default: null,
    },
    cyclePhase: {
      type: String,
      enum: ['menstrual', 'follicular', 'ovulation', 'luteal', null],
      default: null,
    },

    // ── Symptoms ──────────────────────────────────────────────────────────
    symptoms: {
      type: [String],
      enum: VALID_SYMPTOMS,
      default: [],
      validate: {
        validator: (arr) => arr.every((s) => VALID_SYMPTOMS.includes(s)),
        message: 'symptoms array contains invalid values',
      },
    },
    symptomCount: {
      // Denormalised for aggregation queries (e.g., "avg symptoms per phase")
      type: Number,
      default: 0,
    },

    // ── Severity (optional per-symptom rating 1-5) ────────────────────────
    // Array of { symptom, severity } so severity is optional per entry.
    symptomSeverity: [
      {
        symptom: { type: String, enum: VALID_SYMPTOMS },
        severity: { type: Number, min: 1, max: 5 },
        _id: false,
      },
    ],

    // ── Free-text notes ───────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // ── Mood & energy (quick optional sliders) ────────────────────────────
    mood: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    energyLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // ── AI pipeline state ─────────────────────────────────────────────────
    // Set to true once this log's payload has been dispatched to the Python service.
    sentToAI: {
      type: Boolean,
      default: false,
      index: true,   // scheduler queries { sentToAI: false } to pick up new logs
    },
    aiProcessedAt: {
      type: Date,
      default: null,
    },
    // Back-reference to generated relief recommendations
    reliefRecommendationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiReliefRecommendation',
      default: null,
    },
    // Back-reference to any AI insight generated from this log
    insightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiHealthInsight',
      default: null,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Enforce one check-in per user per calendar day
sathiSymptomLogSchema.index({ userId: 1, logDate: 1 }, { unique: true });
sathiSymptomLogSchema.index({ userId: 1, logDate: -1 });           // recent logs feed
sathiSymptomLogSchema.index({ userId: 1, cyclePhase: 1 });         // phase-based analytics
sathiSymptomLogSchema.index({ sentToAI: 1, createdAt: 1 });        // AI dispatch queue

// ── Pre-save ──────────────────────────────────────────────────────────────────
sathiSymptomLogSchema.pre('save', function (next) {
  this.symptomCount = this.symptoms.length;
  next();
});

const SathiSymptomLog = mongoose.model('SathiSymptomLog', sathiSymptomLogSchema);

export default SathiSymptomLog;
