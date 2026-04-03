"""
Voice Service Module

Pipeline:
    User voice
        ↓
    Whisper  (local speech recognition – openai-whisper)
        ↓
    Gemini Flash  (AI reasoning – existing chatbot logic)
        ↓
    Piper TTS  (local neural speech – piper-tts, no internet after model download)
        ↓
    Audio response

Endpoints:
    POST /api/voice/ask        – full pipeline: audio → text + WAV audio
    POST /api/voice/transcribe – audio → transcript only
    POST /api/voice/speak      – text  → WAV audio only
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import tempfile
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Piper voice model registry
# Maps ISO-639-1 language code → Piper model name.
# Models are auto-downloaded once into data/voices/ then cached in RAM.
# ---------------------------------------------------------------------------
_VOICES_DIR = Path(__file__).parent.parent / "data" / "voices"

_LANG_TO_MODEL: dict[str, str] = {
    "en":  "en_US-lessac-medium",
    "hi":  "hi_IN-rohan-medium",
    "mr":  "en_US-lessac-medium",   # Marathi  – fallback English
    "te":  "en_US-lessac-medium",   # Telugu   – fallback English
    "ta":  "en_US-lessac-medium",   # Tamil    – fallback English
}
_DEFAULT_MODEL = "en_US-lessac-medium"

_HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
_MODEL_URLS: dict[str, Tuple[str, str]] = {
    "en_US-lessac-medium": (
        f"{_HF_BASE}/en/en_US/lessac/medium/en_US-lessac-medium.onnx",
        f"{_HF_BASE}/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json",
    ),
    "hi_IN-rohan-medium": (
        f"{_HF_BASE}/hi/hi_IN/rohan/medium/hi_IN-rohan-medium.onnx",
        f"{_HF_BASE}/hi/hi_IN/rohan/medium/hi_IN-rohan-medium.onnx.json",
    ),
}

# Thread pool for CPU-bound Piper synthesis (keeps FastAPI event loop free)
_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="piper")
# ---------------------------------------------------------------------------


class VoiceService:
    """
    Three-stage local voice pipeline:
      1. Whisper    – speech → text  (local, offline, multilingual)
      2. Gemini     – text  → text  (existing chatbot logic)
      3. Piper TTS  – text  → WAV   (local, offline, neural quality)
    """

    def __init__(self):
        self._whisper_model = None
        self._piper_cache: dict[str, object] = {}  # model_name → PiperVoice
        _VOICES_DIR.mkdir(parents=True, exist_ok=True)
        logger.info("VoiceService initialised (Whisper + Gemini Flash + Piper TTS)")

    # =========================================================================
    # 1.  SPEECH → TEXT   (Whisper – local)
    # =========================================================================

    @staticmethod
    def _get_ffmpeg_exe() -> str:
        """Return bundled FFmpeg (imageio-ffmpeg) or system 'ffmpeg'."""
        try:
            import imageio_ffmpeg  # type: ignore
            return imageio_ffmpeg.get_ffmpeg_exe()
        except ImportError:
            return "ffmpeg"

    @staticmethod
    def _decode_audio_pcm(audio_bytes: bytes, ffmpeg_exe: str) -> np.ndarray:
        """
        Decode any audio format → 16 kHz mono float32 PCM ndarray.
        Calls ffmpeg by its full path so Windows PATH issues never occur.
        """
        import subprocess

        with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            cmd = [
                ffmpeg_exe, "-nostdin", "-threads", "0",
                "-i", tmp_path,
                "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le", "-ar", "16000",
                "-",
            ]
            out = subprocess.run(cmd, capture_output=True, check=True).stdout
            return (
                np.frombuffer(out, dtype=np.int16)
                .flatten()
                .astype(np.float32)
                / 32768.0
            )
        finally:
            os.unlink(tmp_path)

    def _get_whisper_model(self):
        if self._whisper_model is None:
            try:
                import whisper
                self._whisper_model = whisper.load_model("base")
                logger.info("Whisper 'base' model loaded")
            except ImportError:
                raise RuntimeError("openai-whisper not installed: pip install openai-whisper")
        return self._whisper_model

    def warmup(self) -> None:
        """Pre-load Whisper at startup (eliminates cold-start on first request)."""
        model = self._get_whisper_model()
        silence = np.zeros(8000, dtype=np.float32)
        model.transcribe(silence, language="en", temperature=0, fp16=False)
        logger.info("Whisper warmed up")

    # Medical vocabulary hint — helps Whisper recognise common medicine/symptom words
    # regardless of language.  Keep it short; Whisper uses it as a prior.
    _MEDICAL_PROMPT = (
        "Medical assistant. Medicines: Paracetamol, Ibuprofen, Amoxicillin, "
        "Metformin, Aspirin, Cetirizine, Azithromycin, Omeprazole. "
        "Symptoms: fever, pain, cough, cold, headache, diabetes, blood pressure."
    )

    def transcribe(
        self, audio_bytes: bytes, language: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Whisper STT: audio bytes → (transcript, detected_language).
        Language auto-detected by default (works for Hindi, English, Hinglish).
        """
        model = self._get_whisper_model()
        audio_array = self._decode_audio_pcm(audio_bytes, self._get_ffmpeg_exe())

        opts: dict = dict(
            beam_size=5,
            best_of=5,
            temperature=0,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            logprob_threshold=-1.0,
            compression_ratio_threshold=2.4,
            initial_prompt=self._MEDICAL_PROMPT,
            fp16=False,
        )
        if language:
            opts["language"] = language

        result = model.transcribe(audio_array, **opts)
        text = result["text"].strip()
        detected = result.get("language", "en")
        logger.info(f"Whisper [{detected}]: {len(text)} chars")
        return text, detected

    # =========================================================================
    # 2.  TEXT → SPEECH   (Piper TTS – fully local, no internet after download)
    # =========================================================================

    def _download_piper_model(self, model_name: str) -> Path:
        """Download .onnx + .json model files if not already in data/voices/."""
        import urllib.error
        import urllib.request

        onnx_path = _VOICES_DIR / f"{model_name}.onnx"
        json_path  = _VOICES_DIR / f"{model_name}.onnx.json"

        if onnx_path.exists() and json_path.exists():
            return onnx_path

        urls = _MODEL_URLS.get(model_name)
        if not urls:
            logger.warning(f"No URL registered for '{model_name}', falling back to English")
            return self._download_piper_model(_DEFAULT_MODEL)

        onnx_url, json_url = urls
        logger.info(f"Downloading Piper model '{model_name}' (one-time) …")
        try:
            for url, dest in [(onnx_url, onnx_path), (json_url, json_path)]:
                logger.info(f"  GET {url}")
                urllib.request.urlretrieve(url, dest)
        except urllib.error.HTTPError as exc:
            # Clean up any partial files and fall back to English
            for p in (onnx_path, json_path):
                p.unlink(missing_ok=True)
            if model_name != _DEFAULT_MODEL:
                logger.warning(
                    f"Piper model '{model_name}' not available ({exc}), "
                    f"falling back to '{_DEFAULT_MODEL}'"
                )
                return self._download_piper_model(_DEFAULT_MODEL)
            raise

        logger.info(f"Piper '{model_name}' ready")
        return onnx_path

    def _get_piper_voice(self, model_name: str):
        """Load and cache a PiperVoice instance."""
        if model_name not in self._piper_cache:
            try:
                from piper.voice import PiperVoice  # type: ignore
            except ImportError:
                raise RuntimeError("piper-tts not installed: pip install piper-tts")
            onnx_path = self._download_piper_model(model_name)
            self._piper_cache[model_name] = PiperVoice.load(
                str(onnx_path), use_cuda=False
            )
            logger.info(f"Piper '{model_name}' loaded")
        return self._piper_cache[model_name]

    def _piper_synthesize_sync(self, text: str, language: str) -> bytes:
        """
        Synchronous Piper synthesis – runs on thread pool to free event loop.

        piper-tts 1.4.1 API:
            voice.synthesize(text) -> Iterable[AudioChunk]
            AudioChunk has: sample_rate, sample_width, sample_channels, audio_int16_bytes
        """
        model_name = _LANG_TO_MODEL.get(language, _DEFAULT_MODEL)
        voice = self._get_piper_voice(model_name)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav_out:
            header_set = False
            for chunk in voice.synthesize(text):
                if not header_set:
                    wav_out.setnchannels(chunk.sample_channels)
                    wav_out.setsampwidth(chunk.sample_width)
                    wav_out.setframerate(chunk.sample_rate)
                    header_set = True
                wav_out.writeframes(chunk.audio_int16_bytes)
        buf.seek(0)
        audio = buf.read()
        logger.info(f"Piper [{model_name}]: {len(audio):,} bytes for {len(text)} chars")
        return audio

    async def synthesize(self, text: str, language: str = "en") -> bytes:
        """
        Async Piper TTS: text → WAV bytes.
        Offloads CPU work to thread pool so the async event loop stays unblocked.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _EXECUTOR, self._piper_synthesize_sync, text, language
        )

    # =========================================================================
    # 3.  FULL PIPELINE  (Whisper → Gemini Flash → Piper TTS)
    # =========================================================================

    async def voice_ask(
        self,
        audio_bytes: bytes,
        medicine_name: Optional[str] = None,
        conversation_id: Optional[str] = None,
        language: Optional[str] = None,
        mode: str = "two-way",
    ) -> dict:
        """
        Full pipeline: User voice → Whisper → Gemini Flash → Piper TTS → Audio

        mode = "two-way"  → audio WAV returned  (full conversation)
        mode = "one-way"  → text only returned  (skips Piper, ~5 s faster)
        """
        # ── 1. Whisper STT ──────────────────────────────────────────────
        transcript, detected_lang = self.transcribe(audio_bytes, language=language)
        logger.info(f"STT [{detected_lang}]: {transcript!r}")

        if not transcript:
            raise ValueError("Could not transcribe audio – please speak more clearly")

        # ── 2. Gemini Flash reasoning ───────────────────────────────────
        from services.chatbot_service import ChatbotService
        chatbot = ChatbotService()

        if medicine_name:
            from services.medicine_service import MedicineService
            try:
                medicine_data = MedicineService().get_medicine_details(medicine_name)
            except Exception:
                medicine_data = None
            ai_result = await chatbot.ask_about_medicine(
                medicine_name, transcript,
                medicine_data=medicine_data, conversation_id=conversation_id,
            )
        else:
            ai_result = await chatbot.get_response(
                transcript, conversation_id=conversation_id,
            )

        response_text = ai_result.get("answer") or ai_result.get("response", "")
        conv_id = ai_result.get("conversation_id", conversation_id or "voice_session")

        # ── 3. Piper TTS (two-way only) ─────────────────────────────────
        raw_audio: Optional[bytes] = None
        audio_mime: Optional[str] = None

        if mode == "two-way":
            tts_lang = detected_lang if detected_lang not in ("?", None) else (language or "en")
            raw_audio = await self.synthesize(response_text, language=tts_lang)
            audio_mime = "audio/wav"   # Piper always outputs WAV

        return {
            "transcript":          transcript,
            "detected_language":   detected_lang,
            "response_text":       response_text,
            "raw_audio":           raw_audio,       # bytes | None
            "audio_mime":          audio_mime,
            "conversation_id":     conv_id,
            "suggestions":         ai_result.get("suggestions", []),
            "follow_up_questions": ai_result.get("follow_up_questions", []),
            "mode":                mode,
        }
