"""
Validators Module
Input validation utilities
"""

from typing import Any, List, Dict, Optional
import logging
import re
from email_validator import validate_email, EmailNotValidError

logger = logging.getLogger(__name__)


class Validators:
    """
    Validation utilities
    """
    
    @staticmethod
    def validate_medicine_name(medicine_name: str) -> bool:
        """
        Validate medicine name format
        
        Args:
            medicine_name: Medicine name to validate
            
        Returns:
            True if valid
        """
        if not medicine_name or not isinstance(medicine_name, str):
            return False
        
        # Basic validation: 2-100 characters, letters, numbers, spaces, hyphens
        pattern = r'^[A-Za-z0-9\s\-()]{2,100}$'
        return bool(re.match(pattern, medicine_name))
    
    @staticmethod
    def validate_dosage(dosage: str) -> bool:
        """
        Validate dosage format
        
        Args:
            dosage: Dosage string
            
        Returns:
            True if valid
        """
        if not dosage or not isinstance(dosage, str):
            return False
        
        # Pattern for dosage like "500mg", "10ml", "1 tablet", etc.
        pattern = r'^\d+(\.\d+)?\s*(mg|ml|g|mcg|iu|tablet|capsule|drop|spray)s?$'
        return bool(re.match(pattern, dosage.lower()))
    
    @staticmethod
    def validate_frequency(frequency: str) -> bool:
        """
        Validate frequency format
        
        Args:
            frequency: Frequency string
            
        Returns:
            True if valid
        """
        if not frequency or not isinstance(frequency, str):
            return False
        
        # Common frequency patterns
        valid_patterns = [
            r'^\d+\s*times?\s*(?:a|per)\s*day$',
            r'^once\s*(?:a|per)\s*day$',
            r'^twice\s*(?:a|per)\s*day$',
            r'^every\s*\d+\s*hours?$',
            r'^as\s*needed$',
            r'^before\s*meals?$',
            r'^after\s*meals?$'
        ]
        
        return any(re.match(pattern, frequency.lower()) for pattern in valid_patterns)
    
    @staticmethod
    def validate_prescription_data(prescription: Dict) -> tuple[bool, List[str]]:
        """
        Validate prescription data structure
        
        Args:
            prescription: Prescription dictionary
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        if not isinstance(prescription, dict):
            return False, ["Prescription must be a dictionary"]
        
        # Check for medicines
        medicines = prescription.get('medicines', [])
        if not medicines:
            errors.append("Prescription must contain at least one medicine")
        
        if not isinstance(medicines, list):
            errors.append("Medicines must be a list")
            return False, errors
        
        # Validate each medicine
        for idx, medicine in enumerate(medicines):
            if not isinstance(medicine, dict):
                errors.append(f"Medicine at index {idx} must be a dictionary")
                continue
            
            name = medicine.get('name')
            if not name:
                errors.append(f"Medicine at index {idx} missing name")
            elif not Validators.validate_medicine_name(name):
                errors.append(f"Invalid medicine name at index {idx}: {name}")
            
            dosage = medicine.get('dosage')
            if dosage and not Validators.validate_dosage(dosage):
                errors.append(f"Invalid dosage format at index {idx}: {dosage}")
            
            frequency = medicine.get('frequency')
            if frequency and not Validators.validate_frequency(frequency):
                errors.append(f"Invalid frequency format at index {idx}: {frequency}")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_email_address(email: str) -> bool:
        """
        Validate email address
        
        Args:
            email: Email address
            
        Returns:
            True if valid
        """
        try:
            validate_email(email)
            return True
        except EmailNotValidError:
            return False
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """
        Validate phone number (basic)
        
        Args:
            phone: Phone number
            
        Returns:
            True if valid
        """
        if not phone or not isinstance(phone, str):
            return False
        
        # Basic pattern: 10-15 digits, optional + prefix
        pattern = r'^\+?\d{10,15}$'
        clean_phone = re.sub(r'[\s\-()]', '', phone)
        return bool(re.match(pattern, clean_phone))
    
    @staticmethod
    def validate_age(age: Any) -> bool:
        """
        Validate age value
        
        Args:
            age: Age value
            
        Returns:
            True if valid
        """
        try:
            age_int = int(age)
            return 0 < age_int < 150
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def sanitize_input(text: str, max_length: int = 1000) -> str:
        """
        Sanitize user input
        
        Args:
            text: Input text
            max_length: Maximum allowed length
            
        Returns:
            Sanitized text
        """
        if not isinstance(text, str):
            return ""
        
        # Remove potential harmful characters
        text = re.sub(r'[<>{}]', '', text)
        
        # Limit length
        text = text[:max_length]
        
        # Strip whitespace
        text = text.strip()
        
        return text
    
    @staticmethod
    def validate_file_extension(filename: str, allowed: List[str]) -> bool:
        """
        Validate file extension
        
        Args:
            filename: File name
            allowed: List of allowed extensions
            
        Returns:
            True if valid
        """
        if not filename or '.' not in filename:
            return False
        
        ext = filename.rsplit('.', 1)[1].lower()
        return ext in [a.lower().lstrip('.') for a in allowed]
    
    @staticmethod
    def validate_image_file(filename: str) -> bool:
        """
        Validate image file extension
        
        Args:
            filename: File name
            
        Returns:
            True if valid image file
        """
        allowed = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
        return Validators.validate_file_extension(filename, allowed)
    
    @staticmethod
    def validate_date_format(date_str: str, format: str = "%Y-%m-%d") -> bool:
        """
        Validate date format
        
        Args:
            date_str: Date string
            format: Expected date format
            
        Returns:
            True if valid
        """
        from datetime import datetime
        
        try:
            datetime.strptime(date_str, format)
            return True
        except ValueError:
            return False
