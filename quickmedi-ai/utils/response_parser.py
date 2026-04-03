"""
Response Parser Module
Parses and structures AI model responses
"""

from typing import Dict, List, Optional, Any
import logging
import json
import re

logger = logging.getLogger(__name__)


class ResponseParser:
    """
    Parser for AI responses
    """
    
    def __init__(self):
        logger.info("ResponseParser initialized")
    
    def parse_json_response(self, text: str) -> Dict:
        """
        Parse JSON from AI response
        
        Args:
            text: Response text
            
        Returns:
            Parsed JSON dict
        """
        try:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
            if json_match:
                text = json_match.group(1)
            
            # Try direct JSON parse
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            # Return text as-is in a dict
            return {"text": text, "parsed": False}
    
    def parse_analysis_response(self, text: str) -> Dict:
        """
        Parse prescription analysis response
        
        Args:
            text: AI response text
            
        Returns:
            Structured analysis
        """
        try:
            # Try to parse as JSON first
            if '{' in text and '}' in text:
                data = self.parse_json_response(text)
                if data.get('parsed') != False:
                    return data
            
            # Fallback to text parsing
            return {
                "safety_analysis": self._extract_section(text, "safety"),
                "interactions": self._extract_section(text, "interaction"),
                "duplicates": self._extract_section(text, "duplicate"),
                "recommendations": self._extract_section(text, "recommendation"),
                "alternatives": self._extract_section(text, "alternative"),
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing analysis response: {str(e)}")
            return {"raw_text": text, "error": str(e)}
    
    def parse_validation_response(self, text: str) -> Dict:
        """
        Parse prescription validation response
        
        Args:
            text: AI response text
            
        Returns:
            Validation results
        """
        try:
            data = self.parse_json_response(text)
            if data.get('parsed') != False:
                return data
            
            # Extract validation issues
            return {
                "is_valid": self._determine_validity(text),
                "issues": self._extract_issues(text),
                "warnings": self._extract_warnings(text),
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing validation response: {str(e)}")
            return {"is_valid": True, "error": str(e)}
    
    def parse_medicines_response(self, text: str) -> List[Dict]:
        """
        Parse extracted medicines from response
        
        Args:
            text: AI response text
            
        Returns:
            List of medicine dictionaries
        """
        try:
            data = self.parse_json_response(text)
            
            if isinstance(data, dict) and 'medicines' in data:
                return data['medicines']
            elif isinstance(data, list):
                return data
            
            # Fallback to text parsing
            return self._extract_medicines_from_text(text)
        except Exception as e:
            logger.error(f"Error parsing medicines response: {str(e)}")
            return []
    
    def parse_prescription_response(self, text: str) -> Dict:
        """
        Parse complete prescription data
        
        Args:
            text: AI response text
            
        Returns:
            Structured prescription data
        """
        try:
            data = self.parse_json_response(text)
            if data.get('parsed') != False:
                # Normalise diagnosis to string if Gemini returned an object
                diag = data.get('diagnosis')
                if isinstance(diag, dict):
                    parts = []
                    if diag.get('impression_diagnosis'):
                        parts.append(diag['impression_diagnosis'])
                    if diag.get('chief_complaints'):
                        complaints = diag['chief_complaints']
                        parts.append(', '.join(complaints) if isinstance(complaints, list) else str(complaints))
                    data['diagnosis'] = ' | '.join(parts) if parts else ''
                return data
            
            # Fallback parsing
            return {
                "patient_info": {},
                "doctor_info": {},
                "medicines": self._extract_medicines_from_text(text),
                "diagnosis": "",
                "instructions": "",
                "date": "",
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing prescription response: {str(e)}")
            return {"error": str(e)}
    
    def parse_matches_response(self, text: str) -> List[Dict]:
        """
        Parse medicine matches response
        
        Args:
            text: AI response text
            
        Returns:
            List of matches
        """
        try:
            data = self.parse_json_response(text)
            
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'matches' in data:
                return data['matches']
            
            return []
        except Exception as e:
            logger.error(f"Error parsing matches response: {str(e)}")
            return []
    
    def parse_alternatives_response(self, text: str) -> List[Dict]:
        """
        Parse alternatives response
        
        Args:
            text: AI response text
            
        Returns:
            List of alternative medicines
        """
        try:
            data = self.parse_json_response(text)
            
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'alternatives' in data:
                return data['alternatives']
            
            return []
        except Exception as e:
            logger.error(f"Error parsing alternatives response: {str(e)}")
            return []
    
    def parse_safety_response(self, text: str) -> Dict:
        """
        Parse safety check response
        
        Args:
            text: AI response text
            
        Returns:
            Safety information
        """
        try:
            data = self.parse_json_response(text)
            if data.get('parsed') != False:
                return data
            
            return {
                "safety_level": self._extract_safety_level(text),
                "warnings": self._extract_warnings(text),
                "side_effects": self._extract_section(text, "side effect"),
                "precautions": self._extract_section(text, "precaution"),
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing safety response: {str(e)}")
            return {"error": str(e)}
    
    def parse_interactions_response(self, text: str) -> Dict:
        """
        Parse interactions response
        
        Args:
            text: AI response text
            
        Returns:
            Interaction information
        """
        try:
            data = self.parse_json_response(text)
            if data.get('parsed') != False:
                return data
            
            return {
                "has_interactions": "interaction" in text.lower(),
                "interactions": self._extract_interactions_from_text(text),
                "severity": self._extract_severity(text),
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing interactions response: {str(e)}")
            return {"error": str(e)}
    
    def parse_medicine_info_response(self, text: str) -> Dict:
        """
        Parse medicine information response
        
        Args:
            text: AI response text
            
        Returns:
            Medicine information
        """
        try:
            data = self.parse_json_response(text)
            if data.get('parsed') != False:
                return data
            
            return {
                "name": "",
                "composition": "",
                "uses": self._extract_section(text, "use"),
                "side_effects": self._extract_section(text, "side effect"),
                "precautions": self._extract_section(text, "precaution"),
                "dosage": self._extract_section(text, "dosage"),
                "raw_text": text
            }
        except Exception as e:
            logger.error(f"Error parsing medicine info response: {str(e)}")
            return {"error": str(e)}
    
    def _extract_section(self, text: str, keyword: str) -> str:
        """Extract section containing keyword"""
        lines = text.split('\n')
        relevant_lines = []
        capturing = False
        
        for line in lines:
            if keyword.lower() in line.lower():
                capturing = True
            elif capturing and line.strip() and not any(
                k in line.lower() for k in ['##', '**', 'note:', 'warning:']
            ):
                relevant_lines.append(line)
            elif capturing and not line.strip():
                break
        
        return ' '.join(relevant_lines).strip()
    
    def _extract_medicines_from_text(self, text: str) -> List[Dict]:
        """Extract medicines from plain text"""
        medicines = []
        # Basic pattern matching for medicine names
        # This is a simplified version - production would need more sophisticated parsing
        lines = text.split('\n')
        for line in lines:
            if any(indicator in line.lower() for indicator in ['tablet', 'capsule', 'mg', 'ml']):
                medicines.append({
                    "name": line.strip(),
                    "dosage": "",
                    "frequency": ""
                })
        return medicines
    
    def _extract_issues(self, text: str) -> List[str]:
        """Extract validation issues"""
        issues = []
        text_lower = text.lower()
        
        issue_keywords = ['error', 'issue', 'problem', 'duplicate', 'contraindication']
        lines = text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in issue_keywords):
                issues.append(line.strip())
        
        return issues
    
    def _extract_warnings(self, text: str) -> List[str]:
        """Extract warnings from text"""
        warnings = []
        lines = text.split('\n')
        
        for line in lines:
            if 'warning' in line.lower() or 'caution' in line.lower():
                warnings.append(line.strip())
        
        return warnings
    
    def _determine_validity(self, text: str) -> bool:
        """Determine if validation passed"""
        text_lower = text.lower()
        negative_indicators = ['error', 'invalid', 'problem', 'issue', 'contraindicated']
        return not any(indicator in text_lower for indicator in negative_indicators)
    
    def _extract_safety_level(self, text: str) -> str:
        """Extract safety level from text"""
        text_lower = text.lower()
        if 'safe' in text_lower and 'not' not in text_lower:
            return 'safe'
        elif 'caution' in text_lower or 'warning' in text_lower:
            return 'caution'
        elif 'dangerous' in text_lower or 'contraindicated' in text_lower:
            return 'dangerous'
        return 'unknown'
    
    def _extract_severity(self, text: str) -> str:
        """Extract severity level"""
        text_lower = text.lower()
        if 'severe' in text_lower or 'major' in text_lower:
            return 'severe'
        elif 'moderate' in text_lower:
            return 'moderate'
        elif 'minor' in text_lower or 'mild' in text_lower:
            return 'minor'
        return 'unknown'
    
    def _extract_interactions_from_text(self, text: str) -> List[Dict]:
        """Extract interaction details from text"""
        interactions = []
        lines = text.split('\n')
        
        for line in lines:
            if 'interact' in line.lower():
                interactions.append({
                    "description": line.strip(),
                    "severity": self._extract_severity(line)
                })
        
        return interactions
