"""
Medicine Service Module
Handles medicine-related operations using optimized data + AI
"""

from typing import Dict, List, Optional
import logging

from services.gemini_service import GeminiService
from models.medicine_matcher import MedicineMatcher
from utils.data_loader import get_data_loader
from config.ai_config import get_ai_config

logger = logging.getLogger(__name__)
ai_config = get_ai_config()


def sanitize_for_json(obj):
    """Recursively sanitize data for JSON serialization"""
    import math
    
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj


class MedicineService:
    """
    Service for medicine information and operations
    Uses optimized data loader for instant results + AI for detailed analysis
    """
    
    def __init__(self):
        # Optimized data components (fast, local)
        self.data_loader = get_data_loader()
        self.matcher = MedicineMatcher()
        
        # AI services (slow, for detailed analysis)
        self.ai_service = GeminiService() if ai_config.gemini_api_key else None
        
        logger.info(f"MedicineService initialized")
    
    def search_medicines(
        self, 
        medicine_name: str,
        composition: Optional[str] = None,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Search for medicines (instant with optimized data)
        
        Args:
            medicine_name: Name of medicine to search
            composition: Optional composition filter
            max_results: Maximum results to return
            
        Returns:
            List of matching medicines
        """
        try:
            # Use optimized data loader for instant search
            medicine = self.matcher.find_matches(medicine_name)
            
            if not medicine:
                return []
            
            # Get alternatives as search results
            alternatives = self.matcher.find_alternatives(
                medicine_name,
                max_results=max_results
            )
            
            results = [medicine] + alternatives
            
            result_list = [{
                "id": med.get("id"),
                "name": med.get("name"),
                "price": round(med.get("price"), 2) if med.get("price") is not None else None,
                "manufacturer": med.get("manufacturer_name"),
                "composition": med.get("short_composition1"),
                "pack_size": med.get("pack_size_label")
            } for med in results[:max_results]]
            
            # Sanitize all values
            return sanitize_for_json(result_list)
            
        except Exception as e:
            logger.error(f"Error searching medicines: {str(e)}")
            raise
    
    def get_medicine_details(self, medicine_name: str) -> Dict:
        """
        Get detailed information about a medicine (optimized data + AI enhancement)
        
        Args:
            medicine_name: Name of the medicine
            
        Returns:
            Detailed medicine information
        """
        try:
            # Get from optimized data (instant)
            info = self.data_loader.get_medicine_info(medicine_name)
            
            if not info:
                return {"error": "Medicine not found"}
            
            result = {
                "name": info.get("name"),
                "price": round(info.get("price"), 2) if info.get("price") is not None else None,
                "manufacturer": info.get("manufacturer"),
                "composition": info.get("composition"),
                "composition2": info.get("composition2"),
                "type": info.get("type"),
                "pack_size": info.get("pack_size"),
                "alternatives": info.get("alternatives", [])
            }
            
            # Sanitize all values to ensure JSON compliance
            return sanitize_for_json(result)
            
        except Exception as e:
            logger.error(f"Error getting medicine details: {str(e)}")
            raise
    
    async def get_medicine_details_with_ai(self, medicine_name: str) -> Dict:
        """
        Get detailed information with AI-enhanced data
        
        Args:
            medicine_name: Name of the medicine
            
        Returns:
            Detailed medicine information with AI insights
        """
        try:
            # Get basic info from optimized data
            basic_info = self.get_medicine_details(medicine_name)
            
            # Enhance with AI if available
            if self.ai_service:
                ai_details = await self.ai_service.get_medicine_info(medicine_name)
                basic_info.update({
                    "uses": ai_details.get("uses", []),
                    "side_effects": ai_details.get("side_effects", []),
                    "precautions": ai_details.get("precautions", []),
                    "dosage": ai_details.get("dosage", ""),
                    "ai_enhanced": True
                })
            else:
                basic_info["ai_enhanced"] = False
            
            return basic_info
            
        except Exception as e:
            logger.error(f"Error getting AI-enhanced medicine details: {str(e)}")
            raise
    
    def find_alternatives(
        self,
        medicine_name: str,
        max_results: int = 5
    ) -> Dict:
        """
        Find cheaper alternatives (instant with optimized data)
        
        Args:
            medicine_name: Original medicine name
            max_results: Maximum alternatives to return
            
        Returns:
            Original medicine and alternatives with savings
        """
        try:
            # Get original medicine
            original = self.matcher.find_matches(medicine_name)
            if not original:
                return {"error": "Medicine not found"}
            
            # Find alternatives
            alternatives = self.matcher.find_alternatives(
                medicine_name,
                max_results=max_results
            )
            
            # Calculate savings
            original_price = original.get("price", 0)
            
            results = []
            for alt in alternatives:
                alt_price = alt.get("price", 0)
                savings = round(original_price - alt_price, 2) if original_price and alt_price else 0
                savings_percent = round((savings / original_price * 100), 2) if original_price > 0 else 0
                
                results.append({
                    "name": alt.get("name"),
                    "price": round(alt_price, 2) if alt_price else 0,
                    "manufacturer": alt.get("manufacturer_name"),
                    "savings_amount": savings,
                    "savings_percent": savings_percent,
                    "recommended": savings > 0
                })
            
            result_dict = {
                "original": {
                    "name": original.get("name"),
                    "price": round(original_price, 2) if original_price else 0,
                    "manufacturer": original.get("manufacturer_name")
                },
                "alternatives": results,
                "total_alternatives": len(results)
            }
            
            # Sanitize all values
            return sanitize_for_json(result_dict)
            
        except Exception as e:
            logger.error(f"Error finding alternatives: {str(e)}")
            raise
    

