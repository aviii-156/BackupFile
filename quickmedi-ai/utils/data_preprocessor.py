"""
Data Preprocessor Module
Cleans and optimizes medicine and interaction datasets for fast lookups
"""

import pandas as pd
import numpy as np
import os
import re
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """
    Preprocesses and optimizes medicine and interaction datasets
    """
    
    def __init__(self, data_path: str = "data"):
        self.data_path = data_path
        self.medicines_path = os.path.join(data_path, "medicines", "medicines_dataset.csv")
        self.interactions_path = os.path.join(data_path, "interactions", "drug_interactions.csv")
        
        self.medicines_clean_path = os.path.join(data_path, "medicines", "medicines_clean.csv")
        self.interactions_clean_path = os.path.join(data_path, "interactions", "interactions_clean.csv")
        
        logger.info("DataPreprocessor initialized")
    
    def normalize_medicine_name(self, name: str) -> str:
        """
        Normalize medicine name for matching
        
        Args:
            name: Original medicine name
            
        Returns:
            Normalized name
        """
        if pd.isna(name):
            return ""
        
        # Convert to lowercase
        name = str(name).lower()
        
        # Remove common suffixes
        suffixes = [
            'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'suspension',
            'injection', 'cream', 'ointment', 'gel', 'drops', 'solution',
            'powder', 'sachet', 'inhaler', 'patch', 'lotion', 'spray'
        ]
        
        for suffix in suffixes:
            name = re.sub(rf'\b{suffix}\b', '', name)
        
        # Remove extra whitespace
        name = ' '.join(name.split())
        
        return name.strip()
    
    def extract_composition(self, comp1: str, comp2: str = None) -> str:
        """
        Extract and normalize composition
        
        Args:
            comp1: Primary composition
            comp2: Secondary composition (optional)
            
        Returns:
            Combined normalized composition
        """
        compositions = []
        
        for comp in [comp1, comp2]:
            if pd.notna(comp) and comp:
                # Extract drug name (before dosage)
                comp_str = str(comp).strip()
                # Remove dosage info (everything in parentheses)
                drug_name = re.sub(r'\s*\([^)]*\)', '', comp_str)
                drug_name = drug_name.strip().lower()
                if drug_name:
                    compositions.append(drug_name)
        
        return ','.join(compositions)
    
    def clean_medicines_dataset(self) -> pd.DataFrame:
        """
        Clean and optimize medicines dataset
        
        Returns:
            Cleaned DataFrame
        """
        logger.info("Loading medicines dataset...")
        df = pd.read_csv(self.medicines_path)
        
        original_count = len(df)
        logger.info(f"Original dataset: {original_count} medicines")
        
        # Step 1: Remove discontinued medicines
        if 'Is_discontinued' in df.columns:
            df = df[df['Is_discontinued'] == False]
            logger.info(f"After removing discontinued: {len(df)} medicines")
        
        # Step 2: Remove medicines without composition
        df = df.dropna(subset=['short_composition1'])
        logger.info(f"After removing empty compositions: {len(df)} medicines")
        
        # Step 3: Create normalized name column
        df['name_normalized'] = df['name'].apply(self.normalize_medicine_name)
        
        # Step 4: Extract and normalize compositions
        df['composition_normalized'] = df.apply(
            lambda row: self.extract_composition(
                row['short_composition1'], 
                row.get('short_composition2', None)
            ), 
            axis=1
        )
        
        # Step 5: Remove duplicates (keep first occurrence)
        df = df.drop_duplicates(subset=['name_normalized', 'composition_normalized'], keep='first')
        logger.info(f"After removing duplicates: {len(df)} medicines")
        
        # Step 6: Clean price column
        if 'price(₹)' in df.columns:
            df['price'] = pd.to_numeric(df['price(₹)'], errors='coerce')
            df = df.dropna(subset=['price'])
        
        # Step 7: Select and reorder columns
        columns_to_keep = [
            'id', 'name', 'name_normalized', 'price', 
            'manufacturer_name', 'short_composition1', 'short_composition2',
            'composition_normalized', 'type', 'pack_size_label'
        ]
        
        # Only keep columns that exist
        columns_to_keep = [col for col in columns_to_keep if col in df.columns]
        df = df[columns_to_keep]
        
        # Step 8: Save cleaned dataset
        df.to_csv(self.medicines_clean_path, index=False)
        logger.info(f"Cleaned medicines saved to: {self.medicines_clean_path}")
        logger.info(f"Reduction: {original_count - len(df)} medicines removed")
        
        return df
    
    def clean_interactions_dataset(self) -> pd.DataFrame:
        """
        Clean and optimize interactions dataset
        
        Returns:
            Cleaned DataFrame
        """
        logger.info("Loading interactions dataset...")
        df = pd.read_csv(self.interactions_path)
        
        original_count = len(df)
        logger.info(f"Original dataset: {original_count} interactions")
        
        # Step 1: Rename columns for consistency
        df.columns = ['drug1', 'drug2', 'description']
        
        # Step 2: Convert to lowercase for matching
        df['drug1'] = df['drug1'].str.lower().str.strip()
        df['drug2'] = df['drug2'].str.lower().str.strip()
        
        # Step 3: Remove rows with missing data
        df = df.dropna(subset=['drug1', 'drug2', 'description'])
        logger.info(f"After removing empty rows: {len(df)} interactions")
        
        # Step 4: Remove duplicates
        df = df.drop_duplicates(subset=['drug1', 'drug2'])
        logger.info(f"After removing duplicates: {len(df)} interactions")
        
        # Step 5: Extract severity from description if possible
        def extract_severity(description: str) -> str:
            """Extract severity level from description"""
            desc_lower = description.lower()
            if any(word in desc_lower for word in ['severe', 'serious', 'dangerous', 'contraindicated']):
                return 'high'
            elif any(word in desc_lower for word in ['moderate', 'caution', 'monitor']):
                return 'moderate'
            else:
                return 'low'
        
        df['severity'] = df['description'].apply(extract_severity)
        
        # Step 6: Create bidirectional entries for faster lookup
        # For each A-B interaction, also create B-A
        df_reverse = df.copy()
        df_reverse['drug1'], df_reverse['drug2'] = df['drug2'], df['drug1']
        
        df_combined = pd.concat([df, df_reverse], ignore_index=True)
        df_combined = df_combined.drop_duplicates(subset=['drug1', 'drug2'])
        
        logger.info(f"After creating bidirectional entries: {len(df_combined)} interactions")
        
        # Step 7: Save cleaned dataset
        df_combined.to_csv(self.interactions_clean_path, index=False)
        logger.info(f"Cleaned interactions saved to: {self.interactions_clean_path}")
        
        return df_combined
    
    def preprocess_all(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Preprocess all datasets
        
        Returns:
            Tuple of (medicines_df, interactions_df)
        """
        logger.info("Starting full data preprocessing...")
        
        medicines_df = self.clean_medicines_dataset()
        interactions_df = self.clean_interactions_dataset()
        
        logger.info("Data preprocessing completed successfully!")
        logger.info(f"Final medicines count: {len(medicines_df)}")
        logger.info(f"Final interactions count: {len(interactions_df)}")
        
        return medicines_df, interactions_df


# Standalone function to run preprocessing
def preprocess_data():
    """Run data preprocessing"""
    preprocessor = DataPreprocessor()
    medicines_df, interactions_df = preprocessor.preprocess_all()
    return medicines_df, interactions_df


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run preprocessing
    preprocess_data()
