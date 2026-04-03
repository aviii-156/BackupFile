"""
AI Routes Module
Main AI-related API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
import logging

from services.gemini_service import GeminiService
from models.medicine_matcher import MedicineMatcher
from models.safety_checker import SafetyChecker
from schemas.response_schema import AIResponse, ErrorResponse


class SafetyCheckRequest(BaseModel):
    medicines: List[str]
    user_conditions: Optional[List[str]] = None
    user_allergies: Optional[List[str]] = None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])


# Dependency injection
def get_gemini_service():
    return GeminiService()


@router.post("/analyze", response_model=AIResponse)
async def analyze_prescription(
    prescription_data: dict,
    service: GeminiService = Depends(get_gemini_service)
):
    """
    Analyze prescription using AI
    """
    try:
        result = await service.analyze_prescription(prescription_data)
        return AIResponse(
            success=True,
            data=result,
            message="Prescription analyzed successfully"
        )
    except Exception as e:
        logger.error(f"Error analyzing prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_prescription(
    prescription_data: dict,
    service: GeminiService = Depends(get_gemini_service)
):
    """
    Validate prescription for errors and safety issues
    """
    try:
        validation_result = await service.validate_prescription(prescription_data)
        return {
            "success": True,
            "validation": validation_result
        }
    except Exception as e:
        logger.error(f"Error validating prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-alternatives")
async def suggest_alternatives(
    medicine_name: str,
    composition: Optional[str] = None,
    service: GeminiService = Depends(get_gemini_service)
):
    """
    Suggest alternative medicines
    """
    try:
        matcher = MedicineMatcher(service)
        alternatives = await matcher.find_alternatives(
            medicine_name, 
            composition or ""
        )
        return {
            "success": True,
            "medicine": medicine_name,
            "alternatives": alternatives
        }
    except Exception as e:
        logger.error(f"Error suggesting alternatives: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/safety-check")
async def check_medicine_safety(
    request: SafetyCheckRequest,
    service: GeminiService = Depends(get_gemini_service)
):
    """
    Check medicine safety for a list of medicines (used by Node.js API)
    """
    try:
        checker = SafetyChecker(service)
        results = []
        for medicine_name in request.medicines:
            report = await checker.check_safety(
                medicine_name,
                request.user_conditions,
                request.user_allergies
            )
            results.append({"medicine": medicine_name, "report": report})
        return {
            "success": True,
            "medicines": request.medicines,
            "safetyChecks": results
        }
    except Exception as e:
        logger.error(f"Error checking safety: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



