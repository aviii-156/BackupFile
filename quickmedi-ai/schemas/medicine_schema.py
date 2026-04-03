"""
Medicine Schema Module
Pydantic schemas for medicine data
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum


class MedicineCategory(str, Enum):
    """Medicine category enumeration"""
    ANTIBIOTIC = "antibiotic"
    ANALGESIC = "analgesic"
    ANTIVIRAL = "antiviral"
    ANTIFUNGAL = "antifungal"
    ANTIHISTAMINE = "antihistamine"
    ANTACID = "antacid"
    ANTIDEPRESSANT = "antidepressant"
    CARDIOVASCULAR = "cardiovascular"
    RESPIRATORY = "respiratory"
    GASTROINTESTINAL = "gastrointestinal"
    OTHER = "other"


class MedicineForm(str, Enum):
    """Medicine form enumeration"""
    TABLET = "tablet"
    CAPSULE = "capsule"
    SYRUP = "syrup"
    INJECTION = "injection"
    CREAM = "cream"
    OINTMENT = "ointment"
    DROPS = "drops"
    INHALER = "inhaler"
    PATCH = "patch"
    OTHER = "other"


class MedicineQuery(BaseModel):
    """Schema for medicine search query"""
    medicine_name: str = Field(..., min_length=2, max_length=200)
    composition: Optional[str] = None
    category: Optional[MedicineCategory] = None
    manufacturer: Optional[str] = None


class MedicineInfo(BaseModel):
    """Detailed medicine information schema"""
    name: str
    composition: str
    manufacturer: Optional[str] = None
    category: Optional[MedicineCategory] = None
    form: Optional[MedicineForm] = None
    strength: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    uses: Optional[List[str]] = []
    side_effects: Optional[List[str]] = []
    precautions: Optional[List[str]] = []
    storage: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Paracetamol",
                "composition": "Acetaminophen 500mg",
                "manufacturer": "XYZ Pharma",
                "category": "analgesic",
                "form": "tablet",
                "price": 50.0,
                "uses": ["Fever", "Pain relief"],
                "side_effects": ["Nausea", "Rash"]
            }
        }


class MedicineResponse(BaseModel):
    """Medicine API response schema"""
    success: bool
    medicine: Optional[MedicineInfo] = None
    message: Optional[str] = None


class MedicineAlternative(BaseModel):
    """Medicine alternative schema"""
    name: str
    composition: str
    manufacturer: str
    price: float
    price_difference: Optional[float] = None
    savings_percent: Optional[float] = None
    availability: Optional[str] = None


class MedicineComparison(BaseModel):
    """Medicine comparison schema"""
    medicine_a: str
    medicine_b: str
    composition_match: bool
    price_comparison: Optional[dict] = None
    efficacy_comparison: Optional[str] = None
    side_effects_comparison: Optional[str] = None
    recommendation: Optional[str] = None


class MedicineStock(BaseModel):
    """Medicine stock/inventory schema"""
    medicine_name: str
    quantity: int
    price: float
    expiry_date: Optional[str] = None
    batch_number: Optional[str] = None
    location: Optional[str] = None


class MedicinePricing(BaseModel):
    """Medicine pricing schema"""
    medicine_name: str
    composition: str
    mrp: float
    selling_price: float
    discount_percent: Optional[float] = None
    vendors: Optional[List[dict]] = []
