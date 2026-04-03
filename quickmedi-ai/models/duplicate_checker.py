"""
Duplicate Checker Module
Identifies duplicate medicines and same active ingredients using optimized data lookup
"""

from typing import List, Dict, Optional, Union
import logging
from utils.data_loader import get_data_loader

logger = logging.getLogger(__name__)


class DuplicateChecker:
    """
    Checks for duplicate medicines in prescriptions
    """
    
    def __init__(self):
        self.data_loader = get_data_loader()
        logger.info("DuplicateChecker initialized")
    
    def check_duplicates(
        self, 
        medicines: Union[List[str], List[Dict]]
    ) -> Dict:
        try:
            if len(medicines) < 2:
                return {
                    "has_duplicates": False,
                    "duplicates": [], 
                    "message": "Need at least 2 medicines",
                    "medicines_checked": len(medicines)
                }
            
            # Convert to list of names if needed
            if isinstance(medicines[0], dict):
                medicine_names = [m.get('name', '') for m in medicines]
            else:
                medicine_names = medicines
            
            # Use optimized data loader
            result = self.data_loader.check_duplicates(medicine_names)
            
            logger.info(f"Checked {len(medicine_names)} medicines for duplicates")
            return result
            
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
            raise
