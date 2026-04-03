"""
Voice Routes

POST /api/voice/ask        – full pipeline: audio → Whisper → Gemini Flash → Piper TTS → audio
POST /api/voice/transcribe – audio in → text only (Whisper STT)
POST /api/voice/speak      – text in  → audio out (Piper TTS, local)
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["Voice"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared service instance
# ---------------------------------------------------------------------------
_voice_service: Optional[VoiceService] = None


def get_voice_service() -> VoiceService:
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceService()
    return _voice_service


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/ask")
async def voice_ask(
    audio: UploadFile = File(..., description="Audio file (wav/mp3/m4a/webm)"),
    medicine_name: Optional[str] = Form(None, description="Medicine name for context"),
    conversation_id: Optional[str] = Form(None, description="Session ID for multi-turn"),
    language: Optional[str] = Form(None, description="ISO-639-1 hint – omit for auto-detect"),
    mode: Optional[str] = Form("two-way", description="'two-way' (audio reply) or 'one-way' (text reply only)"),
):
    """
    Voice pipeline: User voice → Whisper → Gemini Flash → Piper TTS → Audio

    - **two-way** (default): speaks back with Piper TTS (local, offline after model download).
    - **one-way**: text-only reply, skips TTS (~5 s faster).
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        effective_mode = mode if mode in ("one-way", "two-way") else "two-way"

        service = get_voice_service()
        result = await service.voice_ask(
            audio_bytes=audio_bytes,
            medicine_name=medicine_name,
            conversation_id=conversation_id,
            language=language or None,   # None = auto-detect
            mode=effective_mode,
        )

        # Metadata that always comes back as JSON-safe values
        meta = {
            "success": True,
            "transcript": result["transcript"],
            "detectedLanguage": result.get("detected_language"),
            "response": result["response_text"],
            "conversationId": result["conversation_id"],
            "suggestions": result.get("suggestions", []),
            "followUpQuestions": result.get("follow_up_questions", []),
            "mode": result["mode"],
        }

        if effective_mode == "two-way" and result.get("raw_audio"):
            # ── Two-way: return raw binary WAV, metadata in header ────────
            audio_bytes_out: bytes = result["raw_audio"]  # Piper already returns bytes
            audio_mime = result.get("audio_mime", "audio/wav")

            # Encode metadata as base64-JSON so Unicode (Hindi etc.) survives HTTP headers
            meta_b64 = base64.b64encode(
                json.dumps(meta, ensure_ascii=False).encode("utf-8")
            ).decode("ascii")

            return Response(
                content=audio_bytes_out,
                media_type=audio_mime,
                headers={
                    "X-Voice-Meta": meta_b64,
                    "Access-Control-Expose-Headers": "X-Voice-Meta",
                },
            )
        else:
            # ── One-way or TTS unavailable: plain JSON, no audio ──────────
            return JSONResponse(content=meta)

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Voice ask error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice pipeline failed: {str(e)}")


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="ISO-639-1 hint – omit for auto-detect"),
):
    """
    Speech-to-Text only.  Returns the transcript and auto-detected language.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Audio file is empty")

        service = get_voice_service()
        transcript, detected_lang = service.transcribe(audio_bytes, language=language or None)

        if not transcript:
            raise HTTPException(
                status_code=422,
                detail="Could not transcribe audio – please check audio quality",
            )

        return JSONResponse(
            content={
                "success": True,
                "transcript": transcript,
                "detectedLanguage": detected_lang,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/speak")
async def text_to_speech(body: SpeakRequest):
    """
    Text-to-Speech only.  Returns base64-encoded audio for the given text.
    """
    try:
        if not body.text or not body.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if len(body.text) > 5000:
            raise HTTPException(
                status_code=400, detail="Text too long (max 5000 characters)"
            )

        service = get_voice_service()
        audio_bytes = await service.synthesize(
            text=body.text.strip(),
            language=body.language or "en",
        )

        # Piper always outputs WAV
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={"Access-Control-Expose-Headers": "Content-Type"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Text-to-speech failed: {str(e)}")
