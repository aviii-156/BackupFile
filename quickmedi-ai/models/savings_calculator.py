"""
Savings Calculator Module
Calculates potential savings from medicine alternatives
"""

from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SavingsCalculator:
    """
    Calculates savings potential from generic alternatives and price comparisons
    """
    
    def __init__(self, ai_service=None):
        self.ai_service = ai_service
        logger.info("SavingsCalculator initialized")
    
    async def calculate_savings(
        self, 
        original_medicine: Dict,
        alternatives: List[Dict]
    ) -> Dict:
        """
        Calculate savings from switching to alternatives
        
        Args:
            original_medicine: Original medicine with price
            alternatives: List of alternative medicines with prices
            
        Returns:
            Savings report with best alternatives
        """
        try:
            original_price = round(float(original_medicine.get('price', 0)), 2)
            
            savings_data = []
            for alt in alternatives:
                alt_price = round(float(alt.get('price', 0)), 2)
                if alt_price < original_price:
                    savings = round(original_price - alt_price, 2)
                    savings_percent = round((savings / original_price) * 100, 2)
                    
                    savings_data.append({
                        'medicine': alt.get('name'),
                        'original_price': original_price,
                        'alternative_price': alt_price,
                        'savings_amount': savings,
                        'savings_percent': savings_percent,
                        'composition': alt.get('composition'),
                        'manufacturer': alt.get('manufacturer')
                    })
            
            # Sort by savings amount
            savings_data.sort(key=lambda x: x['savings_amount'], reverse=True)
            
            total_savings = sum(s['savings_amount'] for s in savings_data)
            
            return {
                'original_medicine': original_medicine.get('name'),
                'original_price': original_price,
                'alternatives_count': len(savings_data),
                'best_alternative': savings_data[0] if savings_data else None,
                'all_alternatives': savings_data,
                'max_savings': total_savings if savings_data else 0
            }
        except Exception as e:
            logger.error(f"Error calculating savings: {str(e)}")
            raise
    
    async def calculate_prescription_savings(
        self, 
        prescription: List[Dict],
        alternatives_map: Dict[str, List[Dict]]
    ) -> Dict:
        """
        Calculate total savings for entire prescription
        
        Args:
            prescription: List of medicines in prescription
            alternatives_map: Map of medicine names to their alternatives
            
        Returns:
            Complete prescription savings report
        """
        try:
            total_original_cost = 0
            total_alternative_cost = 0
            medicine_savings = []
            
            for medicine in prescription:
                medicine_name = medicine.get('name')
                original_price = float(medicine.get('price', 0))
                total_original_cost += original_price
                
                alternatives = alternatives_map.get(medicine_name, [])
                if alternatives:
                    # Get cheapest alternative
                    cheapest = min(
                        alternatives, 
                        key=lambda x: float(x.get('price', float('inf')))
                    )
                    alt_price = float(cheapest.get('price', original_price))
                    savings = original_price - alt_price
                    
                    medicine_savings.append({
                        'medicine': medicine_name,
                        'original_price': original_price,
                        'recommended_alternative': cheapest.get('name'),
                        'alternative_price': alt_price,
                        'savings': max(0, savings)
                    })
                    
                    total_alternative_cost += alt_price
                else:
                    total_alternative_cost += original_price
                    medicine_savings.append({
                        'medicine': medicine_name,
                        'original_price': original_price,
                        'recommended_alternative': None,
                        'alternative_price': original_price,
                        'savings': 0
                    })
            
            total_savings = total_original_cost - total_alternative_cost
            savings_percent = (
                (total_savings / total_original_cost * 100) 
                if total_original_cost > 0 else 0
            )
            
            return {
                'total_original_cost': round(total_original_cost, 2),
                'total_alternative_cost': round(total_alternative_cost, 2),
                'total_savings': round(total_savings, 2),
                'savings_percent': round(savings_percent, 2),
                'medicine_breakdown': medicine_savings
            }
        except Exception as e:
            logger.error(f"Error calculating prescription savings: {str(e)}")
            raise
    
    def calculate_monthly_savings(
        self, 
        daily_medicines: List[Dict],
        days: int = 30
    ) -> Dict:
        """
        Calculate monthly savings projection
        
        Args:
            daily_medicines: List of daily medicines with prices
            days: Number of days (default 30)
            
        Returns:
            Monthly savings projection
        """
        try:
            daily_cost = sum(float(m.get('price', 0)) for m in daily_medicines)
            monthly_cost = daily_cost * days
            
            # Assume 20% average savings with alternatives
            potential_savings = monthly_cost * 0.20
            
            return {
                'daily_cost': round(daily_cost, 2),
                'monthly_cost': round(monthly_cost, 2),
                'potential_monthly_savings': round(potential_savings, 2),
                'annual_projection': round(potential_savings * 12, 2)
            }
        except Exception as e:
            logger.error(f"Error calculating monthly savings: {str(e)}")
            raise
    
    def compare_brands(
        self, 
        medicines: List[Dict]
    ) -> Dict:
        """
        Compare prices across different brands
        
        Args:
            medicines: List of medicines with same composition
            
        Returns:
            Price comparison report
        """
        try:
            if not medicines:
                return {'error': 'No medicines to compare'}
            
            sorted_medicines = sorted(
                medicines, 
                key=lambda x: float(x.get('price', float('inf')))
            )
            
            cheapest = sorted_medicines[0]
            most_expensive = sorted_medicines[-1]
            
            max_savings = (
                float(most_expensive.get('price', 0)) - 
                float(cheapest.get('price', 0))
            )
            
            return {
                'cheapest_option': {
                    'name': cheapest.get('name'),
                    'price': float(cheapest.get('price', 0)),
                    'manufacturer': cheapest.get('manufacturer')
                },
                'most_expensive': {
                    'name': most_expensive.get('name'),
                    'price': float(most_expensive.get('price', 0)),
                    'manufacturer': most_expensive.get('manufacturer')
                },
                'max_savings': round(max_savings, 2),
                'all_options': [
                    {
                        'name': m.get('name'),
                        'price': float(m.get('price', 0)),
                        'manufacturer': m.get('manufacturer')
                    }
                    for m in sorted_medicines
                ]
            }
        except Exception as e:
            logger.error(f"Error comparing brands: {str(e)}")
            raise
