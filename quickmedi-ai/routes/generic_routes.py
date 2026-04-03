"""
Generic Finder Routes
=====================
Endpoints for finding generic alternatives to branded medicines.

POST /api/generic/find
GET  /api/generic/find/{medicine_name}
POST /api/generic/find-bulk
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from services.generic_finder_service import GenericFinderService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generic", tags=["Generic Finder"])

# Singleton service (re-used across requests)
_service = GenericFinderService()


# ── Request / Response Models ─────────────────────────────────────────────────

class FindGenericRequest(BaseModel):
    medicine_name: str = Field(..., min_length=1, description="Name of the prescribed medicine")


class BulkFindRequest(BaseModel):
    medicines: List[str] = Field(..., min_items=1, max_items=20, description="List of medicine names")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def generic_finder_status():
    """Health-check for the generic finder module."""
    return {
        "status": "ok",
        "module": "Generic Finder",
        "description": "Find cheapest generic alternatives to branded medicines",
        "endpoints": {
            "POST /api/generic/find": "Find generic for one medicine",
            "GET  /api/generic/find/{medicine_name}": "Same, via GET",
            "POST /api/generic/find-bulk": "Find generics for multiple medicines",
        },
    }


@router.post("/find")
async def find_generic(request: FindGenericRequest):
    """
    Find the cheapest generic alternative for a prescribed medicine.

    **Steps executed internally:**
    1. Search brand catalog (medicines_db)
    2. If not found → ask Gemini (Tata 1mg knowledge fallback)
    3. Find cheapest generic (medicines collection)
    4. Find cheaper brand alternatives
    5. Calculate savings

    **Example body:**
    ```json
    { "medicine_name": "Augmentin 625" }
    ```
    """
    try:
        result = await _service.find(request.medicine_name)
        return {"success": True, "query": request.medicine_name, "result": result}
    except Exception as e:
        logger.error(f"Generic find error for '{request.medicine_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/find/{medicine_name}")
async def find_generic_get(
    medicine_name: str,
):
    """
    Find the cheapest generic alternative (GET version for quick testing).

    **Example:** `GET /api/generic/find/Dolo%20650`
    """
    try:
        result = await _service.find(medicine_name)
        return {"success": True, "query": medicine_name, "result": result}
    except Exception as e:
        logger.error(f"Generic find error for '{medicine_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/find-bulk")
async def find_generic_bulk(request: BulkFindRequest):
    """
    Find generic alternatives for multiple medicines at once (e.g. full prescription).

    Returns an array of results in the same order as the input list.

    **Example body:**
    ```json
    { "medicines": ["Augmentin 625", "Dolo 650", "Pantop 40"] }
    ```
    """
    results = []
    for medicine_name in request.medicines:
        try:
            res = await _service.find(medicine_name)
            results.append({"medicine": medicine_name, "success": True, "result": res})
        except Exception as e:
            logger.error(f"Bulk find error for '{medicine_name}': {e}", exc_info=True)
            results.append({"medicine": medicine_name, "success": False, "error": str(e)})

    total_savings = sum(
        r["result"]["price_comparison"]["total_savings"] or 0
        for r in results
        if r["success"] and r["result"]["price_comparison"]["total_savings"] is not None
    )

    return {
        "success": True,
        "count": len(results),
        "results": results,
        "total_prescription_savings": round(total_savings, 2),
    }
