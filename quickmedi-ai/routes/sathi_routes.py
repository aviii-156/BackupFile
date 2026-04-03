"""
Sathi Routes Module
Women's health AI endpoints — symptom analysis & pregnancy tips.
"""

from fastapi import APIRouter, HTTPException
import logging
import time

from services.sathi_service import SathiService
from schemas.response_schema import SathiAnalyseRequest, SathiPregnancyTipRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sathi", tags=["Sathi"])


def get_sathi_service() -> SathiService:
    return SathiService()


# ─── POST /api/sathi/analyse ──────────────────────────────────────────────────

@router.post("/analyse")
async def analyse_sathi_symptoms(request: SathiAnalyseRequest):
    """
    Analyse daily symptom check-in and return personalised relief recommendations
    and health insights.

    Called by the Node backend after storing a SathiSymptomLog document.

    Request body: SathiAnalyseRequest
    Response:     SathiAnalyseResponse structure
    """
    try:
        start = time.monotonic()
        service = get_sathi_service()
        result = await service.analyse_symptoms(request.model_dump())
        latency_ms = round((time.monotonic() - start) * 1000)

        return {
            **result,
            "latency_ms": latency_ms,
        }
    except Exception as e:
        logger.error(f"Error in /sathi/analyse: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── POST /api/sathi/pregnancy-tip ───────────────────────────────────────────

@router.post("/pregnancy-tip")
async def get_pregnancy_tip(request: SathiPregnancyTipRequest):
    """
    Return a personalised weekly pregnancy guide for the given week/trimester.

    Called by the Node backend when a user first opens their Pregnancy Dashboard
    for a new week or explicitly refreshes.

    Request body: SathiPregnancyTipRequest
    Response:     SathiPregnancyTipResponse structure
    """
    try:
        start = time.monotonic()
        service = get_sathi_service()
        result = await service.get_pregnancy_tip(request.model_dump())
        latency_ms = round((time.monotonic() - start) * 1000)

        return {
            **result,
            "latency_ms": latency_ms,
        }
    except Exception as e:
        logger.error(f"Error in /sathi/pregnancy-tip: {e}")
        raise HTTPException(status_code=500, detail=str(e))
