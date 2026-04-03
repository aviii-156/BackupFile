"""
Safety Checker Module
Validates medicine safety and checks for contraindications
"""

from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SafetyChecker:
    """
    Checks medicine safety using AI.
    """
    
    def __init__(self, ai_service):
        self.ai_service = ai_service
        logger.info("SafetyChecker initialized")
    
    async def check_safety(
        self, 
        medicine_name: str,
        user_conditions: Optional[List[str]] = None,
        user_allergies: Optional[List[str]] = None
    ) -> Dict:
        """
        Check safety of a medicine for a user via AI.
        """
        try:
            prompt = self._build_safety_prompt(
                medicine_name, 
                user_conditions, 
                user_allergies
            )
            safety_report = await self.ai_service.check_safety(prompt)
            return safety_report
        except Exception as e:
            logger.error(f"Error checking medicine safety: {str(e)}")
            raise
    
    def _build_safety_prompt(
        self, 
        medicine_name: str,
        conditions: Optional[List[str]],
        allergies: Optional[List[str]]
    ) -> str:
        """Build comprehensive safety check prompt"""
        prompt = f"Check safety for medicine: {medicine_name}"
        if conditions:
            prompt += f"\nUser conditions: {', '.join(conditions)}"
        if allergies:
            prompt += f"\nUser allergies: {', '.join(allergies)}"
        return prompt
