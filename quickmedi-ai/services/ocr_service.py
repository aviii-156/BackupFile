"""
OCR Service Module
Handles optical character recognition for prescription images
"""

from typing import Dict, List, Optional
import logging
from PIL import Image
import io
import pytesseract

from services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class OCRService:
    """
    Service for extracting text from prescription images
    """
    
    def __init__(self):
        self.gemini_service = GeminiService()
        logger.info("OCRService initialized")
    
    async def extract_text(self, image_data: bytes) -> Dict:
        """
        Extract text from prescription image
        
        Args:
            image_data: Binary image data
            
        Returns:
            Extracted text and metadata
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Use Tesseract OCR
            text = pytesseract.image_to_string(image)
            
            # Also use Gemini Vision for better accuracy
            gemini_text = await self.gemini_service.extract_text_from_image(
                image_data
            )
            
            return {
                "tesseract_text": text,
                "gemini_text": gemini_text,
                "combined_text": self._combine_ocr_results(text, gemini_text),
                "confidence": "high" if gemini_text else "medium"
            }
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}")
            raise
    
    async def extract_medicines(self, image_data: bytes) -> List[Dict]:
        """
        Extract medicine names and details from prescription
        
        Args:
            image_data: Binary image data
            
        Returns:
            List of medicines with details
        """
        try:
            # Use Gemini Vision to extract structured data
            medicines = await self.gemini_service.extract_medicines_from_image(
                image_data
            )
            return medicines
        except Exception as e:
            logger.error(f"Error extracting medicines: {str(e)}")
            raise
    
    async def parse_prescription(self, image_data: bytes) -> Dict:
        """
        Parse complete prescription details
        
        Args:
            image_data: Binary image data
            
        Returns:
            Structured prescription data
        """
        try:
            prescription_data = await self.gemini_service.parse_prescription_image(
                image_data
            )
            
            return {
                "patient_info": prescription_data.get("patient_info", {}),
                "doctor_info": prescription_data.get("doctor_info", {}),
                "medicines": prescription_data.get("medicines", []),
                "diagnosis": prescription_data.get("diagnosis", ""),
                "instructions": prescription_data.get("instructions", ""),
                "date": prescription_data.get("date", "")
            }
        except Exception as e:
            logger.error(f"Error parsing prescription: {str(e)}")
            raise
    
    def _combine_ocr_results(
        self, 
        tesseract_text: str, 
        gemini_text: str
    ) -> str:
        """
        Combine results from multiple OCR sources
        """
        # Prefer Gemini result if available
        if gemini_text and len(gemini_text) > len(tesseract_text):
            return gemini_text
        return tesseract_text if tesseract_text else gemini_text
    
    async def validate_prescription_text(self, text: str) -> bool:
        """
        Validate if extracted text is a valid prescription
        """
        try:
            # Check for common prescription elements
            prescription_keywords = [
                'prescription', 'rx', 'medicine', 'tablet', 'capsule',
                'dosage', 'frequency', 'doctor', 'patient'
            ]
            
            text_lower = text.lower()
            keyword_count = sum(
                1 for keyword in prescription_keywords 
                if keyword in text_lower
            )
            
            # Valid if at least 2 keywords found
            return keyword_count >= 2
        except Exception as e:
            logger.error(f"Error validating prescription text: {str(e)}")
            return False
