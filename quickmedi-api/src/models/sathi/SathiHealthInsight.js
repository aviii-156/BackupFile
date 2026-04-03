/**
 * SathiHealthInsight
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores AI-generated analysis results returned by the Python service.
 * Each insight is tagged with a type, optional source references, a
 * human-readable title + body, a raw AI payload, and a confidence score.
 *
 * The Node backend writes one document here after every successful call to
 * /api/ai/analyse (Python service).  The frontend fetches the latest N insights
 * from GET /sathi/insights.
 *
 * Relationship:  User             1 ──► N  SathiHealthInsight
 *                SathiCycleLog    N ──► N  SathiHealthInsight  (via sourceCycleLogIds[])
 *                SathiSymptomLog  N ──► N  SathiHealthInsight  (via sourceSymptomLogIds[])
 */

import mongoose from 'mongoose';

const sathiHealthInsightSchema = new mongoose.Schema(
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

    // ── Classification ────────────────────────────────────────────────────
    insightType: {
      type: String,
      enum: [
        'cycle_analysis',       // end-of-cycle summary
        'symptom_pattern',      // recurring symptom trend detected
        'pregnancy_update',     // weekly pregnancy tip from AI
        'relief_recommendation',// why a specific relief was suggested
        'anomaly',              // unusual pattern (e.g., cycle length spike)
        'general_wellness',     // catch-all health tip
      ],
      required: true,
      index: true,
    },

    // ── Display content ───────────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    // Short summary (≤120 chars) for notification push
    summary: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    // Severity / urgency — used to colour-code cards in the UI
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },

    // ── AI metadata ───────────────────────────────────────────────────────
    aiModel: {
      // e.g. "gemini-1.5-flash", "rule_engine_v2"
      type: String,
      default: 'gemini-1.5-flash',
    },
    confidence: {
      // 0.0 – 1.0; null when rule-based (certainty = 1 implicitly)
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    // Raw response from Python service — stored for debugging + re-generation
    rawAiPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,   // excluded from default queries (large blob)
    },

    // ── Source log references ──────────────────────────────────────────────
    // Used to trace back which data triggered this insight
    sourceSymptomLogIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SathiSymptomLog',
      },
    ],
    sourceCycleLogIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SathiCycleLog',
      },
    ],
    sourcePregnancyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiPregnancyProfile',
      default: null,
    },

    // ── User interaction ──────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    // User explicit feedback on insight quality
    feedbackRating: {
      type: Number,
      enum: [1, 2, 3, 4, 5, null],
      default: null,
    },
    feedbackText: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ── Expiry / relevance window ─────────────────────────────────────────
    // Insights expire after 90 days by default; pregnancy tips may stay longer
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sathiHealthInsightSchema.index({ userId: 1, createdAt: -1 });
sathiHealthInsightSchema.index({ userId: 1, insightType: 1, createdAt: -1 });
sathiHealthInsightSchema.index({ userId: 1, isRead: 1 });
sathiHealthInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-purge

const SathiHealthInsight = mongoose.model('SathiHealthInsight', sathiHealthInsightSchema);

export default SathiHealthInsight;
