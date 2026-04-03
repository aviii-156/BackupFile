import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en',
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    intent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  // Prescription attached to this chat session (chatbot prescription feature)
  prescriptionContext: {
    imageUrl: { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
    extractedMedicines: { type: Array, default: [] },
    doctorInfo: { type: Object, default: null },
    patientInfo: { type: Object, default: null },
    diagnosis: { type: String, default: '' },
    instructions: { type: String, default: '' },
    warnings: { type: Array, default: [] },
    interactionCheck: { type: Object, default: null },
    extractedAt: { type: Date, default: null },
    sessionLabel: { type: String, default: null },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for querying active sessions by user
chatSessionSchema.index({ userId: 1, isActive: 1 });
// Note: sessionId already has unique index from schema definition

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
