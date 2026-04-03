"""
Gemini Service Module
Google Gemini AI integration for medical AI features
"""

from typing import Dict, List, Optional
import logging
from google import genai
from google.genai import types

from config.ai_config import get_ai_config
from utils.prompt_builder import PromptBuilder
from utils.response_parser import ResponseParser

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Service for Google Gemini AI interactions
    """
    
    def __init__(self):
        self.config = get_ai_config()
        self.client = genai.Client(api_key=self.config.gemini_api_key)
        self.model = self.config.gemini_model
        self.vision_model = self.config.gemini_vision_model
        self.prompt_builder = PromptBuilder()
        self.response_parser = ResponseParser()
        logger.info("GeminiService initialized")

    def _get_text(self, response) -> str:
        """Safely extract text from a Gemini response (handles multi-part responses)."""
        try:
            return response.text
        except Exception:
            parts = []
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        parts.append(part.text)
            return "".join(parts)

    async def analyze_prescription(self, prescription_data: Dict) -> Dict:
        """
        Analyze prescription using Gemini
        """
        try:
            prompt = self.prompt_builder.build_prescription_analysis_prompt(
                prescription_data
            )
            
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            parsed_response = self.response_parser.parse_analysis_response(
                self._get_text(response)
            )
            
            return parsed_response
        except Exception as e:
            logger.error(f"Error analyzing prescription: {str(e)}")
            raise
    
    async def validate_prescription(self, prescription_data: Dict) -> Dict:
        """
        Validate prescription for errors
        """
        try:
            prompt = self.prompt_builder.build_validation_prompt(
                prescription_data
            )
            
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            validation = self.response_parser.parse_validation_response(
                self._get_text(response)
            )
            
            return validation
        except Exception as e:
            logger.error(f"Error validating prescription: {str(e)}")
            raise
    
    async def extract_text_from_image(self, image_data: bytes) -> str:
        """
        Extract text from image using Gemini Vision
        """
        try:
            prompt = "Extract all text from this prescription image. Return only the text."

            response = self.client.models.generate_content(
                model=self.vision_model,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                ],
            )

            return self._get_text(response)
        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            raise
    
    async def extract_medicines_from_image(self, image_data: bytes) -> List[Dict]:
        """
        Extract medicine information from prescription image
        """
        try:
            prompt = self.prompt_builder.build_medicine_extraction_prompt()

            response = self.client.models.generate_content(
                model=self.vision_model,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                ],
            )

            medicines = self.response_parser.parse_medicines_response(
                self._get_text(response)
            )

            return medicines
        except Exception as e:
            logger.error(f"Error extracting medicines from image: {str(e)}")
            raise
    
    async def parse_prescription_image(self, image_data: bytes) -> Dict:
        """
        Parse complete prescription from image
        """
        try:
            prompt = self.prompt_builder.build_prescription_parsing_prompt()

            response = self.client.models.generate_content(
                model=self.vision_model,
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                ],
            )

            prescription = self.response_parser.parse_prescription_response(
                self._get_text(response)
            )

            return prescription
        except Exception as e:
            logger.error(f"Error parsing prescription image: {str(e)}")
            raise
    
    async def get_matches(self, prompt: str) -> List[Dict]:
        """Get medicine matches"""
        try:
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self.response_parser.parse_matches_response(self._get_text(response))
        except Exception as e:
            logger.error(f"Error getting matches: {str(e)}")
            raise
    
    async def get_alternatives(self, prompt: str) -> List[Dict]:
        """Get alternative medicines"""
        try:
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self.response_parser.parse_alternatives_response(self._get_text(response))
        except Exception as e:
            logger.error(f"Error getting alternatives: {str(e)}")
            raise
    
    async def check_safety(self, prompt: str) -> Dict:
        """Check medicine safety"""
        try:
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self.response_parser.parse_safety_response(self._get_text(response))
        except Exception as e:
            logger.error(f"Error checking safety: {str(e)}")
            raise
    
    async def check_interactions(self, prompt: str) -> Dict:
        """Check drug interactions"""
        try:
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self.response_parser.parse_interactions_response(self._get_text(response))
        except Exception as e:
            logger.error(f"Error checking interactions: {str(e)}")
            raise
    
    async def get_medicine_info(self, medicine_name: str) -> Dict:
        """Get medicine information"""
        try:
            prompt = f"Provide detailed information about the medicine: {medicine_name}"
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self.response_parser.parse_medicine_info_response(self._get_text(response))
        except Exception as e:
            logger.error(f"Error getting medicine info: {str(e)}")
            raise
    
    async def answer_health_question(
        self, 
        question: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Answer health-related question with context
        
        Args:
            question: User's question
            conversation_history: Previous conversation messages
            
        Returns:
            Answer with suggestions
        """
        try:
            # Build context from conversation history
            context = ""
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    context += f"{role}: {content}\n"
            
            # Build prompt
            system_context = (
                "You are QuickMedi AI, a helpful medical information assistant. "
                "Provide accurate information about medicines, health conditions, "
                "and general wellness. Always encourage consulting healthcare "
                "professionals for personalized advice. "
                "Keep responses concise and easy to understand."
            )
            
            if context:
                prompt = f"{system_context}\n\nConversation history:\n{context}\n\nUser: {question}\n\nAssistant:"
            else:
                prompt = f"{system_context}\n\nUser: {question}\n\nAssistant:"

            # Build structured prompt that asks for answer + suggestions + follow-ups
            structured_prompt = (
                f"{prompt}\n\n"
                "After answering, on separate clearly labelled lines provide:\n"
                "SUGGESTIONS: (comma-separated list of 2-3 short action suggestions the user can explore next)\n"
                "FOLLOW_UP: (comma-separated list of 2-3 short follow-up questions the user might want to ask)"
            )

            # Generate response
            response = self.client.models.generate_content(model=self.model, contents=structured_prompt)
            raw_text = self._get_text(response)

            # Parse out answer, suggestions, and follow-up questions
            answer_text = raw_text
            suggestions = []
            follow_up_questions = []

            if "SUGGESTIONS:" in raw_text:
                parts = raw_text.split("SUGGESTIONS:")
                answer_text = parts[0].strip()
                rest = parts[1]
                if "FOLLOW_UP:" in rest:
                    sugg_part, followup_part = rest.split("FOLLOW_UP:", 1)
                    suggestions = [s.strip() for s in sugg_part.strip().split(",") if s.strip()]
                    follow_up_questions = [q.strip() for q in followup_part.strip().split(",") if q.strip()]
                else:
                    suggestions = [s.strip() for s in rest.strip().split(",") if s.strip()]

            return {
                "answer": answer_text,
                "suggestions": suggestions,
                "follow_up_questions": follow_up_questions
            }
        except Exception as e:
            logger.error(f"Error answering health question: {str(e)}")
            raise
    
    async def ask_about_medicine(
        self,
        medicine_name: str,
        question: str,
        medicine_data: Optional[dict] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Answer a user question specifically about a given medicine.
        Uses real medicine data (price, composition, manufacturer) as context.

        Args:
            medicine_name: Name of the medicine
            question: User's question about the medicine
            medicine_data: Optional dict of medicine fields from the database
            conversation_history: Previous messages in this medicine chat session

        Returns:
            answer, suggestions, follow_up_questions
        """
        try:
            # Build rich context from real medicine data
            medicine_context = f"Medicine Name: {medicine_name}"
            if medicine_data:
                if medicine_data.get("composition"):
                    medicine_context += f"\nComposition: {medicine_data['composition']}"
                if medicine_data.get("manufacturer"):
                    medicine_context += f"\nManufacturer: {medicine_data['manufacturer']}"
                if medicine_data.get("price") is not None:
                    medicine_context += f"\nPrice: ₹{medicine_data['price']}"
                if medicine_data.get("pack_size"):
                    medicine_context += f"\nPack Size: {medicine_data['pack_size']}"
                if medicine_data.get("type"):
                    medicine_context += f"\nType: {medicine_data['type']}"

            # Build conversation context (last 4 messages)
            conv_context = ""
            if conversation_history:
                for msg in conversation_history[-4:]:
                    conv_context += f"{msg.get('role','user').capitalize()}: {msg.get('content','')}\n"

            system_prompt = (
                "You are QuickMedi AI, a knowledgeable medical assistant. "
                "A user is viewing a medicine and has a question about it. "
                "Use the medicine details provided to give an accurate, helpful, and patient-friendly answer. "
                "Always remind the user to consult their doctor for personalised advice."
            )

            if conv_context:
                prompt = (
                    f"{system_prompt}\n\n"
                    f"Medicine Details:\n{medicine_context}\n\n"
                    f"Previous conversation:\n{conv_context}\n"
                    f"User: {question}\nAssistant:"
                )
            else:
                prompt = (
                    f"{system_prompt}\n\n"
                    f"Medicine Details:\n{medicine_context}\n\n"
                    f"User: {question}\nAssistant:"
                )

            structured_prompt = (
                f"{prompt}\n\n"
                "After answering, on separate clearly labelled lines provide:\n"
                "SUGGESTIONS: (comma-separated list of 2-3 short follow-on actions)\n"
                "FOLLOW_UP: (comma-separated list of 2-3 related questions the user might ask)"
            )

            response = self.client.models.generate_content(model=self.model, contents=structured_prompt)
            raw_text = self._get_text(response)

            answer_text = raw_text
            suggestions = []
            follow_up_questions = []

            if "SUGGESTIONS:" in raw_text:
                parts = raw_text.split("SUGGESTIONS:")
                answer_text = parts[0].strip()
                rest = parts[1]
                if "FOLLOW_UP:" in rest:
                    sugg_part, followup_part = rest.split("FOLLOW_UP:", 1)
                    suggestions = [s.strip() for s in sugg_part.strip().split(",") if s.strip()]
                    follow_up_questions = [q.strip() for q in followup_part.strip().split(",") if q.strip()]
                else:
                    suggestions = [s.strip() for s in rest.strip().split(",") if s.strip()]

            return {
                "answer": answer_text,
                "suggestions": suggestions,
                "follow_up_questions": follow_up_questions
            }
        except Exception as e:
            logger.error(f"Error answering medicine question: {str(e)}")
            raise

    async def explain_medicine(self, medicine_name: str) -> str:
        """
        Explain medicine in simple terms
        
        Args:
            medicine_name: Name of the medicine
            
        Returns:
            Simple explanation
        """
        try:
            prompt = (
                f"Explain {medicine_name} in simple, easy-to-understand terms. "
                "Include what it's used for, how to take it, and important precautions."
            )
            
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self._get_text(response)
        except Exception as e:
            logger.error(f"Error explaining medicine: {str(e)}")
            raise
    
    async def get_medical_advice(self, query: str) -> str:
        """
        Get medical advice for general queries
        
        Args:
            query: Medical question or concern
            
        Returns:
            Medical advice
        """
        try:
            system_context = (
                "You are a medical AI assistant. Provide helpful information "
                "but always recommend consulting healthcare professionals for "
                "personalized medical advice."
            )
            
            prompt = f"{system_context}\n\nQuestion: {query}\n\nAnswer:"
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self._get_text(response)
        except Exception as e:
            logger.error(f"Error getting medical advice: {str(e)}")
            raise
    
    async def summarize_prescription(self, prescription_data: Dict) -> str:
        """
        Summarize prescription in simple terms
        
        Args:
            prescription_data: Prescription information
            
        Returns:
            Simple summary
        """
        try:
            medicines = prescription_data.get('medicines', [])
            medicines_text = ', '.join([str(m) for m in medicines]) if medicines else "Unknown medicines"
            
            prompt = (
                f"Explain this prescription in simple terms: {medicines_text}. "
                "Include what each medicine does, how to take them, and important precautions."
            )
            
            response = self.client.models.generate_content(model=self.model, contents=prompt)
            return self._get_text(response)
        except Exception as e:
            logger.error(f"Error summarizing prescription: {str(e)}")
            raise
