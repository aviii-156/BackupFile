"""
Sathi Service Module
Women's health AI analysis — symptom relief recommendations & pregnancy tips.
"""

from typing import Dict, List, Optional
import logging
import json
import re

from services.gemini_service import GeminiService
from utils.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)


class SathiService:
    """
    AI service for Sathi (women's health) feature.
    Builds context-rich prompts and parses structured Gemini responses.
    """

    def __init__(self):
        self.gemini_service = GeminiService()
        self.prompt_builder = PromptBuilder()
        logger.info("SathiService initialized")

    # ─── helpers ─────────────────────────────────────────────────────────────

    def _parse_json(self, text: str) -> Dict:
        """Extract and parse JSON from Gemini response text."""
        # Strip markdown code fences if present
        clean = re.sub(r"```json\s*", "", text)
        clean = re.sub(r"```\s*", "", clean)
        clean = clean.strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            # Last-resort: find first { ... } block
            match = re.search(r"\{.*\}", clean, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            logger.error("SathiService: failed to parse Gemini JSON response")
            return {}

    def _safe_float(self, value, default: float = 0.7) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return default

    def _fallback_recommendations(self, symptoms: List[str]) -> List[Dict]:
        """Rule-based fallback when AI call fails."""
        RULE_MAP = {
            "cramps":       {"type": "therapy",    "title": "Apply a heating pad",             "description": "Place a warm heating pad on your lower abdomen for 15–20 minutes to ease cramp pain.", "icon": "flame",   "confidence": 0.85},
            "headache":     {"type": "lifestyle",  "title": "Rest in a dark, quiet room",      "description": "Dim lighting reduces headache severity. Stay hydrated and avoid screens for 30 minutes.", "icon": "moon",    "confidence": 0.80},
            "fatigue":      {"type": "diet",       "title": "Iron-rich foods today",            "description": "Spinach, lentils, dates, and jaggery help replenish iron levels drained during menstruation.", "icon": "utensils","confidence": 0.82},
            "bloating":     {"type": "lifestyle",  "title": "Avoid carbonated drinks",          "description": "Skip sodas and carbonated water. Peppermint or fennel tea helps reduce bloating naturally.", "icon": "leaf",    "confidence": 0.80},
            "mood_swings":  {"type": "lifestyle",  "title": "5-minute mindful breathing",      "description": "Deep belly breathing activates the parasympathetic system and reduces hormonal mood swings.", "icon": "heart",   "confidence": 0.78},
            "back_pain":    {"type": "therapy",    "title": "Gentle lower-back stretches",     "description": "Child's pose and cat-cow stretches relieve pelvic and lower-back tension.", "icon": "activity","confidence": 0.80},
            "nausea":       {"type": "diet",       "title": "Ginger tea or dry crackers",      "description": "Small frequent meals and ginger tea effectively reduce nausea without medication.", "icon": "leaf",    "confidence": 0.83},
            "sleep_issues": {"type": "lifestyle",  "title": "Limit screens 1 hour before bed", "description": "Blue-light reduction and a consistent sleep schedule improve menstrual-cycle-related insomnia.", "icon": "bed",     "confidence": 0.78},
            "acne":         {"type": "lifestyle",  "title": "Gentle non-comedogenic cleanser", "description": "Hormonal acne benefits from twice-daily gentle cleansing; avoid touching your face.", "icon": "shield",   "confidence": 0.75},
        }
        recs = []
        for s in symptoms:
            rule = RULE_MAP.get(s)
            if rule:
                recs.append(rule)
        if not recs:
            recs.append({
                "type": "lifestyle", "title": "Stay hydrated",
                "description": "Drink at least 8 glasses of water; hydration supports every phase of your cycle.",
                "icon": "droplets", "confidence": 0.90,
            })
        return recs[:5]

    # ─── main methods ─────────────────────────────────────────────────────────

    async def analyse_symptoms(self, request_data: Dict) -> Dict:
        """
        Analyse daily symptoms and return structured recommendations + insights.

        Args:
            request_data: Dict matching SathiAnalyseRequest fields.

        Returns:
            Dict matching SathiAnalyseResponse structure.
        """
        symptoms = request_data.get("symptoms", [])

        try:
            prompt = self.prompt_builder.build_sathi_analysis_prompt(request_data)
            raw_response = self.gemini_service.client.models.generate_content(
                model=self.gemini_service.model,
                contents=prompt,
            )
            text = self.gemini_service._get_text(raw_response)
            data = self._parse_json(text)

            # Normalise and validate recommendations
            recs = []
            for item in data.get("recommendations", []):
                recs.append({
                    "type":                 item.get("type", "lifestyle"),
                    "title":                item.get("title", ""),
                    "description":          item.get("description", ""),
                    "icon":                 item.get("icon", "heart"),
                    "confidence":           self._safe_float(item.get("confidence", 0.75)),
                    "is_medicine_suggestion": bool(item.get("is_medicine_suggestion", False)),
                })

            # Normalise insights
            insights = []
            for item in data.get("insights", []):
                insights.append({
                    "insight_type": item.get("insight_type", "wellness_tip"),
                    "title":        item.get("title", ""),
                    "body":         item.get("body", ""),
                    "severity":     item.get("severity", "info"),
                    "tags":         item.get("tags", []),
                })

            return {
                "success":            True,
                "recommendations":    recs if recs else self._fallback_recommendations(symptoms),
                "insights":           insights,
                "overall_confidence": self._safe_float(data.get("overall_confidence", 0.75)),
                "ai_model":           data.get("ai_model", "gemini"),
                "phase_summary":      data.get("phase_summary"),
            }

        except Exception as e:
            logger.error(f"SathiService.analyse_symptoms error: {e}")
            # Graceful fallback: return rule-based recommendations
            return {
                "success":            True,
                "recommendations":    self._fallback_recommendations(symptoms),
                "insights":           [],
                "overall_confidence": 0.60,
                "ai_model":           "rule_engine_fallback",
                "phase_summary":      None,
            }

    async def get_pregnancy_tip(self, request_data: Dict) -> Dict:
        """
        Generate a weekly AI pregnancy tip.

        Args:
            request_data: Dict matching SathiPregnancyTipRequest fields.

        Returns:
            Dict matching SathiPregnancyTipResponse structure.
        """
        weeks     = request_data.get("weeks_pregnant", 1)
        trimester = request_data.get("trimester", "First")

        try:
            prompt = self.prompt_builder.build_sathi_pregnancy_tip_prompt(request_data)
            raw_response = self.gemini_service.client.models.generate_content(
                model=self.gemini_service.model,
                contents=prompt,
            )
            text = self.gemini_service._get_text(raw_response)
            data = self._parse_json(text)

            return {
                "success":              True,
                "week":                 data.get("week", weeks),
                "trimester":            data.get("trimester", trimester),
                "tip_title":            data.get("tip_title", f"Week {weeks} Pregnancy Guide"),
                "tip_body":             data.get("tip_body", ""),
                "do_list":              data.get("do_list", []),
                "avoid_list":           data.get("avoid_list", []),
                "when_to_call_doctor":  data.get("when_to_call_doctor", []),
                "nutrition_focus":      data.get("nutrition_focus"),
                "exercise_note":        data.get("exercise_note"),
            }

        except Exception as e:
            logger.error(f"SathiService.get_pregnancy_tip error: {e}")
            return {
                "success":              False,
                "week":                 weeks,
                "trimester":            trimester,
                "tip_title":            f"Week {weeks} — General Tips",
                "tip_body":             "Stay hydrated, take your prenatal vitamins, and attend your scheduled doctor appointments.",
                "do_list":              ["Take prenatal vitamins", "Stay hydrated", "Get enough rest"],
                "avoid_list":           ["Raw/unpasteurised foods", "Alcohol", "High-mercury fish"],
                "when_to_call_doctor":  ["Severe abdominal pain", "Heavy bleeding", "Reduced fetal movement"],
                "nutrition_focus":      "Folate and Iron",
                "exercise_note":        "Light walking for 20–30 minutes is safe for most pregnancies.",
            }
