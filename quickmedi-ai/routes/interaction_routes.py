"""
Interaction Routes Module (Updated with Optimized Data)
Drug interaction checking endpoints using 382k+ indexed interactions
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

from services.interaction_service import InteractionService
from models.interaction_checker import InteractionChecker

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interactions", tags=["Interactions"])


# Request models
class CheckInteractionsRequest(BaseModel):
    medicines: List[str]


class ComprehensiveCheckRequest(BaseModel):
    medicines: List[str]
    user_conditions: Optional[List[str]] = None
    user_allergies: Optional[List[str]] = None


# Initialize service once
interaction_service = InteractionService()


@router.get("/")
def test_interactions_route():
    """Test endpoint to verify interactions API is working"""
    return {
        "status": "ok",
        "message": "Interactions API is working",
        "database": "382,270 interactions loaded",
        "speed": "instant (optimized)"
    }


@router.post("/check-drugs")
def check_drug_interactions(request: CheckInteractionsRequest):
    """
    Check for drug-drug interactions (instant with 382k+ interactions)
    
    Example: POST /api/interactions/check-drugs
    Body: {"medicines": ["Warfarin", "Aspirin"]}
    """
    try:
        if len(request.medicines) < 2:
            raise HTTPException(
                status_code=400,
                detail="Need at least 2 medicines to check interactions"
            )
        
        interactions = interaction_service.check_drug_interactions(request.medicines)
        
        return {
            "success": True,
            "medicines": request.medicines,
            "interactions": interactions,
            "source": "optimized_data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking drug interactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-duplicates")
def check_duplicates(request: CheckInteractionsRequest):
    """
    Check for duplicate medicines/active ingredients
    
    Example: POST /api/interactions/check-duplicates
    Body: {"medicines": ["Dolo 650", "Crocin 500"]}
    """
    try:
        if len(request.medicines) < 2:
            raise HTTPException(
                status_code=400,
                detail="Need at least 2 medicines to check duplicates"
            )
        
        duplicates = interaction_service.check_duplicates(request.medicines)
        
        return {
            "success": True,
            "medicines": request.medicines,
            "duplicates": duplicates,
            "source": "optimized_data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking duplicates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comprehensive-check")
def comprehensive_check(request: ComprehensiveCheckRequest):
    """
    Comprehensive safety check: interactions + duplicates
    
    Example: POST /api/interactions/comprehensive-check
    Body: {
        "medicines": ["Metformin", "Glimepiride", "Aspirin"],
        "user_conditions": ["Diabetes", "Hypertension"],
        "user_allergies": ["Penicillin"]
    }
    """
    try:
        if len(request.medicines) < 1:
            raise HTTPException(
                status_code=400,
                detail="Need at least 1 medicine"
            )
        
        result = interaction_service.comprehensive_check(
            request.medicines,
            request.user_conditions,
            request.user_allergies
        )
        
        return {
            "success": True,
            "result": result,
            "source": "optimized_data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in comprehensive check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/severity/{medicine1}/{medicine2}")
def get_interaction_severity(medicine1: str, medicine2: str):
    """
    Get detailed severity analysis of interaction
    
    Example: GET /api/interactions/severity/Warfarin/Aspirin
    """
    try:
        checker = InteractionChecker()
        severity = checker.get_interaction_severity(medicine1, medicine2)
        
        return {
            "success": True,
            "severity_analysis": severity
        }
        
    except Exception as e:
        logger.error(f"Error getting interaction severity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prescription-safety")
def check_prescription_safety(request: CheckInteractionsRequest):
    """
    Complete prescription safety check
    Checks interactions, duplicates, and provides safety score
    
    Example: POST /api/interactions/prescription-safety
    Body: {"medicines": ["Medicine1", "Medicine2", "Medicine3"]}
    """
    try:
        if len(request.medicines) < 1:
            raise HTTPException(
                status_code=400,
                detail="Need at least 1 medicine"
            )
        
        result = interaction_service.comprehensive_check(request.medicines)
        
        # Add safety score
        safety_score = 100
        if result.get("severity") == "high":
            safety_score = 30
        elif result.get("severity") == "moderate":
            safety_score = 60
        elif result.get("severity") == "low":
            safety_score = 80
        
        if result.get("duplicates", {}).get("has_duplicates"):
            safety_score -= 15
        
        result["safety_score"] = max(0, safety_score)
        result["safety_rating"] = (
            "Safe" if safety_score >= 80
            else "Caution" if safety_score >= 60
            else "Warning" if safety_score >= 40
            else "Dangerous"
        )
        
        return {
            "success": True,
            "prescription": request.medicines,
            "safety_analysis": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking prescription safety: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
