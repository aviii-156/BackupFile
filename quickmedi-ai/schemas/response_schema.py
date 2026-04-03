"""
Response Schema Module
Pydantic schemas for API responses
"""

from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict
from datetime import datetime


class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class ErrorResponse(BaseResponse):
    """Error response schema"""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class AIResponse(BaseResponse):
    """AI service response schema"""
    data: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = Field(None, ge=0, le=1)
    sources: Optional[List[str]] = None


class OCRResponse(BaseResponse):
    """OCR service response schema"""
    data: Optional[Dict[str, Any]] = None
    text_extracted: Optional[str] = None
    confidence: Optional[float] = None
    language: Optional[str] = "en"


class InteractionResponse(BaseResponse):
    """Interaction check response schema"""
    has_interactions: bool
    interactions: List[Dict[str, Any]] = []
    severity: Optional[str] = None
    recommendations: List[str] = []


class SafetyResponse(BaseResponse):
    """Safety check response schema"""
    is_safe: bool
    safety_score: float = Field(..., ge=0, le=100)
    warnings: List[str] = []
    contraindications: List[str] = []
    recommendations: List[str] = []


class ChatResponse(BaseResponse):
    """Chatbot response schema"""
    response: str
    conversation_id: str
    suggestions: List[str] = []
    follow_up_questions: Optional[List[str]] = None


class AnalysisResponse(BaseResponse):
    """Analysis response schema"""
    analysis: Dict[str, Any]
    insights: List[str] = []
    recommendations: List[str] = []
    risk_level: Optional[str] = None


class ValidationResponse(BaseResponse):
    """Validation response schema"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []


class SearchResponse(BaseResponse):
    """Search response schema"""
    results: List[Dict[str, Any]]
    total_count: int
    page: int = 1
    per_page: int = 10


class AlternativeResponse(BaseResponse):
    """Alternative medicines response schema"""
    original_medicine: str
    alternatives: List[Dict[str, Any]]
    best_alternative: Optional[Dict[str, Any]] = None
    max_savings: Optional[float] = None


class PrescriptionResponse(BaseResponse):
    """Prescription processing response schema"""
    prescription_id: str
    medicines: List[Dict[str, Any]]
    patient_info: Optional[Dict[str, Any]] = None
    doctor_info: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None


class HealthResponse(BaseResponse):
    """Health check response schema"""
    status: str = "healthy"
    service: str = "QuickMedi AI"
    version: Optional[str] = None
    uptime: Optional[float] = None


class BatchResponse(BaseResponse):
    """Batch operation response schema"""
    total: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]
    errors: Optional[List[Dict[str, Any]]] = None


class SavingsResponse(BaseResponse):
    """Savings calculation response schema"""
    original_cost: float
    alternative_cost: float
    total_savings: float
    savings_percent: float
    breakdown: Optional[List[Dict[str, Any]]] = None


# ========== Request Schemas ==========

class ChatRequest(BaseModel):
    """Chatbot question request schema"""
    question: str
    conversation_id: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None


class MedicineInfoRequest(BaseModel):
    """Medicine information request schema"""
    medicine_name: str


class SymptomCheckRequest(BaseModel):
    """Symptom check request schema"""
    symptoms: List[str]


class PrescriptionExplainRequest(BaseModel):
    """Prescription explanation request schema"""
    prescription_data: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════
# Sathi (Women's Health) Schemas
# ═══════════════════════════════════════════════════════════════

class SathiAnalyseRequest(BaseModel):
    """Sathi symptom analysis request — sent from Node backend to Python AI."""
    # Current symptoms logged by the user
    symptoms: List[str] = []
    # Cycle context
    cycle_phase: Optional[str] = None       # menstrual | follicular | ovulation | luteal
    cycle_day: Optional[int] = None         # 1-based day within current cycle
    cycle_length: Optional[int] = None
    # Optional free-text notes
    notes: Optional[str] = None
    # Optional mood/energy (1–5 sliders)
    mood: Optional[int] = Field(None, ge=1, le=5)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    # Pregnancy context (only populated when pregnancyModeEnabled)
    is_pregnancy_mode: bool = False
    trimester: Optional[str] = None        # First | Second | Third
    weeks_pregnant: Optional[int] = Field(None, ge=0, le=42)
    # User health context for personalised advice
    known_conditions: Optional[List[str]] = []
    # Recurring symptom pattern from recent history (last 3 cycles)
    recent_symptoms_history: Optional[List[str]] = []
    user_name: Optional[str] = None        # for personalised response wording


class SathiReliefItem(BaseModel):
    """Single relief recommendation item."""
    type: str                               # medicine | therapy | lifestyle | diet | supplement
    title: str
    description: str
    icon: str                               # lucide icon key
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_medicine_suggestion: bool = False    # whether to link to /medicines page


class SathiInsightItem(BaseModel):
    """Single AI-generated health insight."""
    insight_type: str                       # symptom_pattern | cycle_analysis | wellness_tip | anomaly
    title: str
    body: str
    severity: str = "info"                  # info | warning | critical
    tags: List[str] = []


class SathiAnalyseResponse(BaseResponse):
    """Structured response from /api/sathi/analyse."""
    recommendations: List[SathiReliefItem] = []
    insights: List[SathiInsightItem] = []
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0)
    ai_model: str = "gemini"
    phase_summary: Optional[str] = None    # one-liner about what to expect this phase


class SathiPregnancyTipRequest(BaseModel):
    """Weekly pregnancy tip request."""
    weeks_pregnant: int = Field(..., ge=1, le=42)
    trimester: str                          # First | Second | Third
    known_conditions: Optional[List[str]] = []
    user_name: Optional[str] = None


class SathiPregnancyTipResponse(BaseResponse):
    """Structured weekly pregnancy tip."""
    week: int
    trimester: str
    tip_title: str
    tip_body: str
    do_list: List[str] = []
    avoid_list: List[str] = []
    when_to_call_doctor: List[str] = []
    nutrition_focus: Optional[str] = None
    exercise_note: Optional[str] = None
