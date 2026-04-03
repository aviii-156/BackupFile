"""
Chatbot Service Module
Handles chatbot conversations and medical queries
"""

from typing import Dict, List, Optional
import logging
import uuid
from datetime import datetime

from services.gemini_service import GeminiService
from config.ai_config import get_ai_config

logger = logging.getLogger(__name__)


class ChatbotService:
    """
    Service for chatbot functionality
    """
    
    def __init__(self):
        self.config = get_ai_config()
        self.gemini_service = GeminiService()
        self.conversations = {}  # In-memory storage (use DB in production)
        logger.info("ChatbotService initialized")
    
    async def ask_about_medicine(
        self,
        medicine_name: str,
        question: str,
        medicine_data: dict = None,
        conversation_id: Optional[str] = None
    ) -> Dict:
        """
        Answer a question about a specific medicine, keeping a per-medicine conversation.

        Args:
            medicine_name: Name of the medicine being viewed
            question: User's question
            medicine_data: Real medicine data from the database (composition, price, etc.)
            conversation_id: Optional conversation ID for follow-up questions

        Returns:
            answer, suggestions, follow_up_questions, conversation_id
        """
        try:
            # Use a medicine-scoped conversation key so history stays relevant
            if not conversation_id:
                conversation_id = f"med_{medicine_name.lower().replace(' ', '_')}"

            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = {
                    "history": [],
                    "created_at": datetime.now().isoformat()
                }

            history = self.conversations[conversation_id]["history"]

            response_data = await self.gemini_service.ask_about_medicine(
                medicine_name,
                question,
                medicine_data=medicine_data,
                conversation_history=history
            )

            # Update history
            history.append({"role": "user", "content": question})
            history.append({"role": "assistant", "content": response_data["answer"]})

            return {
                "answer": response_data["answer"],
                "suggestions": response_data.get("suggestions", []),
                "follow_up_questions": response_data.get("follow_up_questions", []),
                "conversation_id": conversation_id
            }
        except Exception as e:
            logger.error(f"Error asking about medicine: {str(e)}")
            raise

    async def get_response(
        self,
        question: str,
        conversation_id: Optional[str] = None,
        user_context: Optional[Dict] = None
    ) -> Dict:
        """
        Get chatbot response to user question
        
        Args:
            question: User's question
            conversation_id: Optional conversation ID for context
            user_context: Optional user context (age, conditions, etc.)
            
        Returns:
            Response with answer and suggestions
        """
        try:
            # Get or create conversation
            if not conversation_id:
                conversation_id = str(uuid.uuid4())
            
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = {
                    "history": [],
                    "created_at": datetime.now().isoformat()
                }
            
            conversation = self.conversations[conversation_id]
            
            # Use Gemini AI
            response_data = await self.gemini_service.answer_health_question(
                question,
                conversation_history=conversation["history"]
            )
            
            # Update conversation history
            conversation["history"].append({
                "role": "user",
                "content": question
            })
            conversation["history"].append({
                "role": "assistant",
                "content": response_data["answer"]
            })
            
            return {
                "answer": response_data["answer"],
                "suggestions": response_data.get("suggestions", []),
                "follow_up_questions": response_data.get("follow_up_questions", []),
                "conversation_id": conversation_id
            }
        except Exception as e:
            logger.error(f"Error getting chatbot response: {str(e)}")
            raise
    
    async def get_medicine_info(self, medicine_name: str) -> str:
        """
        Get medicine information via chatbot
        
        Args:
            medicine_name: Name of the medicine
            
        Returns:
            Medicine information
        """
        try:
            # Use Gemini AI
            info = await self.gemini_service.explain_medicine(medicine_name)
            return info
        except Exception as e:
            logger.error(f"Error getting medicine info: {str(e)}")
            raise
    
    async def check_symptoms(self, symptoms: List[str]) -> Dict:
        """
        Check symptoms and provide recommendations
        
        Args:
            symptoms: List of symptoms
            
        Returns:
            Recommendations and advice
        """
        try:
            symptoms_text = ", ".join(symptoms)
            query = (
                f"I have the following symptoms: {symptoms_text}. "
                "What could these indicate and what should I do?"
            )
            
            # Use Gemini AI
            response = await self.gemini_service.get_medical_advice(query)
            
            return {
                "symptoms": symptoms,
                "analysis": response,
                "recommendation": "Please consult a healthcare professional for proper diagnosis."
            }
        except Exception as e:
            logger.error(f"Error checking symptoms: {str(e)}")
            raise
    
    async def explain_prescription(self, prescription_data: Dict) -> str:
        """
        Explain prescription in simple terms
        
        Args:
            prescription_data: Prescription information
            
        Returns:
            Simple explanation
        """
        try:
            # Use Gemini AI
            explanation = await self.gemini_service.summarize_prescription(
                prescription_data
            )
            return explanation
        except Exception as e:
            logger.error(f"Error explaining prescription: {str(e)}")
            raise
    
    async def get_conversation_history(self, conversation_id: str) -> List[Dict]:
        """
        Get conversation history
        
        Args:
            conversation_id: ID of the conversation
            
        Returns:
            Conversation history
        """
        try:
            if conversation_id not in self.conversations:
                return []
            
            return self.conversations[conversation_id]["history"]
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            raise
    
    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete conversation
        
        Args:
            conversation_id: ID of the conversation
            
        Returns:
            Success status
        """
        try:
            if conversation_id in self.conversations:
                del self.conversations[conversation_id]
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            raise
    

