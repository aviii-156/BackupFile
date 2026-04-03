"""
Medicine Routes Module (Updated with Optimized Data)
Medicine-related endpoints using optimized 239k+ medicines database
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
import logging

from services.medicine_service import MedicineService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/medicines", tags=["Medicines"])


# Request/Response models
class MedicineSearchRequest(BaseModel):
    medicine_name: str
    composition: Optional[str] = None
    max_results: int = 10


class AlternativesRequest(BaseModel):
    medicine_name: str
    max_results: int = 5


# Initialize service once
medicine_service = MedicineService()


@router.get("/")
def test_medicines_route():
    """Test endpoint to verify medicines API is working"""
    return {
        "status": "ok",
        "message": "Medicines API is working",
        "database": "239,428 medicines loaded",
        "speed": "instant (optimized)"
    }


@router.post("/search")
def search_medicines(request: MedicineSearchRequest):
    """
    Search for medicines using optimized data
    
    Example: POST /api/medicines/search
    Body: {"medicine_name": "Dolo 650", "max_results": 10}
    """
    try:
        results = medicine_service.search_medicines(
            request.medicine_name,
            request.composition,
            request.max_results
        )
        
        return {
            "success": True,
            "query": request.medicine_name,
            "results": results,
            "count": len(results),
            "source": "optimized_data"
        }
        
    except Exception as e:
        logger.error(f"Error searching medicines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/details/{medicine_name}")
def get_medicine_details(medicine_name: str):
    """
    Get detailed information about a medicine
    
    Example: GET /api/medicines/details/Dolo%20650%20Tablet
    """
    try:
        details = medicine_service.get_medicine_details(medicine_name)
        
        return {
            "success": True,
            "medicine": details,
            "source": "optimized_data"
        }
        
    except Exception as e:
        logger.error(f"Error getting medicine details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alternatives")
def find_alternatives_post(request: AlternativesRequest):
    """
    Find cheaper alternative medicines
    
    Example: POST /api/medicines/alternatives
    Body: {"medicine_name": "Augmentin 625", "max_results": 5}
    """
    try:
        result = medicine_service.find_alternatives(
            request.medicine_name,
            request.max_results
        )
        
        return {
            "success": True,
            "result": result,
            "source": "optimized_data"
        }
        
    except Exception as e:
        logger.error(f"Error finding alternatives: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info/{medicine_name}")
def get_full_info(medicine_name: str):
    """
    Get complete medicine information with alternatives and savings
    
    Example: GET /api/medicines/info/Metformin
    """
    try:
        from utils.data_loader import get_data_loader
        data_loader = get_data_loader()
        
        info = data_loader.get_medicine_info(medicine_name)
        
        if not info:
            raise HTTPException(status_code=404, detail="Medicine not found")
        
        return {
            "success": True,
            "medicine": info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting full info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generic-to-brand/{generic_name}")
def generic_to_brand(
    generic_name: str,
    max_results: int = Query(20, ge=1, le=50)
):
    """
    Find brand medicines containing a generic ingredient
    
    Example: GET /api/medicines/generic-to-brand/paracetamol?max_results=20
    """
    try:
        matcher = MedicineMatcher()
        brands = matcher.match_generic_to_brand(generic_name, max_results)
        
        return {
            "success": True,
            "generic": generic_name,
            "brands": brands,
            "count": len(brands),
            "note": f"Showing top {len(brands)} matches"
        }
        
    except Exception as e:
        logger.error(f"Error matching generic to brand: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculate-savings/{original_name}/{alternative_name}")
def calculate_savings(original_name: str, alternative_name: str):
    """
    Calculate savings between two medicines
    
    Example: GET /api/medicines/calculate-savings/Dolo%20650/Crocin%20500
    """
    try:
        matcher = MedicineMatcher()
        savings = matcher.calculate_savings(original_name, alternative_name)
        
        if not savings:
            raise HTTPException(
                status_code=404,
                detail="One or both medicines not found"
            )
        
        return {
            "success": True,
            "savings": savings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating savings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

