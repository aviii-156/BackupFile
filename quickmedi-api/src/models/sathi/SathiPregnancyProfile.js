/**
 * SathiPregnancyProfile
 * ─────────────────────────────────────────────────────────────────────────────
 * One active document per user while pregnancyModeEnabled === true.
 * Historical pregnancies are kept with isActive: false for lifetime record.
 *
 * Relationship:  User                1 ──► N  SathiPregnancyProfile  (history)
 *                SathiHealthProfile  1 ──► 1  SathiPregnancyProfile  (active, via activePregnancyProfileId)
 *                SathiPregnancyProfile 1 ──► N  SathiMaternalReminder
 */

import mongoose from 'mongoose';

// ── Doctor appointment sub-schema (embedded array) ────────────────────────────
const appointmentSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true },
    appointedAt:   { type: Date,   required: true },
    location:      { type: String, trim: true },
    doctorName:    { type: String, trim: true },
    notes:         { type: String, trim: true, maxlength: 500 },
    isCompleted:   { type: Boolean, default: false },
    completedAt:   { type: Date,   default: null },
  },
  { timestamps: true, id: false },
);

// ── Weekly milestone log (what happened at each check-in week) ────────────────
const weeklyMilestoneSchema = new mongoose.Schema(
  {
    week:         { type: Number, required: true, min: 1, max: 40 },
    notes:        { type: String, trim: true, maxlength: 1000 },
    weight:       { type: Number },              // kg
    bloodPressure: { type: String },             // e.g. "120/80"
    loggedAt:     { type: Date, default: Date.now },
  },
  { _id: false, id: false },
);

// ── Main schema ───────────────────────────────────────────────────────────────
const sathiPregnancyProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // index: true,
    },
    healthProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SathiHealthProfile',
      required: true,
      index: true,
    },

    // ── Key dates ─────────────────────────────────────────────────────────
    estimatedDueDate: {
      type: Date,
      required: true,
    },
    // Derived: estimatedDueDate - 280 days.  Stored for fast reads.
    pregnancyStartDate: {
      type: Date,
      required: true,
    },
    // Set when pregnancy concludes (delivery or termination)
    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    // ── Current state (recomputed on read but cached here for queries) ─────
    currentWeek: {
      type: Number,
      default: 1,
      min: 1,
      max: 42,
    },
    trimester: {
      type: String,
      enum: ['First', 'Second', 'Third'],
      default: 'First',
    },

    // ── How due date was determined ────────────────────────────────────────
    source: {
      type: String,
      enum: ['manual', 'doctor_confirmed', 'ultrasound', 'lmp_calculated'],
      default: 'manual',
    },

    // ── Outcome ───────────────────────────────────────────────────────────
    outcome: {
      type: String,
      enum: ['ongoing', 'delivered', 'miscarriage', 'terminated', 'unknown'],
      default: 'ongoing',
    },

    // ── Active flag ───────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ── Doctor appointments (embedded for simple CRUD) ────────────────────
    appointments: [appointmentSchema],

    // ── Weekly milestone journal ──────────────────────────────────────────
    weeklyMilestones: [weeklyMilestoneSchema],

    // ── Baby details (filled post-delivery) ──────────────────────────────
    babyDetails: {
      name:        { type: String, trim: true },
      gender:      { type: String, enum: ['male', 'female', 'other', null], default: null },
      birthWeight: { type: Number },   // grams
      birthLength: { type: Number },   // centimetres
    },

    // ── Free notes ────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // ── AI analysis ───────────────────────────────────────────────────────
    lastAiAnalysedAt: { type: Date, default: null },
  },
  { timestamps: true, id: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sathiPregnancyProfileSchema.index({ userId: 1, isActive: 1 });
sathiPregnancyProfileSchema.index({ estimatedDueDate: 1 });          // notification scheduler

// ── Pre-save: keep currentWeek & trimester in sync with estimatedDueDate ──────
sathiPregnancyProfileSchema.pre('save', function (next) {
  if (this.isModified('estimatedDueDate') || this.isModified('pregnancyStartDate')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(this.pregnancyStartDate);
    start.setHours(0, 0, 0, 0);
    const daysPregnant = Math.max(0, Math.floor((today - start) / 86_400_000));
    const weeks = Math.floor(daysPregnant / 7);
    this.currentWeek = Math.min(Math.max(weeks, 1), 42);
    if (this.currentWeek <= 13)      this.trimester = 'First';
    else if (this.currentWeek <= 26) this.trimester = 'Second';
    else                              this.trimester = 'Third';
  }
  next();
});

const SathiPregnancyProfile = mongoose.model('SathiPregnancyProfile', sathiPregnancyProfileSchema);

export default SathiPregnancyProfile;
