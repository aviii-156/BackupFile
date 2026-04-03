"""
Prompt Builder Module
Builds structured prompts for AI models
"""

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class PromptBuilder:
    """
    Builder for AI prompts
    """
    
    def __init__(self):
        logger.info("PromptBuilder initialized")
    
    def build_prescription_analysis_prompt(self, prescription_data: Dict) -> str:
        """
        Build prompt for prescription analysis
        
        Args:
            prescription_data: Prescription information
            
        Returns:
            Formatted prompt
        """
        medicines = prescription_data.get('medicines', [])
        medicines_text = '\n'.join([
            f"- {m.get('name', 'Unknown')}: {m.get('dosage', 'N/A')} "
            f"{m.get('frequency', 'N/A')}"
            for m in medicines
        ])
        
        prompt = f"""
Analyze the following prescription:

Medicines:
{medicines_text}

Please provide:
1. Safety analysis
2. Potential interactions
3. Duplicate medicine warnings
4. General recommendations
5. Estimated cost and cheaper alternatives

Return the analysis in structured JSON format.
"""
        return prompt
    
    def build_validation_prompt(self, prescription_data: Dict) -> str:
        """
        Build prompt for prescription validation
        
        Args:
            prescription_data: Prescription information
            
        Returns:
            Validation prompt
        """
        medicines = prescription_data.get('medicines', [])
        medicines_text = ', '.join([m.get('name', 'Unknown') for m in medicines])
        
        prompt = f"""
Validate this prescription for errors and safety issues:

Medicines: {medicines_text}

Check for:
1. Duplicate medicines or active ingredients
2. Drug-drug interactions
3. Contraindications
4. Dosage concerns
5. Missing information

Return validation results with severity levels (critical, warning, info).
"""
        return prompt
    
    def build_medicine_extraction_prompt(self) -> str:
        """
        Build prompt for extracting medicines from prescription image
        
        Returns:
            Extraction prompt
        """
        prompt = """
Extract all medicine information from this prescription image.

For each medicine, provide:
- Medicine name
- Dosage (strength and quantity)
- Frequency (how often to take)
- Duration (if specified)
- Instructions (before/after food, etc.)

Return the data in JSON format as an array of medicine objects.
"""
        return prompt
    
    def build_prescription_parsing_prompt(self) -> str:
        """
        Build prompt for parsing complete prescription
        
        Returns:
            Parsing prompt
        """
        prompt = """You are a medical prescription OCR expert. Analyze this prescription image carefully.

Return ONLY valid JSON (no markdown, no code fences, no explanation) in EXACTLY this structure:
{
  "patient_info": {
    "name": "patient name or null",
    "age": "age or null",
    "gender": "gender or null"
  },
  "doctor_info": {
    "name": "doctor name or null",
    "specialization": "specialization or null",
    "registration": "registration number or null"
  },
  "medicines": [
    {
      "name": "exact medicine name as written",
      "dosage": "dosage string or null",
      "frequency": "frequency/timing or null",
      "duration": "duration or null",
      "instructions": "special instructions or null",
      "confidence": 0.9
    }
  ],
  "diagnosis": "diagnosis or chief complaint as a plain string or null",
  "date": "prescription date or null",
  "instructions": "general instructions or null"
}

Important:
- Extract ALL medicines listed, even if handwritten
- Keep medicine names exactly as written
- Set confidence < 0.6 if text is unclear
- diagnosis MUST be a plain string, not an object
"""
        return prompt
    
    def build_interaction_check_prompt(
        self, 
        medicines: List[str],
        detail_level: str = "detailed"
    ) -> str:
        """
        Build prompt for interaction checking
        
        Args:
            medicines: List of medicine names
            detail_level: Level of detail (basic, detailed, comprehensive)
            
        Returns:
            Interaction check prompt
        """
        medicines_text = ', '.join(medicines)
        
        detail_instructions = {
            "basic": "Provide basic interaction information.",
            "detailed": "Provide detailed interaction information with severity levels.",
            "comprehensive": "Provide comprehensive analysis including mechanism, severity, and recommendations."
        }
        
        prompt = f"""
Check for drug-drug interactions between: {medicines_text}

{detail_instructions.get(detail_level, detail_instructions['detailed'])}

For each interaction, include:
- Medicines involved
- Type of interaction
- Severity level (minor, moderate, major, contraindicated)
- Clinical effects
- Management recommendations

Return results in JSON format.
"""
        return prompt
    
    def build_alternative_search_prompt(
        self, 
        medicine_name: str,
        composition: str,
        criteria: Optional[Dict] = None
    ) -> str:
        """
        Build prompt for finding medicine alternatives
        
        Args:
            medicine_name: Original medicine name
            composition: Medicine composition
            criteria: Additional criteria (price, availability, etc.)
            
        Returns:
            Alternative search prompt
        """
        criteria_text = ""
        if criteria:
            criteria_text = f"\nPreferences: {', '.join([f'{k}: {v}' for k, v in criteria.items()])}"
        
        prompt = f"""
Find alternative medicines for: {medicine_name}
Composition: {composition}
{criteria_text}

Requirements:
- Same active ingredients
- Similar or equal efficacy
- Different brands/manufacturers
- Include price comparison if available

Provide at least 5 alternatives with:
- Medicine name
- Manufacturer
- Composition
- Approximate price
- Availability status

Return results in JSON format.
"""
        return prompt
    
    def build_safety_check_prompt(
        self, 
        medicine_name: str,
        user_profile: Optional[Dict] = None
    ) -> str:
        """
        Build prompt for safety checking
        
        Args:
            medicine_name: Medicine to check
            user_profile: User's medical profile
            
        Returns:
            Safety check prompt
        """
        profile_text = ""
        if user_profile:
            conditions = user_profile.get('conditions', [])
            allergies = user_profile.get('allergies', [])
            age = user_profile.get('age')
            
            if conditions:
                profile_text += f"\nMedical conditions: {', '.join(conditions)}"
            if allergies:
                profile_text += f"\nAllergies: {', '.join(allergies)}"
            if age:
                profile_text += f"\nAge: {age}"
        
        prompt = f"""
Perform safety check for medicine: {medicine_name}
{profile_text}

Analyze:
1. General safety profile
2. Common side effects
3. Serious side effects (rare)
4. Contraindications
5. Special precautions
6. Pregnancy and breastfeeding safety

If user profile is provided, check for specific risks based on conditions and allergies.

Return comprehensive safety information in JSON format.
"""
        return prompt
    
    def build_chatbot_system_prompt(self) -> str:
        """
        Build system prompt for chatbot
        
        Returns:
            System prompt
        """
        prompt = """
You are QuickMedi AI Assistant, a helpful and knowledgeable medical information chatbot.

Your responsibilities:
- Provide accurate information about medicines and health topics
- Help users understand their prescriptions
- Suggest medicine alternatives when appropriate
- Check for drug interactions
- Answer general health questions

Important guidelines:
- Always encourage consulting healthcare professionals for diagnosis and treatment
- Never provide specific medical diagnosis
- Be empathetic and supportive
- Use clear, simple language
- Emphasize medication safety
- Cite reliable sources when possible
- Admit when you don't know something
- Never recommend specific dosages without professional consultation

Maintain a helpful, professional, and caring tone.
"""
        return prompt

    # ─────────────────────────────────────────────────────────────────────────
    # Sathi (Women's Health) Prompts
    # ─────────────────────────────────────────────────────────────────────────

    def build_sathi_analysis_prompt(self, data: Dict) -> str:
        """
        Build a context-rich Sathi symptom-analysis prompt.

        Args:
            data: Dict with keys matching SathiAnalyseRequest fields.

        Returns:
            Structured prompt string for Gemini.
        """
        symptoms       = data.get("symptoms", [])
        cycle_phase    = data.get("cycle_phase") or "unknown"
        cycle_day      = data.get("cycle_day")
        is_pregnancy   = data.get("is_pregnancy_mode", False)
        trimester      = data.get("trimester")
        weeks          = data.get("weeks_pregnant")
        conditions     = data.get("known_conditions", []) or []
        notes          = data.get("notes", "")
        mood           = data.get("mood")
        energy         = data.get("energy_level")
        history        = data.get("recent_symptoms_history", []) or []
        user_name      = data.get("user_name", "the user")

        # ── Build context section ─────────────────────────────────────────
        ctx_parts = []
        if not is_pregnancy:
            ctx_parts.append(f"- Current cycle phase: {cycle_phase}")
            if cycle_day:
                ctx_parts.append(f"- Cycle day: {cycle_day}")
        else:
            ctx_parts.append(f"- Pregnancy mode: YES")
            if trimester:
                ctx_parts.append(f"- Trimester: {trimester}")
            if weeks is not None:
                ctx_parts.append(f"- Weeks pregnant: {weeks}")

        if conditions:
            ctx_parts.append(f"- Known conditions: {', '.join(conditions)}")
        if mood:
            ctx_parts.append(f"- Mood (1-5): {mood}")
        if energy:
            ctx_parts.append(f"- Energy level (1-5): {energy}")
        if notes:
            ctx_parts.append(f"- User notes: {notes}")
        if history:
            ctx_parts.append(f"- Recurring symptoms in last 3 cycles: {', '.join(history)}")

        ctx_text = "\n".join(ctx_parts) if ctx_parts else "No additional context."
        symptoms_text = ", ".join(symptoms) if symptoms else "No symptoms reported."

        pregnancy_addendum = ""
        if is_pregnancy:
            pregnancy_addendum = """
IMPORTANT — PREGNANCY SAFETY:
- All medicine suggestions MUST be pregnancy-safe. 
- Flag any suggestion that requires doctor approval with is_medicine_suggestion: true.
- If no safe OTC option exists, recommend consulting a doctor instead.
- Never suggest NSAIDs (ibuprofen, naproxen) or Category D/X medicines.
"""

        prompt = f"""
You are Sathi, a compassionate women's health AI assistant inside the QuickMedi app.
Analyse the following daily health check-in for {user_name} and return personalised, 
actionable relief recommendations and health insights.

=== TODAY'S CHECK-IN ===
Symptoms: {symptoms_text}

=== CONTEXT ===
{ctx_text}
{pregnancy_addendum}
=== YOUR TASK ===
Return ONLY valid JSON (no markdown fences, no explanation) in EXACTLY this structure:

{{
  "recommendations": [
    {{
      "type": "medicine|therapy|lifestyle|diet|supplement",
      "title": "Short action title (max 60 chars)",
      "description": "1–2 sentence explanation tailored to the phase/symptoms",
      "icon": "pill|flame|droplets|leaf|moon|bed|activity|utensils|heart|shield",
      "confidence": 0.0,
      "is_medicine_suggestion": false
    }}
  ],
  "insights": [
    {{
      "insight_type": "symptom_pattern|cycle_analysis|wellness_tip|anomaly",
      "title": "Insight title",
      "body": "2–3 sentence explanation",
      "severity": "info|warning|critical",
      "tags": ["tag1", "tag2"]
    }}
  ],
  "overall_confidence": 0.0,
  "ai_model": "gemini",
  "phase_summary": "One-line summary of what {user_name} can expect today."
}}

Rules:
- Provide 3–5 recommendations and 1–2 insights.
- Sort recommendations by impact (highest first).
- Confidence values must be floats between 0.0 and 1.0.
- Use only the icon names listed above.
- If symptoms list is empty, provide phase/week-appropriate wellness tips.
- Keep language warm, simple, and non-alarming (medical-grade but friendly).
- Do NOT recommend anything outside OTC / lifestyle / diet unless prefixed with "Consult your doctor:".
"""
        return prompt

    def build_sathi_pregnancy_tip_prompt(self, data: Dict) -> str:
        """
        Build a weekly pregnancy tip prompt.

        Args:
            data: Dict with weeks_pregnant, trimester, known_conditions, user_name

        Returns:
            Prompt string for Gemini.
        """
        weeks      = data.get("weeks_pregnant", 1)
        trimester  = data.get("trimester", "First")
        conditions = data.get("known_conditions", []) or []
        user_name  = data.get("user_name", "the user")

        conditions_text = (
            f"Known conditions: {', '.join(conditions)}" if conditions
            else "No special conditions reported."
        )

        prompt = f"""
You are Sathi, a compassionate pregnancy care AI inside QuickMedi.
Generate a personalised Week {weeks} ({trimester} Trimester) pregnancy guide for {user_name}.

{conditions_text}

Return ONLY valid JSON (no markdown fences) in EXACTLY this structure:

{{
  "week": {weeks},
  "trimester": "{trimester}",
  "tip_title": "Engaging title for week {weeks}",
  "tip_body": "3–4 sentence overview of what's happening with baby and mom this week.",
  "do_list": ["action 1", "action 2", "action 3"],
  "avoid_list": ["thing to avoid 1", "thing to avoid 2"],
  "when_to_call_doctor": ["symptom that needs immediate attention 1", "symptom 2"],
  "nutrition_focus": "Single key nutrient or food focus for this week.",
  "exercise_note": "Safe exercise recommendation for this week."
}}

Rules:
- do_list: 3–5 positive actions specific to week {weeks}.
- avoid_list: 2–4 items to avoid (foods, activities, medicines).
- when_to_call_doctor: 2–3 clear warning signs.
- Keep tone warm, encouraging, and medically accurate.
- If conditions list includes high-risk items, add relevant cautions.
"""
        return prompt
