import ChatSession from '../models/ChatSession.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { chatWithAI, voiceAsk, extractPrescriptionForChat, askAboutPrescription } from '../services/ai.service.js';
import { uploadToCloudinaryWithId } from '../config/cloudinary.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { message, sessionId } = req.body;

  const user = await User.findById(userId);
  const language = user.language || 'en';

  let chatSession;

  // Find or create session
  if (sessionId) {
    chatSession = await ChatSession.findOne({ sessionId, userId });
    if (!chatSession) {
      throw new ApiError(404, 'Chat session not found');
    }
  } else {
    chatSession = await ChatSession.create({
      userId,
      sessionId: uuidv4(),
      language,
      messages: [],
      isActive: true,
    });
  }

  // Get conversation history for context
  const history = chatSession.messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Call AI service
  const aiResponse = await chatWithAI(message, language, history);

  // Append messages to session
  chatSession.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date(),
  });

  chatSession.messages.push({
    role: 'assistant',
    content: aiResponse.response,
    intent: aiResponse.intent || null,
    timestamp: new Date(),
  });

  chatSession.lastMessageAt = new Date();
  await chatSession.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessionId: chatSession.sessionId,
        message: aiResponse.response,
        suggestions: aiResponse.suggestions || [],
        followUpQuestions: aiResponse.follow_up_questions || [],
        intent: aiResponse.intent || null,
      },
      'Message sent successfully'
    )
  );
});

export const getHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const chatSession = await ChatSession.findOne({ sessionId, userId });

  if (!chatSession) {
    throw new ApiError(404, 'Chat session not found');
  }

  return res.status(200).json(
    new ApiResponse(200, {
      sessionId: chatSession.sessionId,
      messages: chatSession.messages,
      language: chatSession.language,
      lastMessageAt: chatSession.lastMessageAt,
    }, 'Chat history retrieved successfully')
  );
});

export const clearHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const chatSession = await ChatSession.findOne({ sessionId, userId });

  if (!chatSession) {
    throw new ApiError(404, 'Chat session not found');
  }

  chatSession.isActive = false;
  await chatSession.save();

  return res.status(200).json(new ApiResponse(200, null, 'Chat history cleared'));
});

export const listSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sessions = await ChatSession.find({ userId, isActive: true })
    .select('sessionId language lastMessageAt createdAt')
    .sort({ lastMessageAt: -1 })
    .limit(10);

  return res.status(200).json(new ApiResponse(200, sessions, 'Chat sessions retrieved successfully'));
});

/**
 * Voice message handler
 *
 * Accepts an audio file upload, sends it through the Python voice pipeline
 * (Whisper STT → Gemini → Gemini TTS), saves the conversation, and returns
 * the transcript, text answer, and base64 audio for the client to play.
 */
export const sendVoiceMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!req.file) {
    throw new ApiError(400, 'Audio file is required');
  }

  const { sessionId, medicineName, language, mode } = req.body;

  const user = await User.findById(userId);
  const userLanguage = language || null;  // null = auto-detect in Python

  let chatSession;

  // Find or create session
  if (sessionId) {
    chatSession = await ChatSession.findOne({ sessionId, userId });
    if (!chatSession) {
      throw new ApiError(404, 'Chat session not found');
    }
  } else {
    chatSession = await ChatSession.create({
      userId,
      sessionId: uuidv4(),
      language: user.language || 'en',
      messages: [],
      isActive: true,
    });
  }

  // Forward audio to Python voice pipeline
  const voiceMode = mode === 'one-way' ? 'one-way' : 'two-way';
  const aiResponse = await voiceAsk(
    req.file.buffer,
    req.file.mimetype,
    medicineName || null,
    chatSession.sessionId,
    userLanguage,   // null = auto-detect
    voiceMode,
  );

  const transcript = aiResponse.transcript || '';
  const answerText = aiResponse.response || aiResponse.message || '';

  // Persist both turns in the chat session
  if (transcript) {
    chatSession.messages.push({ role: 'user', content: `[Voice] ${transcript}`, timestamp: new Date() });
  }
  if (answerText) {
    chatSession.messages.push({ role: 'assistant', content: answerText, timestamp: new Date() });
  }
  chatSession.lastMessageAt = new Date();
  await chatSession.save();

  const meta = {
    sessionId: chatSession.sessionId,
    transcript,
    detectedLanguage: aiResponse.detectedLanguage || null,
    message: answerText,
    mode: aiResponse.mode || voiceMode,
    suggestions: aiResponse.suggestions || [],
    followUpQuestions: aiResponse.followUpQuestions || [],
  };

  if (aiResponse.audioBuffer) {
    // Forward raw audio binary to mobile client; metadata goes in header
    const metaB64 = Buffer.from(JSON.stringify(meta), 'utf8').toString('base64');
    return res
      .status(200)
      .set('Content-Type', aiResponse.audioMime || 'audio/wav')
      .set('X-Voice-Meta', metaB64)
      .set('Access-Control-Expose-Headers', 'X-Voice-Meta')
      .send(aiResponse.audioBuffer);
  }

  // One-way or no audio — plain JSON
  return res.status(200).json(new ApiResponse(200, meta, 'Voice message processed successfully'));
});

/**
 * POST /api/chatbot/prescription
 * Upload a prescription image → Cloudinary → Gemini Flash extraction → stored in ChatSession
 */
export const uploadPrescriptionToChat = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { sessionId } = req.body;

  if (!req.file) {
    throw new ApiError(400, 'Prescription image is required');
  }

  // ── 1. Compress image with sharp ──────────────────────────────────────
  let imageBuffer = req.file.buffer;
  const mimeType = req.file.mimetype;

  if (mimeType.startsWith('image/')) {
    imageBuffer = await sharp(req.file.buffer)
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  }

  // ── 2. Upload to Cloudinary ────────────────────────────────────────────
  const filename = `chat-rx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const { url: imageUrl, publicId: cloudinaryPublicId } = await uploadToCloudinaryWithId(
    imageBuffer,
    'chat_prescriptions',
    filename,
  );

  // ── 3. Call Python AI for extraction ──────────────────────────────────
  const extraction = await extractPrescriptionForChat(imageUrl, null, 'image/jpeg');

  if (!extraction.success) {
    throw new ApiError(502, 'Failed to extract prescription data from AI service');
  }

  // ── 4. Find or create chat session ────────────────────────────────────
  const user = await User.findById(userId);
  const language = user?.language || 'en';

  let chatSession;
  if (sessionId) {
    chatSession = await ChatSession.findOne({ sessionId, userId });
  }
  if (!chatSession) {
    chatSession = await ChatSession.create({
      userId,
      sessionId: sessionId || uuidv4(),
      language,
    });
  }

  // ── 5. Store prescription context in session ──────────────────────────
  const prescriptionDate = extraction.patient_info?.date || new Date().toLocaleDateString('en-IN');
  chatSession.prescriptionContext = {
    imageUrl,
    cloudinaryPublicId,
    extractedMedicines: extraction.medicines || [],
    doctorInfo: extraction.doctor_info || {},
    patientInfo: extraction.patient_info || {},
    diagnosis: extraction.diagnosis || '',
    instructions: extraction.instructions || '',
    warnings: extraction.warnings || [],
    interactionCheck: extraction.interaction_check || null,
    extractedAt: new Date(),
    sessionLabel: `Prescription – ${prescriptionDate}`,
  };

  // Add a system message summarising the uploaded prescription
  const medicineNames = (extraction.medicines || [])
    .map(m => m.name)
    .filter(Boolean)
    .join(', ');

  const systemMessage = [
    `📋 Prescription uploaded successfully.`,
    medicineNames ? `Medicines found: ${medicineNames}.` : 'No medicines detected.',
    extraction.warnings?.length
      ? `⚠️ ${extraction.warnings.join(' ')}`
      : '',
    extraction.interaction_check?.has_interactions
      ? '⚠️ Drug interaction detected — please read the details below.'
      : '',
  ].filter(Boolean).join(' ');

  chatSession.messages.push({
    role: 'assistant',
    content: systemMessage,
    intent: 'prescription_upload',
    timestamp: new Date(),
  });
  chatSession.lastMessageAt = new Date();
  await chatSession.save();

  return res.status(200).json(
    new ApiResponse(200, {
      sessionId: chatSession.sessionId,
      imageUrl,
      extraction,
      systemMessage,
    }, 'Prescription uploaded and extracted successfully'),
  );
});

/**
 * POST /api/chatbot/prescription-ask
 * Answer a follow-up question about the prescription stored in the session.
 */
export const askAboutChatPrescription = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { question, sessionId } = req.body;

  if (!question?.trim()) {
    throw new ApiError(400, 'Question is required');
  }
  if (!sessionId) {
    throw new ApiError(400, 'sessionId is required');
  }

  const chatSession = await ChatSession.findOne({ sessionId, userId });
  if (!chatSession) {
    throw new ApiError(404, 'Chat session not found');
  }

  const ctx = chatSession.prescriptionContext;
  if (!ctx?.extractedMedicines?.length) {
    throw new ApiError(400, 'No prescription found in this session. Please upload a prescription first.');
  }

  const user = await User.findById(userId);
  const language = user?.language || chatSession.language || 'en';

  // Call Python AI with medicines context
  const aiResponse = await askAboutPrescription(
    question,
    ctx.extractedMedicines,
    sessionId,          // re-use Node sessionId as Python session key
    language,
  );

  if (!aiResponse.success) {
    throw new ApiError(502, 'AI service failed to answer the question');
  }

  // Save Q&A to session history
  chatSession.messages.push({ role: 'user', content: question, intent: 'prescription_ask', timestamp: new Date() });
  chatSession.messages.push({ role: 'assistant', content: aiResponse.answer, intent: 'prescription_answer', timestamp: new Date() });
  chatSession.lastMessageAt = new Date();
  await chatSession.save();

  return res.status(200).json(
    new ApiResponse(200, {
      sessionId,
      answer: aiResponse.answer,
      suggestions: aiResponse.suggestions || [],
      followUpQuestions: aiResponse.follow_up_questions || [],
      safetyWarnings: aiResponse.safety_warnings || [],
      interactionAlert: aiResponse.interaction_alert || false,
    }, 'Prescription question answered'),
  );
});
