"""
Interaction Service Module
Helper service for interaction-related operations using optimized data + AI
"""

from typing import Dict, List, Optional
import logging

from models.interaction_checker import InteractionChecker
from models.duplicate_checker import DuplicateChecker

logger = logging.getLogger(__name__)


class InteractionService:
    """
    Service for managing interaction checks
    Uses optimized data loader (190k+ interactions) for instant results
    """
    
    def __init__(self):
        self.interaction_checker = InteractionChecker()
        self.duplicate_checker = DuplicateChecker()
        logger.info("InteractionService initialized with optimized data")
    
    def check_drug_interactions(self, medicines: List[str]) -> Dict:
        """
        Check drug-drug interactions (instant with optimized data)
        
        Args:
            medicines: List of medicine names
            
        Returns:
            Interaction report
        """
        try:
            result = self.interaction_checker.check_drug_interactions(medicines)
            return result
        except Exception as e:
            logger.error(f"Error checking drug interactions: {str(e)}")
            raise
    
    def check_duplicates(self, medicines: List[str]) -> Dict:
        """
        Check for duplicate medicines (instant with optimized data)
        
        Args:
            medicines: List of medicine names
            
        Returns:
            Duplicate report
        """
        try:
            result = self.duplicate_checker.check_duplicates(medicines)
            return result
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
            raise
    
    def comprehensive_check(
        self, 
        medicines: List[str],
        user_conditions: Optional[List[str]] = None,
        user_allergies: Optional[List[str]] = None
    ) -> Dict:
        """
        Perform comprehensive safety check (optimized + AI insights)
        
        Args:
            medicines: List of medicine names
            user_conditions: User's medical conditions
            user_allergies: User's allergies
            
        Returns:
            Comprehensive safety report
        """
        try:
            results = {
                "medicines_checked": len(medicines),
                "safe": True,
                "warnings": [],
                "drug_interactions": {},
                "duplicates": {},
                "severity": "none"
            }
            
            # Check drug-drug interactions (instant)
            if len(medicines) >= 2:
                interactions = self.interaction_checker.check_drug_interactions(medicines)
                results["drug_interactions"] = interactions
                
                if interactions.get("has_interactions"):
                    results["safe"] = False
                    results["warnings"].append("Drug interactions detected")
                    
                    # Determine highest severity
                    for interaction in interactions.get("interactions", []):
                        severity = interaction.get("severity", "low")
                        if severity == "high":
                            results["severity"] = "high"
                        elif severity == "moderate" and results["severity"] != "high":
                            results["severity"] = "moderate"
                        elif results["severity"] == "none":
                            results["severity"] = "low"
            
            # Check duplicates (instant)
            if len(medicines) >= 2:
                duplicates = self.duplicate_checker.check_duplicates(medicines)
                results["duplicates"] = duplicates
                
                if duplicates.get("has_duplicates"):
                    results["safe"] = False
                    results["warnings"].append("Duplicate active ingredients detected")
            
            # Add user conditions/allergies warnings if provided
            if user_conditions:
                results["user_conditions"] = user_conditions
                results["warnings"].append("Check medicine compatibility with conditions")
            
            if user_allergies:
                results["user_allergies"] = user_allergies
                results["warnings"].append("Check for allergy risks")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in comprehensive check: {str(e)}")
            raise
