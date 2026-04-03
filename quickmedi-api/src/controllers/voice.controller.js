import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { textToSpeech } from '../services/ai.service.js';

/**
 * POST /api/voice/speak
 * Proxy to Piper TTS (local neural TTS in Python AI).
 * Returns raw WAV audio binary.
 *
 * Body: { text: string, language?: string }
 */
export const speakText = asyncHandler(async (req, res) => {
  const { text, language } = req.body;

  if (!text || !text.trim()) {
    throw new ApiError(400, 'text is required');
  }
  if (text.length > 5000) {
    throw new ApiError(400, 'Text too long (max 5000 characters)');
  }

  const { audioBuffer, audioMime } = await textToSpeech(
    text.trim(),
    language || 'en',
  );

  return res
    .status(200)
    .set('Content-Type', audioMime || 'audio/wav')
    .set('Access-Control-Expose-Headers', 'Content-Type')
    .send(audioBuffer);
});

/**
 * GET /api/voice/status
 * Quick health check for the voice pipeline.
 */
export const voiceStatus = asyncHandler(async (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, {
      pipeline: 'Whisper → Gemini Flash → Piper TTS',
      stt: 'Whisper (local)',
      reasoning: 'Gemini Flash (cloud)',
      tts: 'Piper TTS (local)',
      endpoints: {
        voiceAsk:   'POST /api/chatbot/voice',
        speak:      'POST /api/voice/speak',
        status:     'GET  /api/voice/status',
      },
    }, 'Voice pipeline is available')
  );
});
