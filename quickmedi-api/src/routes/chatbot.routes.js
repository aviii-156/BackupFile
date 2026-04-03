import express from 'express';
import multer from 'multer';
import { sendMessage, getHistory, clearHistory, listSessions, sendVoiceMessage, uploadPrescriptionToChat, askAboutChatPrescription } from '../controllers/chatbot.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePatientOrApprovedVendor } from '../middleware/role.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Audio upload middleware – memory storage, audio files only, max 25 MB
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      'audio/webm', 'audio/ogg',
      'video/webm', // Chrome records as video/webm when it contains audio
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`), false);
    }
  },
});

// Prescription image upload middleware – memory storage, images/PDF only, max 10 MB
const prescriptionImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Use JPG, PNG, WebP or PDF.`), false);
    }
  },
});

const sendMessageSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  sessionId: Joi.string().optional(),
});

const prescriptionAskSchema = Joi.object({
  question: Joi.string().min(1).max(2000).required(),
  sessionId: Joi.string().required(),
});

router.use(authenticate);
router.use(requirePatientOrApprovedVendor); // patient + approved vendor only
router.use(authRateLimit);

router.post('/message', validate(sendMessageSchema), sendMessage);
router.post('/voice', audioUpload.single('audio'), sendVoiceMessage);

// Prescription-in-chatbot routes
router.post('/prescription', prescriptionImageUpload.single('image'), uploadPrescriptionToChat);
router.post('/prescription-ask', validate(prescriptionAskSchema), askAboutChatPrescription);

router.get('/sessions', listSessions);
router.get('/:sessionId/history', getHistory);
router.delete('/:sessionId', clearHistory);

export default router;
