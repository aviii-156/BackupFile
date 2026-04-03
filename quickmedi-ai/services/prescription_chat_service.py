"""
Prescription Chat Service
Handles Gemini Flash vision extraction of prescriptions and follow-up Q&A
with prescription context, including drug-interaction checks.
"""

from typing import Dict, List, Optional, Tuple
import logging
import base64
import json
import re
import httpx
import uuid

from google import genai
from google.genai import types

from config.ai_config import get_ai_config
from models.medicine_matcher import MedicineMatcher
from models.interaction_checker import InteractionChecker

logger = logging.getLogger(__name__)


class PrescriptionChatService:
    """
    End-to-end prescription-in-chatbot pipeline:
      1. extract_from_image  – Gemini Flash vision → structured JSON
      2. validate_medicines  – fuzzy match against 30k medicine DB
      3. ask_with_context    – Gemini reasoning with medicines as system context
    """

    def __init__(self):
        self.config = get_ai_config()
        self.client = genai.Client(api_key=self.config.gemini_api_key)
        self._vision_model_name = getattr(self.config, "gemini_vision_model", "gemini-2.5-flash")
        self._text_model_name = getattr(self.config, "gemini_model", "gemini-2.0-flash")
        self.medicine_matcher = MedicineMatcher()
        self.interaction_checker = InteractionChecker()
        # In-memory conversation store keyed by session_id
        self._conversations: Dict[str, List[Dict]] = {}
        logger.info("PrescriptionChatService initialised")

    # ------------------------------------------------------------------
    # Step 1 – Extract structured data from prescription image
    # ------------------------------------------------------------------

    async def extract_from_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg",
    ) -> Dict:
        """
        Use Gemini Flash vision to extract medicines and metadata from a
        prescription image.

        Returns:
            {
              doctor_info:  {name, qualification, hospital},
              patient_info: {name, age, date},
              medicines: [
                {name, strength, dosage, frequency, duration, instructions}
              ],
              diagnosis:    str,
              instructions: str,
              raw_text:     str,   # full OCR-like text Gemini saw
            }
        """
        try:
            extraction_prompt = """You are a medical prescription reader.
Carefully read the prescription image and extract ALL information in the following strict JSON format.
Do NOT add any text outside the JSON block.

{
  "doctor_info": {
    "name": "",
    "qualification": "",
    "hospital": "",
    "contact": ""
  },
  "patient_info": {
    "name": "",
    "age": "",
    "date": ""
  },
  "diagnosis": "",
  "medicines": [
    {
      "name": "",
      "strength": "",
      "dosage": "",
      "frequency": "",
      "duration": "",
      "instructions": ""
    }
  ],
  "instructions": "",
  "raw_text": ""
}

Rules:
- For every medicine listed, populate ALL fields you can read.
- Put the full original text block in raw_text.
- Use empty string "" for fields you cannot read.
- Do NOT include markdown code fences – only pure JSON."""

            image_part = types.Part.from_bytes(data=image_data, mime_type=mime_type)
            response = self.client.models.generate_content(
                model=self._vision_model_name,
                contents=[extraction_prompt, image_part],
            )
            raw = response.text.strip()

            # Strip possible markdown code fence
            raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
            raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

            data = json.loads(raw)
            logger.info(
                "Prescription extraction success – %d medicines found",
                len(data.get("medicines", [])),
            )
            return data

        except json.JSONDecodeError as e:
            logger.warning("JSON parse failed, attempting partial extraction: %s", e)
            return self._fallback_extraction(response.text if "response" in dir() else "")
        except Exception as e:
            logger.error("Error extracting prescription: %s", e)
            raise

    def _fallback_extraction(self, raw_text: str) -> Dict:
        """Best-effort extraction when Gemini returns non-JSON text."""
        return {
            "doctor_info": {"name": "", "qualification": "", "hospital": "", "contact": ""},
            "patient_info": {"name": "", "age": "", "date": ""},
            "diagnosis": "",
            "medicines": [],
            "instructions": raw_text[:500] if raw_text else "",
            "raw_text": raw_text,
        }

    # ------------------------------------------------------------------
    # Step 2 – Validate extracted medicines against known DB
    # ------------------------------------------------------------------

    def validate_medicines(self, medicines: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """
        Fuzzy-match each extracted medicine against our 30k medicine DB.

        Returns:
            validated_medicines – same list enriched with {validated, db_match, uncertain}
            warnings            – list of warning strings for unrecognised names
        """
        warnings: List[str] = []
        validated: List[Dict] = []

        for med in medicines:
            name = med.get("name", "").strip()
            if not name:
                continue

            enriched = dict(med)
            match = self.medicine_matcher.find_matches(name)

            if match:
                enriched["validated"] = True
                enriched["uncertain"] = False
                enriched["db_match"] = {
                    "name": match.get("name", name),
                    "composition": match.get("composition", ""),
                    "manufacturer": match.get("manufacturer", ""),
                    "price": match.get("price"),
                    "type": match.get("type", ""),
                }
            else:
                enriched["validated"] = False
                enriched["uncertain"] = True
                enriched["db_match"] = None
                warnings.append(
                    f"'{name}' could not be verified in our database. "
                    "Please confirm the name with your pharmacist."
                )

            validated.append(enriched)

        return validated, warnings

    # ------------------------------------------------------------------
    # Step 3 – Drug interaction check (auto-run when ≥2 medicines)
    # ------------------------------------------------------------------

    def check_interactions(self, medicines: List[Dict]) -> Dict:
        """Check drug-drug interactions for all extracted medicines."""
        if len(medicines) < 2:
            return {"has_interactions": False, "interactions": []}
        try:
            return self.interaction_checker.check_drug_interactions(medicines)
        except Exception as e:
            logger.warning("Interaction check error (non-fatal): %s", e)
            return {"has_interactions": False, "interactions": [], "error": str(e)}

    # ------------------------------------------------------------------
    # Step 4 – Q&A with prescription context
    # ------------------------------------------------------------------

    async def ask_with_context(
        self,
        question: str,
        medicines: List[Dict],
        session_id: Optional[str] = None,
        language: str = "en",
    ) -> Dict:
        """
        Answer a user question about their prescription using Gemini Flash.

        Args:
            question:   User's question
            medicines:  Validated medicines list from extract_from_image
            session_id: Chat session ID for multi-turn history
            language:   'en' | 'hi'

        Returns:
            {
              answer:             str,
              suggestions:        List[str],
              follow_up_questions: List[str],
              safety_warnings:    List[str],
              interaction_alert:  bool,
              session_id:         str
            }
        """
        try:
            if not session_id:
                session_id = str(uuid.uuid4())

            if session_id not in self._conversations:
                self._conversations[session_id] = []

            history = self._conversations[session_id]

            # Build medicine context block
            med_lines = []
            for i, med in enumerate(medicines, 1):
                line = f"{i}. {med.get('name', 'Unknown')}"
                if med.get("strength"):
                    line += f" {med['strength']}"
                if med.get("dosage"):
                    line += f" | Dosage: {med['dosage']}"
                if med.get("frequency"):
                    line += f" | Frequency: {med['frequency']}"
                if med.get("duration"):
                    line += f" | Duration: {med['duration']}"
                if med.get("instructions"):
                    line += f" | Instructions: {med['instructions']}"
                if med.get("db_match") and med["db_match"].get("composition"):
                    line += f" | Composition: {med['db_match']['composition']}"
                med_lines.append(line)

            medicines_block = "\n".join(med_lines) if med_lines else "No medicines extracted."

            # Interaction check
            interaction_result = self.check_interactions(medicines)
            interaction_alert = interaction_result.get("has_interactions", False)
            interaction_text = ""
            if interaction_alert:
                pairs = interaction_result.get("interactions", [])
                if pairs:
                    interaction_text = (
                        "\n\n⚠️ DRUG INTERACTION ALERT:\n"
                        + "\n".join(
                            f"- {p.get('drug_a','?')} + {p.get('drug_b','?')}: "
                            f"{p.get('description', 'potential interaction')}"
                            for p in pairs[:5]
                        )
                    )

            lang_note = (
                "Please respond in Hindi (Devanagari script)."
                if language == "hi"
                else "Please respond in clear English."
            )

            # Build conversation history context (last 6 messages)
            history_text = ""
            if history:
                for msg in history[-6:]:
                    role_label = "Patient" if msg["role"] == "user" else "QuickMedi AI"
                    history_text += f"{role_label}: {msg['content']}\n"

            system_prompt = f"""You are QuickMedi AI, a trusted medical assistant helping a patient understand their prescription.

PRESCRIPTION MEDICINES:
{medicines_block}{interaction_text}

IMPORTANT RULES:
- Base your answer on the medicines listed above.
- Mention drug interactions proactively if they are present.
- Always advise the patient to follow their doctor's instructions.
- Do NOT diagnose new conditions.
- {lang_note}"""

            if history_text:
                full_prompt = (
                    f"{system_prompt}\n\nPrevious conversation:\n{history_text}\n"
                    f"Patient: {question}\nQuickMedi AI:"
                )
            else:
                full_prompt = (
                    f"{system_prompt}\n\nPatient: {question}\nQuickMedi AI:"
                )

            structured_prompt = (
                f"{full_prompt}\n\n"
                "After your answer, on separate labelled lines provide:\n"
                "SUGGESTIONS: (comma-separated 2-3 short actionable tips)\n"
                "FOLLOW_UP: (comma-separated 2-3 follow-up questions)\n"
                "SAFETY_WARNINGS: (comma-separated safety notes, or NONE)"
            )

            response = self.client.models.generate_content(
                model=self._text_model_name,
                contents=structured_prompt,
            )
            raw = response.text

            answer_text, suggestions, follow_ups, safety_warnings = (
                self._parse_structured_response(raw)
            )

            # Append interaction warning to safety_warnings if needed
            if interaction_alert and interaction_text:
                safety_warnings.insert(
                    0,
                    "Drug interaction detected — please consult your doctor before taking these medicines together.",
                )

            # Save to history
            history.append({"role": "user", "content": question})
            history.append({"role": "assistant", "content": answer_text})

            return {
                "answer": answer_text,
                "suggestions": suggestions,
                "follow_up_questions": follow_ups,
                "safety_warnings": safety_warnings,
                "interaction_alert": interaction_alert,
                "session_id": session_id,
            }

        except Exception as e:
            logger.error("Error in ask_with_context: %s", e)
            raise

    # ------------------------------------------------------------------
    # Helper – parse structured SUGGESTIONS / FOLLOW_UP / SAFETY_WARNINGS
    # ------------------------------------------------------------------

    def _parse_structured_response(
        self, raw: str
    ) -> Tuple[str, List[str], List[str], List[str]]:
        """Parse Gemini response into (answer, suggestions, follow_ups, safety_warnings)."""
        answer = raw
        suggestions: List[str] = []
        follow_ups: List[str] = []
        safety_warnings: List[str] = []

        if "SUGGESTIONS:" in raw:
            parts = raw.split("SUGGESTIONS:", 1)
            answer = parts[0].strip()
            rest = parts[1]

            if "FOLLOW_UP:" in rest:
                sugg_raw, rest2 = rest.split("FOLLOW_UP:", 1)
                suggestions = [s.strip() for s in sugg_raw.strip().split(",") if s.strip()]

                if "SAFETY_WARNINGS:" in rest2:
                    fu_raw, sw_raw = rest2.split("SAFETY_WARNINGS:", 1)
                    follow_ups = [q.strip() for q in fu_raw.strip().split(",") if q.strip()]
                    sw_val = sw_raw.strip()
                    if sw_val.upper() not in ("NONE", ""):
                        safety_warnings = [w.strip() for w in sw_val.split(",") if w.strip()]
                else:
                    follow_ups = [q.strip() for q in rest2.strip().split(",") if q.strip()]
            else:
                suggestions = [s.strip() for s in rest.strip().split(",") if s.strip()]

        return answer, suggestions, follow_ups, safety_warnings

    # ------------------------------------------------------------------
    # Utility – download image from URL
    # ------------------------------------------------------------------

    @staticmethod
    async def download_image(url: str) -> Tuple[bytes, str]:
        """
        Download image from a URL (e.g. Cloudinary).
        Returns (image_bytes, mime_type).
        """
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
            return resp.content, content_type
