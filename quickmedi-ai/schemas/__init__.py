"""Schemas package - Pydantic data models"""

# Prescription schemas
from .prescription_schema import (
    PrescriptionData,
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionAnalysis,
    PrescriptionValidation,
    PatientInfo,
    DoctorInfo,
    MedicineItem,
)

# Medicine schemas
from .medicine_schema import (
    MedicineQuery,
    MedicineInfo,
    MedicineResponse,
    MedicineAlternative,
    MedicineComparison,
)

# Response schemas
from .response_schema import (
    BaseResponse,
    ErrorResponse,
    AIResponse,
    OCRResponse,
    InteractionResponse,
    SafetyResponse,
    ChatResponse,
)

__all__ = [
    # Prescription
    "PrescriptionData",
    "PrescriptionCreate",
    "PrescriptionUpdate",
    "PrescriptionAnalysis",
    "PrescriptionValidation",
    "PatientInfo",
    "DoctorInfo",
    "MedicineItem",
    # Medicine
    "MedicineQuery",
    "MedicineInfo",
    "MedicineResponse",
    "MedicineAlternative",
    "MedicineComparison",
    # Responses
    "BaseResponse",
    "ErrorResponse",
    "AIResponse",
    "OCRResponse",
    "InteractionResponse",
    "SafetyResponse",
    "ChatResponse",
]
