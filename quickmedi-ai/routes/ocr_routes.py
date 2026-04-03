"""
OCR Routes Module
Handles prescription image OCR processing
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Optional
from pydantic import BaseModel
import logging
import base64

from services.ocr_service import OCRService
from services.image_service import ImageService
from schemas.response_schema import OCRResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ocr", tags=["OCR"])


def get_ocr_service():
    return OCRService()


def get_image_service():
    return ImageService()


class PrescriptionBase64Request(BaseModel):
    imageBase64: Optional[str] = None
    imageUrl: Optional[str] = None


@router.post("/prescription")
async def process_prescription_base64(
    request: PrescriptionBase64Request,
    ocr_service: OCRService = Depends(get_ocr_service)
):
    """
    Process prescription image from base64 data or URL (used by Node.js API).
    Returns flattened structured data: doctorName, patientName, prescriptionDate, medicines.
    """
    try:
        if request.imageBase64:
            image_data = base64.b64decode(request.imageBase64)
        elif request.imageUrl:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(request.imageUrl)
                resp.raise_for_status()
                image_data = resp.content
        else:
            raise HTTPException(status_code=400, detail="Either imageBase64 or imageUrl is required")

        # Use full parse (structured) instead of plain text extraction
        parsed = await ocr_service.parse_prescription(image_data)

        # Flatten to what Node.js prescription controller expects
        doctor_info = parsed.get("doctor_info") or {}
        patient_info = parsed.get("patient_info") or {}
        return {
            "success": True,
            "doctorName": doctor_info.get("name") or doctor_info.get("doctor_name", ""),
            "patientName": patient_info.get("name") or patient_info.get("patient_name", ""),
            "prescriptionDate": parsed.get("date", ""),
            "medicines": parsed.get("medicines", []),
            "diagnosis": parsed.get("diagnosis", ""),
            "instructions": parsed.get("instructions", ""),
            "message": "Prescription processed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=OCRResponse)
async def upload_prescription(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service),
    image_service: ImageService = Depends(get_image_service)
):
    """
    Upload and process prescription image
    """
    try:
        # Validate file
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image"
            )
        
        # Read image
        image_data = await file.read()
        
        # Process image
        processed_image = await image_service.preprocess_image(image_data)
        
        # Perform OCR
        ocr_result = await ocr_service.extract_text(processed_image)
        
        return OCRResponse(
            success=True,
            data=ocr_result,
            message="Prescription processed successfully"
        )
    except Exception as e:
        logger.error(f"Error processing prescription image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-medicines")
async def extract_medicines(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service)
):
    """
    Extract medicine names from prescription image
    """
    try:
        image_data = await file.read()
        medicines = await ocr_service.extract_medicines(image_data)
        
        return {
            "success": True,
            "medicines": medicines,
            "count": len(medicines)
        }
    except Exception as e:
        logger.error(f"Error extracting medicines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-prescription")
async def parse_prescription(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service)
):
    """
    Parse complete prescription details from image
    """
    try:
        image_data = await file.read()
        prescription_data = await ocr_service.parse_prescription(image_data)
        
        return {
            "success": True,
            "prescription": prescription_data
        }
    except Exception as e:
        logger.error(f"Error parsing prescription: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-image")
async def validate_prescription_image(
    file: UploadFile = File(...),
    image_service: ImageService = Depends(get_image_service)
):
    """
    Validate if uploaded image is a valid prescription
    """
    try:
        image_data = await file.read()
        is_valid = await image_service.validate_prescription_image(image_data)
        
        return {
            "success": True,
            "is_valid": is_valid,
            "message": "Valid prescription" if is_valid else "Invalid prescription"
        }
    except Exception as e:
        logger.error(f"Error validating image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
