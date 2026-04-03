"""
Interaction Checker Module
Checks for drug-drug, drug-food, and drug-supplement interactions using optimized data lookup
Handles 190k+ interaction records with instant search
"""

from typing import List, Dict, Optional, Union
import logging
from utils.data_loader import get_data_loader

logger = logging.getLogger(__name__)


class InteractionChecker:
    """
    Checks for various types of medicine interactions
    """
    
    def __init__(self):
        self.data_loader = get_data_loader()
        logger.info("InteractionChecker initialized")
    
    def check_drug_interactions(
        self, 
        medicines: Union[List[str], List[Dict]]
    ) -> Dict:
        """
        Check for interactions between multiple medicines (instant check with indexing)
        
        Args:
            medicines: List of medicine names or dictionaries
            
        Returns:
            Interaction report with severity levels
        """
        try:
            if len(medicines) < 2:
                return {
                    "has_interactions": False,
                    "interactions": [], 
                    "message": "Need at least 2 medicines",
                    "medicines_checked": len(medicines)
                }
            
            # Convert to names
            if medicines and isinstance(medicines[0], dict):
                medicine_names = [m.get('name', '') for m in medicines]
            else:
                medicine_names = medicines
            
            # Use optimized data loader for instant interaction check
            result = self.data_loader.check_interactions(medicine_names)
            
            logger.info(f"Checked {len(medicine_names)} medicines for interactions")
            return result
            
        except Exception as e:
            logger.error(f"Error checking drug interactions: {str(e)}")
            raise
    
    def check_specific_interaction(
        self,
        medicine_a: str,
        medicine_b: str
    ) -> Optional[Dict]:
        """
        Check interaction between two specific medicines
        
        Args:
            medicine_a: First medicine name
            medicine_b: Second medicine name
            
        Returns:
            Interaction details if found, None otherwise
        """
        try:
            result = self.check_drug_interactions([medicine_a, medicine_b])
            
            if result.get('has_interactions') and result.get('interactions'):
                return result['interactions'][0]
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking specific interaction: {str(e)}")
            raise
    
    def get_interaction_severity(
        self, 
        medicine_a: str,
        medicine_b: str
    ) -> Dict:
        """
        Get detailed severity analysis of interaction between two medicines
        
        Args:
            medicine_a: First medicine
            medicine_b: Second medicine
            
        Returns:
            Detailed severity analysis
        """
        try:
            interaction = self.check_specific_interaction(medicine_a, medicine_b)
            
            if not interaction:
                return {
                    'has_interaction': False,
                    'severity': 'none',
                    'message': 'No known interaction found'
                }
            
            severity = interaction.get('severity', 'unknown')
            
            # Map severity to risk level
            risk_levels = {
                'high': {
                    'level': 'High Risk',
                    'action': 'Avoid combination or consult doctor immediately',
                    'color': 'red'
                },
                'moderate': {
                    'level': 'Moderate Risk',
                    'action': 'Monitor closely and consult doctor',
                    'color': 'orange'
                },
                'low': {
                    'level': 'Low Risk',
                    'action': 'Usually safe, but be aware',
                    'color': 'yellow'
                }
            }
            
            risk_info = risk_levels.get(severity, {
                'level': 'Unknown',
                'action': 'Consult healthcare provider',
                'color': 'gray'
            })
            
            return {
                'has_interaction': True,
                'medicine1': medicine_a,
                'medicine2': medicine_b,
                'severity': severity,
                'description': interaction.get('description'),
                'risk_level': risk_info['level'],
                'recommended_action': risk_info['action'],
                'color': risk_info['color']
            }
            
        except Exception as e:
            logger.error(f"Error getting interaction severity: {str(e)}")
            raise
