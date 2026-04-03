import express from 'express';
import { speakText, voiceStatus } from '../controllers/voice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requirePatientOrApprovedVendor } from '../middleware/role.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Public health check — no auth required
router.get('/status', voiceStatus);

// Authenticated routes
router.use(authenticate);
router.use(requirePatientOrApprovedVendor); // patient + approved vendor only
router.use(authRateLimit);

/**
 * POST /api/voice/speak
 * Body: { text: string, language?: "en"|"hi"|... }
 * Returns: audio/wav binary
 *
 * Converts text to speech using local Piper TTS (no internet after model download).
 */
router.post('/speak', speakText);

export default router;
