"""
Chatbot Routes Module
AI chatbot endpoints for medical queries
"""

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict, Any
import logging
import json
import base64

from services.chatbot_service import ChatbotService
from services.prescription_chat_service import PrescriptionChatService
from schemas.response_schema import (
    ChatResponse,
    ChatRequest,
    MedicineInfoRequest,
    SymptomCheckRequest,
    PrescriptionExplainRequest
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class MedicineAskRequest(BaseModel):
    medicine_name: str
    question: str
    medicine_data: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None


def get_chatbot_service():
    return ChatbotService()


@router.post("/medicine-ask")
async def ask_about_medicine(
    request: MedicineAskRequest,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Ask an AI question about a specific medicine.
    Accepts optional medicine_data (composition, price, etc.) for richer context.
    Maintains conversation history so follow-up questions work.
    """
    try:
        response = await service.ask_about_medicine(
            request.medicine_name,
            request.question,
            medicine_data=request.medicine_data,
            conversation_id=request.conversation_id
        )
        return {
            "success": True,
            "medicine": request.medicine_name,
            "response": response["answer"],
            "suggestions": response.get("suggestions", []),
            "follow_up_questions": response.get("follow_up_questions", []),
            "conversation_id": response["conversation_id"]
        }
    except Exception as e:
        logger.error(f"Error in medicine-ask: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    request: ChatRequest,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Ask a medical question to the AI chatbot
    """
    try:
        response = await service.get_response(
            request.question,
            conversation_id=request.conversation_id,
            user_context=request.user_context
        )
        
        return ChatResponse(
            success=True,
            response=response.get('answer'),
            conversation_id=response.get('conversation_id'),
            suggestions=response.get('suggestions', []),
            follow_up_questions=response.get('follow_up_questions') or None
        )
    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/medicine-info")
async def get_medicine_info(
    request: MedicineInfoRequest,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Get medicine information via chatbot
    """
    try:
        info = await service.get_medicine_info(request.medicine_name)
        return {
            "success": True,
            "medicine": request.medicine_name,
            "info": info
        }
    except Exception as e:
        logger.error(f"Error getting medicine info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/symptom-check")
async def check_symptoms(
    request: SymptomCheckRequest,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Check symptoms and get recommendations
    """
    try:
        recommendations = await service.check_symptoms(request.symptoms)
        return {
            "success": True,
            "symptoms": request.symptoms,
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Error checking symptoms: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain-prescription")
async def explain_prescription(
    request: PrescriptionExplainRequest,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Get explanation of prescription in simple terms
    """
    try:
        explanation = await service.explain_prescription(request.prescription_data)
        return {
            "success": True,
            "explanation": explanation
        }
    except Exception as e:
        logger.error(f"Error explaining prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/{conversation_id}")
async def get_conversation_history(
    conversation_id: str,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Get conversation history
    """
    try:
        history = await service.get_conversation_history(conversation_id)
        return {
            "success": True,
            "conversation_id": conversation_id,
            "history": history
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/{client_id}")
async def chatbot_websocket(
    websocket: WebSocket,
    client_id: str
):
    """
    WebSocket endpoint for real-time chatbot
    """
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for client: {client_id}")
    
    service = ChatbotService()
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message
            response = await service.get_response(
                message_data.get('question'),
                conversation_id=client_id,
                user_context=message_data.get('context')
            )
            
            # Send response
            await websocket.send_json({
                "success": True,
                "response": response.get('answer'),
                "suggestions": response.get('suggestions', [])
            })
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for client: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.send_json({
            "success": False,
            "error": str(e)
        })


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    service: ChatbotService = Depends(get_chatbot_service)
):
    """
    Delete conversation history
    """
    try:
        await service.delete_conversation(conversation_id)
        return {
            "success": True,
            "message": "Conversation deleted successfully"
        }
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────────
# Prescription-in-Chatbot endpoints
# ──────────────────────────────────────────────────────────────────────

class PrescriptionExtractRequest(BaseModel):
    imageUrl: Optional[str] = None          # Cloudinary / remote URL
    imageBase64: Optional[str] = None       # Raw base64 string (no data-URI prefix)
    mimeType: Optional[str] = "image/jpeg"  # e.g. image/png, application/pdf


class PrescriptionAskRequest(BaseModel):
    question: str
    medicines: List[Dict[str, Any]]         # Validated medicines list from extract
    session_id: Optional[str] = None        # For multi-turn history
    language: Optional[str] = "en"          # "en" | "hi"


_prescription_chat_instance: Optional[PrescriptionChatService] = None


def get_prescription_chat_service() -> PrescriptionChatService:
    global _prescription_chat_instance
    if _prescription_chat_instance is None:
        _prescription_chat_instance = PrescriptionChatService()
    return _prescription_chat_instance


@router.post("/prescription-extract")
async def prescription_extract(
    request: PrescriptionExtractRequest,
    svc: PrescriptionChatService = Depends(get_prescription_chat_service),
):
    """
    Step 1 – Extract prescription data from an image using Gemini Flash vision.

    Accepts either:
      - imageUrl  : publicly accessible URL (e.g. Cloudinary)
      - imageBase64: raw base64-encoded image bytes

    Returns structured prescription JSON plus validated medicines.
    """
    try:
        if not request.imageUrl and not request.imageBase64:
            raise HTTPException(
                status_code=400,
                detail="Provide either imageUrl or imageBase64",
            )

        # Obtain raw bytes
        if request.imageBase64:
            # Strip data-URI prefix if present (data:image/jpeg;base64,...)
            b64 = request.imageBase64
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            image_bytes = base64.b64decode(b64)
            mime_type = request.mimeType or "image/jpeg"
        else:
            image_bytes, mime_type = await svc.download_image(request.imageUrl)

        # Step 1: Gemini Flash vision extraction
        extracted = await svc.extract_from_image(image_bytes, mime_type)

        # Step 2: Validate medicines against known DB
        raw_medicines = extracted.get("medicines", [])
        validated_medicines, warnings = svc.validate_medicines(raw_medicines)

        # Step 3: Drug interaction check
        interaction_result = svc.check_interactions(validated_medicines)

        logger.info(
            "Prescription extracted: %d medicines, %d warnings, interactions=%s",
            len(validated_medicines),
            len(warnings),
            interaction_result.get("has_interactions"),
        )

        return {
            "success": True,
            "doctor_info": extracted.get("doctor_info", {}),
            "patient_info": extracted.get("patient_info", {}),
            "diagnosis": extracted.get("diagnosis", ""),
            "instructions": extracted.get("instructions", ""),
            "medicines": validated_medicines,
            "warnings": warnings,
            "interaction_check": interaction_result,
            "raw_text": extracted.get("raw_text", ""),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in prescription-extract: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prescription-ask")
async def prescription_ask(
    request: PrescriptionAskRequest,
    svc: PrescriptionChatService = Depends(get_prescription_chat_service),
):
    """
    Step 2 – Answer a follow-up question about an already-extracted prescription.

    Expected body:
      {
        "question": "What is Metformin for?",
        "medicines": [...],    // validated medicines from /prescription-extract
        "session_id": "...",   // optional – for multi-turn conversation
        "language": "en"       // "en" | "hi"
      }

    Returns Gemini answer plus suggestions, follow-ups, and safety warnings.
    """
    try:
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        if not request.medicines:
            raise HTTPException(
                status_code=400,
                detail="medicines list is required for prescription Q&A",
            )

        result = await svc.ask_with_context(
            question=request.question,
            medicines=request.medicines,
            session_id=request.session_id,
            language=request.language or "en",
        )

        return {
            "success": True,
            "answer": result["answer"],
            "suggestions": result.get("suggestions", []),
            "follow_up_questions": result.get("follow_up_questions", []),
            "safety_warnings": result.get("safety_warnings", []),
            "interaction_alert": result.get("interaction_alert", False),
            "session_id": result["session_id"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in prescription-ask: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
