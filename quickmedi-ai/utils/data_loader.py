"""
Data Loader Module
Loads medicines from local CSV files (indian_pharmaceutical_products_clean.csv
with medicines_clean.csv as fallback).  No MongoDB dependency.

CSV → internal field mapping applied on load:
  brand_name          → name
  manufacturer        → manufacturer_name
  packaging_raw       → pack_size_label
  dosage_form         → type
  price_inr           → price
  primary_ingredient  → short_composition1 (with strength)
  composition_normalized, name_normalized – computed
"""

import pandas as pd
import numpy as np
import os
import logging
import math
from typing import List, Dict, Optional
from difflib import SequenceMatcher
import re

logger = logging.getLogger(__name__)


# ── CSV loader helper ──────────────────────────────────────────────────────────

def _load_medicines_from_csv(path: str) -> Optional[pd.DataFrame]:
    """
    Load medicines from the local indian_pharmaceutical_products_clean.csv and
    remap columns to the internal schema used by the rest of the codebase.
    """
    try:
        logger.info(f"Loading medicines from {path} …")
        df = pd.read_csv(path, low_memory=False)

        # ── Detect CSV format and remap columns ──────────────────────────────
        if "brand_name" in df.columns:
            # indian_pharmaceutical_products_clean.csv format
            price_col = "price_inr" if "price_inr" in df.columns else "price"
            df.rename(columns={
                "product_id":    "id",
                "brand_name":    "name",
                "manufacturer":  "manufacturer_name",
                price_col:       "price",
                "dosage_form":   "type",
                "packaging_raw": "pack_size_label",
            }, inplace=True)

            # short_composition1 = "Primary Ingredient (Strength)"
            pi = df.get("primary_ingredient", pd.Series([""] * len(df))).fillna("")
            ps = df.get("primary_strength", pd.Series([""] * len(df))).fillna("").astype(str)
            df["short_composition1"] = [
                f"{i} ({s})" if i and s and s not in ("nan", "") else i
                for i, s in zip(pi, ps)
            ]
            df["short_composition2"] = ""

            # name_normalized and composition_normalized
            df["name_normalized"] = df["name"].str.lower().str.strip().fillna("")
            df["composition_normalized"] = pi.str.lower().str.strip()

        # ── Sanitize numerics ─────────────────────────────────────────────────
        for col_name in df.select_dtypes(include=[np.number]).columns:
            df[col_name] = df[col_name].replace([np.inf, -np.inf], np.nan)
            df[col_name] = df[col_name].where(pd.notna(df[col_name]), None)

        logger.info(f"Loaded {len(df):,} medicines from {path}")
        return df

    except Exception as exc:
        logger.error(f"CSV medicine load failed ({path}): {exc}")
        return None


class DataLoader:
    """
    Singleton class for loading and indexing medicine and interaction data
    Provides fast lookup operations
    """
    
    _instance = None
    _initialized = False
    
    # Brand to Generic name mapping for interaction checking
    BRAND_TO_GENERIC = {
        'aspirin': 'acetylsalicylic acid',
        'tylenol': 'paracetamol',
        'advil': 'ibuprofen',
        'motrin': 'ibuprofen',
        'aleve': 'naproxen',
        'zantac': 'ranitidine',
        'prilosec': 'omeprazole',
        'nexium': 'esomeprazole',
        'lipitor': 'atorvastatin',
        'crestor': 'rosuvastatin',
        'plavix': 'clopidogrel',
        'coumadin': 'warfarin',
        'glucophage': 'metformin',
        'zoloft': 'sertraline',
        'prozac': 'fluoxetine',
        'xanax': 'alprazolam',
        'valium': 'diazepam',
        'ativan': 'lorazepam',
        'ambien': 'zolpidem',
        'viagra': 'sildenafil',
    }
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if DataLoader._initialized:
            return
        
        self.data_path = "data"
        self.medicines_df = None
        self.interactions_df = None
        
        # Indexes for fast lookup
        self.name_index = {}  # name_normalized -> full record
        self.composition_index = {}  # composition -> list of medicines
        self.interaction_index = {}  # drug1 -> list of interactions
        
        DataLoader._initialized = True
        logger.info("DataLoader initialized")
    
    def load_data(self, force_reload: bool = False):
        """
        Load medicines and interactions from local CSV files.
        Primary source: indian_pharmaceutical_products_clean.csv (253k rows)
        Fallback:       medicines_clean.csv
        """
        if self.medicines_df is not None and not force_reload:
            logger.info("Data already loaded")
            return

        logger.info("Loading data from local CSV files …")

        # ── Medicines ─────────────────────────────────────────────────────────
        pharma_csv   = os.path.join(self.data_path, "medicines", "indian_pharmaceutical_products_clean.csv")
        fallback_csv = os.path.join(self.data_path, "medicines", "medicines_clean.csv")

        if os.path.exists(pharma_csv):
            self.medicines_df = _load_medicines_from_csv(pharma_csv)

        if self.medicines_df is None and os.path.exists(fallback_csv):
            logger.info("Falling back to medicines_clean.csv")
            self.medicines_df = pd.read_csv(fallback_csv)
            numeric_cols = self.medicines_df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                self.medicines_df[col] = self.medicines_df[col].replace([np.inf, -np.inf], np.nan)
                self.medicines_df[col] = self.medicines_df[col].where(pd.notna(self.medicines_df[col]), None)

        if self.medicines_df is None:
            logger.warning("No local medicine CSV found – running preprocessing …")
            from utils.data_preprocessor import preprocess_data
            preprocess_data()
            if os.path.exists(fallback_csv):
                self.medicines_df = pd.read_csv(fallback_csv)
            else:
                self.medicines_df = pd.DataFrame()

        # ── Interactions: always from local CSV ─────────────────────────────
        interactions_clean_path = os.path.join(
            self.data_path, "interactions", "interactions_clean.csv"
        )
        if not os.path.exists(interactions_clean_path):
            logger.warning("interactions_clean.csv not found. Running preprocessing …")
            from utils.data_preprocessor import preprocess_data
            preprocess_data()

        if os.path.exists(interactions_clean_path):
            self.interactions_df = pd.read_csv(interactions_clean_path)
        else:
            logger.error("interactions_clean.csv still missing after preprocessing")
            self.interactions_df = pd.DataFrame(columns=["drug1", "drug2", "description", "severity"])

        logger.info(f"Loaded {len(self.medicines_df):,} medicines")
        logger.info(f"Loaded {len(self.interactions_df):,} interactions")

        # Build indexes
        self._build_indexes()
    
    def _build_indexes(self):
        """Build fast lookup indexes using vectorized operations"""
        logger.info("Building indexes...")
        
        # Build name index (handle duplicates by keeping first)
        if "name_normalized" not in self.medicines_df.columns:
            self.medicines_df["name_normalized"] = self.medicines_df["name"].str.lower().str.strip()
        self.medicines_df['name_normalized'] = self.medicines_df['name_normalized'].fillna('')
        valid_names = self.medicines_df[self.medicines_df['name_normalized'] != ''].drop_duplicates(subset=['name_normalized'], keep='first')
        self.name_index = valid_names.set_index('name_normalized').to_dict('index')
        
        # Build composition index (group by composition)
        if "composition_normalized" not in self.medicines_df.columns:
            self.medicines_df["composition_normalized"] =\
                self.medicines_df.get("short_composition1", pd.Series("", index=self.medicines_df.index)).str.lower()
        self.medicines_df['composition_normalized'] = self.medicines_df['composition_normalized'].fillna('')
        valid_comps = self.medicines_df[self.medicines_df['composition_normalized'] != '']
        grouped_by_comp = valid_comps.groupby('composition_normalized')
        self.composition_index = {comp: group.to_dict('records') for comp, group in grouped_by_comp}
        
        # Build interaction index (group by drug1)
        self.interactions_df['drug1'] = self.interactions_df['drug1'].fillna('')
        valid_interactions = self.interactions_df[self.interactions_df['drug1'] != '']
        grouped_by_drug = valid_interactions.groupby('drug1')
        self.interaction_index = {drug: group.to_dict('records') for drug, group in grouped_by_drug}
        
        logger.info(f"Indexes built: {len(self.name_index):,} names, "
                   f"{len(self.composition_index):,} compositions, "
                   f"{len(self.interaction_index):,} drug interactions")
    
    def normalize_name(self, name: str) -> str:
        """
        Normalize medicine name for lookup
        
        Args:
            name: Original medicine name
            
        Returns:
            Normalized name
        """
        if not name:
            return ""
        
        name = str(name).lower()
        
        # Remove common suffixes
        suffixes = [
            'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'suspension',
            'injection', 'cream', 'ointment', 'gel', 'drops', 'solution',
            'powder', 'sachet', 'inhaler', 'patch', 'lotion', 'spray'
        ]
        
        for suffix in suffixes:
            name = re.sub(rf'\b{suffix}\b', '', name)
        
        name = ' '.join(name.split())
        return name.strip()
    
    def find_medicine_by_name(self, name: str, fuzzy: bool = True, threshold: float = 0.85) -> Optional[Dict]:
        """
        Find medicine by name with fuzzy matching
        
        Args:
            name: Medicine name to search
            fuzzy: Enable fuzzy matching
            threshold: Similarity threshold for fuzzy matching (0-1)
            
        Returns:
            Medicine record or None
        """
        name_norm = self.normalize_name(name)
        
        # Try exact normalized match first
        if name_norm in self.name_index:
            return self.name_index[name_norm]
        
        # Extract brand name and dosage (e.g., "Crocin 500" -> "crocin" + "500")
        import re
        name_lower = name.lower().strip()
        dosage_match = re.search(r'(\d+)\s*(?:mg)?', name_lower)
        brand_name = re.sub(r'\s*\d+\s*(?:mg)?', '', name_lower).strip()
        
        # Use pandas filtering for efficient partial match search
        # This searches ALL medicines, not just the first N
        if brand_name and len(brand_name) >= 3:
            # Create case-insensitive search pattern using 'name' column
            mask = self.medicines_df['name'].str.lower().str.contains(brand_name, na=False, regex=False)
            matches = self.medicines_df[mask]
            
            if not matches.empty:
                # If dosage specified, try to match it in composition
                if dosage_match:
                    dosage = dosage_match.group(1)
                    # Check both short_composition1 and short_composition2
                    comp_mask = (
                        matches['short_composition1'].astype(str).str.contains(dosage, na=False, regex=False) |
                        matches['short_composition2'].astype(str).str.contains(dosage, na=False, regex=False)
                    )
                    dosage_matches = matches[comp_mask]
                    
                    if not dosage_matches.empty:
                        result = dosage_matches.iloc[0].to_dict()
                        logger.info(f"Partial match with dosage: '{name}' to '{result.get('name')}' (found {len(dosage_matches)} matches)")
                        return result
                
                # Return first brand match even without dosage match
                result = matches.iloc[0].to_dict()
                logger.info(f"Partial brand match: '{name}' to '{result.get('name')}' (found {len(matches)} matches)")
                return result
        
        # Fuzzy match as last resort (search limited set for performance)
        if fuzzy:
            best_match = None
            best_score = 0
            
            for indexed_name in list(self.name_index.keys())[:10000]:
                score = SequenceMatcher(None, name_norm, indexed_name).ratio()
                if score > best_score and score >= threshold:
                    best_score = score
                    best_match = indexed_name
            
            if best_match and best_score >= 0.85:
                logger.info(f"Fuzzy matched '{name}' to '{best_match}' (score: {best_score:.2f})")
                return self.name_index[best_match]
        
        logger.warning(f"No match found for: '{name}'")
        return None
    
    def find_alternatives_by_composition(
        self, 
        composition: str, 
        exclude_name: str = None,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Find alternative medicines with same composition
        
        Args:
            composition: Normalized composition to search
            exclude_name: Medicine name to exclude from results
            max_results: Maximum number of results
            
        Returns:
            List of alternative medicines
        """
        alternatives = []
        
        # Direct composition match
        if composition in self.composition_index:
            alternatives = self.composition_index[composition].copy()
        else:
            # Try partial matching
            comp_parts = set(composition.split(','))
            
            for indexed_comp, medicines in self.composition_index.items():
                indexed_parts = set(indexed_comp.split(','))
                
                # Check if compositions overlap significantly
                if len(comp_parts & indexed_parts) >= len(comp_parts) * 0.8:
                    alternatives.extend(medicines)
        
        # Exclude the original medicine
        if exclude_name:
            exclude_norm = self.normalize_name(exclude_name)
            alternatives = [
                alt for alt in alternatives 
                if alt.get('name_normalized') != exclude_norm
            ]
        
        # Sort by price
        alternatives = sorted(alternatives, key=lambda x: x.get('price', float('inf')))
        
        return alternatives[:max_results]
    
    def check_duplicates(self, medicine_names: List[str]) -> Dict:
        """
        Check for duplicate active ingredients in medicines
        
        Args:
            medicine_names: List of medicine names
            
        Returns:
            Duplicate report with grouped active ingredients
        """
        import re
        
        medicines_data = []
        ingredient_groups = {}  # ingredient -> list of medicines
        not_found = []
        
        for name in medicine_names:
            med = self.find_medicine_by_name(name, fuzzy=True, threshold=0.85)
            if med:
                medicines_data.append(med)
                comp = med.get('composition_normalized', '')
                
                # Extract active ingredient (remove dosage and strength)
                # e.g., "paracetamol 650mg" -> "paracetamol"
                # Split by + for combination drugs
                ingredients = comp.lower().split('+')
                
                for raw_ingredient in ingredients:
                    # Remove dosage info
                    active_ingredient = re.sub(r'\s*\d+\.?\d*\s*(mg|g|ml|mcg|iu|%).*', '', raw_ingredient, flags=re.IGNORECASE).strip()
                    active_ingredient = re.sub(r'[\d\.]+', '', active_ingredient).strip()  # Remove any remaining numbers
                    
                    if active_ingredient:
                        if active_ingredient not in ingredient_groups:
                            ingredient_groups[active_ingredient] = []
                        ingredient_groups[active_ingredient].append({
                            'name': med.get('name', name),
                            'composition': comp,
                            'original_name': name
                        })
            else:
                not_found.append(name)
                logger.warning(f"Medicine not found in database: {name}")
        
        # Find duplicates (ingredients present in multiple medicines)
        duplicates = []
        for ingredient, meds in ingredient_groups.items():
            if len(meds) > 1:
                # Get unique medicine names (avoid counting same medicine twice)
                unique_meds = {}
                for m in meds:
                    med_name = m['name']
                    if med_name not in unique_meds:
                        unique_meds[med_name] = m
                
                if len(unique_meds) > 1:  # Only report if truly different medicines
                    duplicates.append({
                        'active_ingredient': ingredient.title(),
                        'count': len(unique_meds),
                        'medicines': list(unique_meds.keys()),
                        'compositions': [m['composition'] for m in unique_meds.values()],
                        'warning': f'{ingredient.title()} found in {len(unique_meds)} different medicines - Risk of overdose'
                    })
        
        return {
            'has_duplicates': len(duplicates) > 0,
            'count': len(duplicates),
            'duplicates': duplicates,
            'medicines_checked': len(medicines_data),
            'medicines_not_found': not_found
        }
    
    def check_interactions(self, medicine_names: List[str]) -> Dict:
        """
        Check for drug interactions between medicines
        
        Args:
            medicine_names: List of medicine names
            
        Returns:
            Interaction report
        """
        import re
        interactions_found = []
        
        # Get compositions for all medicines
        medicines_data = []
        for name in medicine_names:
            med = self.find_medicine_by_name(name)
            if med:
                medicines_data.append(med)
        
        # Helper: Extract clean active ingredient name (remove dosage) and map to generic
        def extract_active_ingredient(composition_part: str) -> str:
            """Extract active ingredient without dosage and map brand to generic"""
            clean = re.sub(r'\s*\d+\.?\d*\s*(mg|g|ml|mcg|iu|%).*', '', composition_part, flags=re.IGNORECASE).strip()
            clean = re.sub(r'[\d\.]+', '', clean).strip()
            clean = clean.lower()
            
            # Map brand/common names to generic names used in interactions DB
            if clean in self.BRAND_TO_GENERIC:
                return self.BRAND_TO_GENERIC[clean]
            
            return clean
        
        # Check interactions between all pairs
        for i in range(len(medicines_data)):
            for j in range(i + 1, len(medicines_data)):
                med1 = medicines_data[i]
                med2 = medicines_data[j]
                
                # Extract clean drug names from compositions
                comp1 = med1.get('composition_normalized', '')
                comp2 = med2.get('composition_normalized', '')
                
                # Split by '+' for combination drugs, then by ',' for multiple entries
                drugs1_raw = [d.strip() for d in re.split(r'[+,]', comp1) if d.strip()]
                drugs2_raw = [d.strip() for d in re.split(r'[+,]', comp2) if d.strip()]
                
                # Extract clean active ingredients with brand-to-generic mapping
                drugs1 = [extract_active_ingredient(d) for d in drugs1_raw if d]
                drugs2 = [extract_active_ingredient(d) for d in drugs2_raw if d]
                
                logger.info(f"Checking interactions: {med1['name']} ({drugs1}) vs {med2['name']} ({drugs2})")
                
                # Check each drug combination in interaction index
                for drug1 in drugs1:
                    if not drug1:
                        continue
                    
                    # Try direct lookup first
                    if drug1 in self.interaction_index:
                        for interaction in self.interaction_index[drug1]:
                            drug2_in_db = interaction['drug2'].lower().strip()
                            drug2_in_db_clean = extract_active_ingredient(drug2_in_db)
                            
                            # Check if any drug from med2 matches
                            for drug2 in drugs2:
                                if drug2 and (drug2 == drug2_in_db_clean or drug2 in drug2_in_db or drug2_in_db_clean in drug2):
                                    interactions_found.append({
                                        'medicine1': med1['name'],
                                        'medicine2': med2['name'],
                                        'drug1': drug1.title(),
                                        'drug2': drug2.title(),
                                        'description': interaction['description'],
                                        'severity': interaction.get('severity', 'moderate')
                                    })
                
                # Also check reverse direction (drug2 -> drug1 interactions)
                for drug2 in drugs2:
                    if not drug2:
                        continue
                    
                    if drug2 in self.interaction_index:
                        for interaction in self.interaction_index[drug2]:
                            drug1_in_db = interaction['drug2'].lower().strip()
                            drug1_in_db_clean = extract_active_ingredient(drug1_in_db)
                            
                            for drug1 in drugs1:
                                if drug1 and (drug1 == drug1_in_db_clean or drug1 in drug1_in_db or drug1_in_db_clean in drug1):
                                    # Avoid duplicates
                                    already_found = any(
                                        (i['drug1'].lower() == drug1 and i['drug2'].lower() == drug2) or
                                        (i['drug1'].lower() == drug2 and i['drug2'].lower() == drug1)
                                        for i in interactions_found
                                    )
                                    
                                    if not already_found:
                                        interactions_found.append({
                                            'medicine1': med2['name'],
                                            'medicine2': med1['name'],
                                            'drug1': drug2.title(),
                                            'drug2': drug1.title(),
                                            'description': interaction['description'],
                                            'severity': interaction.get('severity', 'moderate')
                                        })
        
        return {
            'has_interactions': len(interactions_found) > 0,
            'count': len(interactions_found),
            'interactions': interactions_found,
            'medicines_checked': len(medicines_data)
        }
    
    def _sanitize_value(self, value):
        """Sanitize numeric values for JSON serialization"""
        import math
        if isinstance(value, float):
            if math.isnan(value) or math.isinf(value):
                return None
            # Round to 2 decimal places for prices and monetary values
            return round(value, 2)
        return value
    
    def get_medicine_info(self, name: str) -> Optional[Dict]:
        """
        Get complete information about a medicine
        
        Args:
            name: Medicine name
            
        Returns:
            Complete medicine information
        """
        import math
        med = self.find_medicine_by_name(name)
        if not med:
            return None
        
        # Get alternatives
        composition = med.get('composition_normalized', '')
        alternatives = self.find_alternatives_by_composition(
            composition, 
            exclude_name=name,
            max_results=5
        )
        
        # Sanitize medicine price
        med_price = self._sanitize_value(med.get('price'))
        
        # Process alternatives with sanitized values
        processed_alternatives = []
        for alt in alternatives:
            alt_price = self._sanitize_value(alt.get('price'))
            
            # Calculate savings only if both prices are valid
            if med_price is not None and alt_price is not None:
                savings = round(med_price - alt_price, 2)
            else:
                savings = None
            
            processed_alternatives.append({
                'name': alt['name'],
                'price': alt_price,
                'manufacturer': alt.get('manufacturer_name'),
                'savings': savings
            })
        
        return {
            'name': med['name'],
            'price': med_price,
            'manufacturer': med.get('manufacturer_name'),
            'composition': med.get('short_composition1'),
            'composition2': med.get('short_composition2'),
            'type': med.get('type'),
            'pack_size': med.get('pack_size_label'),
            'therapeutic_class': med.get('therapeutic_class'),
            'alternatives': processed_alternatives
        }


# Global instance
_data_loader = None


def get_data_loader() -> DataLoader:
    """
    Get the global DataLoader instance (data is loaded lazily in lifespan).
    """
    global _data_loader
    if _data_loader is None:
        _data_loader = DataLoader()
    return _data_loader
