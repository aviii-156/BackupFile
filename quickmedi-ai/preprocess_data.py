"""
Data Preprocessing Script
Run this to clean and optimize medicine and interaction datasets
"""

import logging
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def main():
    """Main preprocessing function"""
    print("="*60)
    print("QUICKMEDI AI - DATA PREPROCESSING")
    print("="*60)
    print()
    
    # Import here to avoid issues if modules aren't loaded yet
    from utils.data_preprocessor import DataPreprocessor
    
    try:
        # Initialize preprocessor
        preprocessor = DataPreprocessor()
        
        print("Starting data preprocessing...")
        print(f"Input files:")
        print(f"  - {preprocessor.medicines_path}")
        print(f"  - {preprocessor.interactions_path}")
        print()
        
        # Preprocess all data
        medicines_df, interactions_df = preprocessor.preprocess_all()
        
        print()
        print("="*60)
        print("PREPROCESSING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print()
        print("Output files:")
        print(f"  - {preprocessor.medicines_clean_path}")
        print(f"    Records: {len(medicines_df)}")
        print(f"  - {preprocessor.interactions_clean_path}")
        print(f"    Records: {len(interactions_df)}")
        print()
        print("✓ Data is now optimized for fast lookups!")
        print("✓ You can now run: python test_optimized_system.py")
        
        return 0
        
    except FileNotFoundError as e:
        logger.error(f"Data files not found: {str(e)}")
        logger.error("Please ensure data files exist in:")
        logger.error("  - data/medicines/medicines_dataset.csv")
        logger.error("  - data/interactions/drug_interactions.csv")
        return 1
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
