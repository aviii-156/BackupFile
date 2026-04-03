"""
Medicine Matcher Module
Handles medicine matching and alternative suggestions using optimized data lookup
"""

from typing import List, Dict, Optional
import logging
from utils.data_loader import get_data_loader

logger = logging.getLogger(__name__)


class MedicineMatcher:
    """
    Matches medicines and finds alternatives based on composition and usage
    Uses optimized data indexing for fast lookups (30k+ medicines)
    """
    
    def __init__(self, ai_service=None):
        self.ai_service = ai_service
        self.data_loader = get_data_loader()
        logger.info("MedicineMatcher initialized with optimized data loader")
    
    def find_matches(
        self, 
        medicine_name: str, 
        composition: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Find matching medicine based on name (optimized with fuzzy matching)
        
        Args:
            medicine_name: Name of the medicine to match
            composition: Optional composition (not used in current implementation)
            
        Returns:
            Matching medicine info or None
        """
        try:
            # Use optimized data loader for instant lookup
            medicine = self.data_loader.find_medicine_by_name(
                medicine_name, 
                fuzzy=True, 
                threshold=0.75
            )
            
            if medicine:
                logger.info(f"Found match for: {medicine_name}")
                return medicine
            else:
                logger.warning(f"No match found for: {medicine_name}")
                return None
                
        except Exception as e:
            logger.error(f"Error finding medicine matches: {str(e)}")
            raise
    
    def find_alternatives(
        self, 
        medicine_name: str, 
        composition: Optional[str] = None,
        max_results: int = 5
    ) -> List[Dict]:
        """
        Find alternative medicines with same composition but different brands
        Optimized for 30k+ medicines with instant lookup
        
        Args:
            medicine_name: Original medicine name
            composition: Optional medicine composition (auto-detected if not provided)
            max_results: Maximum number of alternatives to return
            
        Returns:
            List of alternative medicines sorted by price
        """
        try:
            # First, find the original medicine
            medicine = self.data_loader.find_medicine_by_name(medicine_name)
            
            if not medicine:
                logger.warning(f"Medicine not found: {medicine_name}")
                return []
            
            # Get composition
            comp = composition or medicine.get('composition_normalized', '')
            
            if not comp:
                logger.warning(f"No composition found for: {medicine_name}")
                return []
            
            # Find alternatives using optimized index
            alternatives = self.data_loader.find_alternatives_by_composition(
                comp,
                exclude_name=medicine_name,
                max_results=max_results
            )
            
            logger.info(f"Found {len(alternatives)} alternatives for: {medicine_name}")
            return alternatives
            
        except Exception as e:
            logger.error(f"Error finding alternatives: {str(e)}")
            raise
    
    def match_generic_to_brand(
        self, 
        generic_name: str,
        max_results: int = 20
    ) -> List[Dict]:
        """
        Match generic medicine name to available brand names
        
        Args:
            generic_name: Generic medicine name (e.g., "paracetamol")
            max_results: Maximum number of results to return
            
        Returns:
            List of brand medicines containing the generic
        """
        import math
        try:
            generic_lower = generic_name.lower().strip()
            matching_brands = []
            
            # Search through composition index (limit search for performance)
            searched_count = 0
            for comp, medicines in self.data_loader.composition_index.items():
                if generic_lower in comp:
                    matching_brands.extend(medicines)
                    searched_count += 1
                    if searched_count > 100:  # Limit compositions searched
                        break
            
            # Remove duplicates and sort by price
            seen = set()
            unique_brands = []
            for med in matching_brands:
                med_name = med.get('name', '')
                if med_name not in seen:
                    seen.add(med_name)
                    
                    # Sanitize price - convert NaN/inf to None, round to 2 decimals
                    price = med.get('price')
                    if price is not None:
                        if math.isnan(price) or math.isinf(price):
                            price = None
                        else:
                            price = round(price, 2)
                    
                    unique_brands.append({
                        'name': med_name,
                        'manufacturer': med.get('manufacturer_name'),
                        'price': price,
                        'composition': med.get('short_composition1')
                    })
            
            # Sort by price (put None/missing prices at end)
            unique_brands = sorted(unique_brands, key=lambda x: x.get('price') if x.get('price') is not None else 999999)
            
            logger.info(f"Found {len(unique_brands)} brand matches for generic: {generic_name}")
            return unique_brands[:max_results]
            
        except Exception as e:
            logger.error(f"Error matching generic to brand: {str(e)}")
            raise
    
    def get_medicine_info(self, medicine_name: str) -> Optional[Dict]:
        """
        Get complete information about a medicine including alternatives
        
        Args:
            medicine_name: Name of the medicine
            
        Returns:
            Complete medicine information with alternatives
        """
        try:
            return self.data_loader.get_medicine_info(medicine_name)
        except Exception as e:
            logger.error(f"Error getting medicine info: {str(e)}")
            raise
    
    def calculate_savings(self, original_name: str, alternative_name: str) -> Optional[Dict]:
        """
        Calculate potential savings between two medicines
        
        Args:
            original_name: Original medicine name
            alternative_name: Alternative medicine name
            
        Returns:
            Savings information
        """
        try:
            original = self.data_loader.find_medicine_by_name(original_name)
            alternative = self.data_loader.find_medicine_by_name(alternative_name)
            
            if not original or not alternative:
                return None
            
            original_price = original.get('price', 0)
            alt_price = alternative.get('price', 0)
            savings = round(original_price - alt_price, 2)
            savings_percent = round((savings / original_price * 100), 2) if original_price > 0 else 0
            
            return {
                'original': original['name'],
                'alternative': alternative['name'],
                'original_price': round(original_price, 2),
                'alternative_price': round(alt_price, 2),
                'savings': savings,
                'savings_percent': savings_percent,
                'recommended': savings > 0
            }
            
        except Exception as e:
            logger.error(f"Error calculating savings: {str(e)}")
            raise
