"""
Prescription Schema Module
Pydantic schemas for prescription data
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime


class PatientInfo(BaseModel):
    """Patient information schema"""
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    
    @validator('age')
    def validate_age(cls, v):
        if v is not None and (v < 0 or v > 150):
            raise ValueError('Age must be between 0 and 150')
        return v


class DoctorInfo(BaseModel):
    """Doctor information schema"""
    name: Optional[str] = None
    specialization: Optional[str] = None
    registration_number: Optional[str] = None
    contact: Optional[str] = None
    hospital: Optional[str] = None


class MedicineItem(BaseModel):
    """Individual medicine item schema"""
    name: str = Field(..., description="Medicine name")
    composition: Optional[str] = Field(None, description="Active ingredients")
    dosage: Optional[str] = Field(None, description="Dosage strength")
    frequency: Optional[str] = Field(None, description="How often to take")
    duration: Optional[str] = Field(None, description="Treatment duration")
    instructions: Optional[str] = Field(None, description="Special instructions")
    quantity: Optional[int] = Field(None, description="Number of units")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Medicine name cannot be empty')
        return v.strip()


class PrescriptionData(BaseModel):
    """Complete prescription data schema"""
    patient_info: Optional[PatientInfo] = None
    doctor_info: Optional[DoctorInfo] = None
    medicines: List[MedicineItem] = Field(..., min_items=1)
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    date: Optional[str] = None
    prescription_id: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "patient_info": {
                    "name": "John Doe",
                    "age": 35,
                    "gender": "Male"
                },
                "doctor_info": {
                    "name": "Dr. Jane Smith",
                    "specialization": "General Physician"
                },
                "medicines": [
                    {
                        "name": "Paracetamol",
                        "dosage": "500mg",
                        "frequency": "3 times a day",
                        "duration": "5 days"
                    }
                ],
                "diagnosis": "Fever",
                "date": "2026-03-01"
            }
        }


class PrescriptionCreate(BaseModel):
    """Schema for creating a new prescription"""
    medicines: List[MedicineItem]
    patient_info: Optional[PatientInfo] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    """Schema for updating a prescription"""
    medicines: Optional[List[MedicineItem]] = None
    patient_info: Optional[PatientInfo] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionAnalysis(BaseModel):
    """Schema for prescription analysis results"""
    prescription_id: str
    safety_score: float = Field(..., ge=0, le=100)
    has_interactions: bool
    has_duplicates: bool
    warnings: List[str]
    recommendations: List[str]
    estimated_cost: Optional[float] = None
    potential_savings: Optional[float] = None


class PrescriptionValidation(BaseModel):
    """Schema for prescription validation results"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []
