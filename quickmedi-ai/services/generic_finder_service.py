"""
Generic Finder Service
======================
Steps:
  1. Search brand catalog (medicines_db) by name / composition / ingredient
  2. If not found → ask Gemini to identify composition (no web scraping)
  3. Find cheapest generic equivalent (medicines collection)
  4. Find cheaper brand alternatives (medicines_db)
  5. Calculate price savings
"""

import re
import os
import ast
import json
import logging
import math
from typing import Dict, List, Optional

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

_MATCH_THRESHOLD = 0.5   # min fraction of query tokens in brand name for a valid hit

_STOPWORDS = {
    "ip", "bp", "usp", "ep", "nf", "tablets", "tablet", "capsules", "capsule",
    "injection", "syrup", "suspension", "oral", "solution", "topical", "cream",
    "gel", "ointment", "drops", "powder", "sachet", "retard", "sr", "xr", "er",
    "cr", "la", "forte", "plus", "extra", "modified", "release", "prolonged",
    "extended", "gastro", "resistant", "paediatric", "pediatric", "dispersible",
}

_BRAND_PROJECTION = {
    "_id": 0, "brand_name": 1, "name_normalized": 1, "composition_normalized": 1,
    "active_ingredients": 1, "dosage_form": 1, "price": 1, "manufacturer": 1,
    "primary_ingredient": 1, "primary_strength": 1, "pack_size": 1,
}


# ── Composition helpers ───────────────────────────────────────────────────────

def _clean_token(token: str) -> str:
    token = re.sub(
        r"\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu|unit|lakh\s*unit)(/\s*(ml|g))?",
        "", token, flags=re.IGNORECASE,
    )
    token = re.sub(r"[^\w\s]", " ", token)
    token = " ".join(t for t in token.split() if t.lower() not in _STOPWORDS)
    return token.strip().lower()


def _to_composition_key(raw: str) -> str:
    """Sorted canonical key — strips strengths and stopwords."""
    parts = re.split(r"\band\b|[+,]", raw, flags=re.IGNORECASE)
    cleaned = sorted({_clean_token(p) for p in parts if _clean_token(p) and _clean_token(p) != "none"})
    return "+".join(cleaned)


def _key_overlap(key_a: str, key_b: str) -> float:
    a = set(key_a.split("+"))
    b = set(key_b.split("+"))
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _query_tokens(s: str) -> set:
    return {
        t for t in re.sub(r"[^\w\s]", " ", s.lower()).split()
        if len(t) > 2 and not t.isdigit()
        and t not in {"mg", "ml", "mcg", "iu", "and", "for", "of", "the", "kit", "none"}
    }


def _brand_match_score(query: str, brand_name: str) -> float:
    """Fraction of query tokens that appear in brand_name."""
    q = _query_tokens(query)
    c = _query_tokens(brand_name)
    if not q:
        return 0.0
    return len(q & c) / len(q)


def _safe(val):
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


# ── CSV catalog singletons (loaded once on first use) ───────────────────────────

_DATA_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "data", "medicines")
)
_brand_df: Optional[pd.DataFrame] = None
_generic_df: Optional[pd.DataFrame] = None


def _get_brand_df() -> pd.DataFrame:
    """Lazy-load indian_pharmaceutical_products_clean.csv as the brand catalog."""
    global _brand_df
    if _brand_df is not None:
        return _brand_df

    path = os.path.join(_DATA_DIR, "indian_pharmaceutical_products_clean.csv")
    logger.info(f"Loading brand catalog from {path} …")
    df = pd.read_csv(path, low_memory=False)

    # Derived lookup columns
    df["name_normalized"] = df["brand_name"].str.lower().str.strip().fillna("")
    df["composition_normalized"] = df["primary_ingredient"].fillna("").str.lower().str.strip()
    price_col = "price_inr" if "price_inr" in df.columns else "price"
    df["price"] = pd.to_numeric(df[price_col], errors="coerce")

    _brand_df = df
    logger.info(f"Brand catalog ready: {len(df):,} products")
    return _brand_df


def _get_generic_df() -> pd.DataFrame:
    """Lazy-load generic_med.csv."""
    global _generic_df
    if _generic_df is not None:
        return _generic_df

    path = os.path.join(_DATA_DIR, "generic_med.csv")
    logger.info(f"Loading generic catalog from {path} …")
    df = pd.read_csv(path)
    df["name_lower"] = df["Generic Name"].str.lower().str.strip().fillna("")
    _generic_df = df
    logger.info(f"Generic catalog ready: {len(df):,} generics")
    return _generic_df


# ── Step 1: Brand catalog search (CSV) ──────────────────────────────────────────

def _search_brand_catalog(medicine_name: str) -> Optional[Dict]:
    """
    4-strategy search of the brand catalog DataFrame.
    Returns the best matching row as a dict, or None.
    """
    df = _get_brand_df()
    name_norm = medicine_name.strip().lower()

    # 1a. Exact brand_name match
    mask = df["name_normalized"] == name_norm
    if mask.any():
        return df[mask].iloc[0].to_dict()

    # 1b. brand_name contains the full query string
    mask = df["name_normalized"].str.contains(re.escape(name_norm), na=False)
    candidates = df[mask]
    if not candidates.empty:
        best_idx = candidates["name_normalized"].apply(
            lambda n: _brand_match_score(medicine_name, n)
        ).idxmax()
        if _brand_match_score(medicine_name, candidates.loc[best_idx, "name_normalized"]) >= _MATCH_THRESHOLD:
            return candidates.loc[best_idx].to_dict()

    # 1c. Token-overlap scoring across all rows
    tokens = _query_tokens(medicine_name)
    if tokens:
        mask = df["name_normalized"].apply(lambda n: bool(_query_tokens(n) & tokens))
        candidates = df[mask]
        if not candidates.empty:
            scores = candidates["name_normalized"].apply(
                lambda n: _brand_match_score(medicine_name, n)
            )
            best_idx = scores.idxmax()
            if scores[best_idx] >= _MATCH_THRESHOLD:
                return candidates.loc[best_idx].to_dict()

    # 1d. Composition / ingredient search
    mask = df["composition_normalized"].str.contains(re.escape(name_norm), na=False)
    if mask.any():
        return df[mask].iloc[0].to_dict()

    return None


def _extract_composition(doc: Dict) -> str:
    """Extract a human-readable composition string from a brand catalog row."""
    # active_ingredients stored as a string-repr list in the CSV
    ai = doc.get("active_ingredients")
    if isinstance(ai, str) and ai.startswith("["):
        try:
            parsed = ast.literal_eval(ai)
            parts = []
            for ing in parsed:
                if isinstance(ing, dict) and ing.get("name"):
                    strength = ing.get("strength") or ""
                    parts.append(f"{ing['name']} {strength}".strip() if strength else ing["name"])
            if parts:
                return " + ".join(parts)
        except Exception:
            pass
    elif isinstance(ai, list):
        parts = []
        for ing in ai:
            if isinstance(ing, dict) and ing.get("name"):
                strength = ing.get("strength") or ""
                parts.append(f"{ing['name']} {strength}".strip() if strength else ing["name"])
        if parts:
            return " + ".join(parts)

    # Fallback: primary_ingredient + primary_strength
    pi = str(doc.get("primary_ingredient") or "")
    ps = str(doc.get("primary_strength") or "")
    if pi and ps and ps not in ("nan", ""):
        return f"{pi} ({ps})"
    return pi


# ── Step 2: Gemini composition lookup (when medicine not in DB) ───────────────

async def _fetch_composition_from_gemini(medicine_name: str) -> Dict:
    """
    Ask Gemini to identify the composition of a medicine.
    Returns a dict with:
      is_medicine, composition, active_ingredients, dosage_form, confidence
    """
    from google import genai
    from config.ai_config import get_ai_config

    ai_cfg = get_ai_config()
    client = genai.Client(api_key=ai_cfg.gemini_api_key)

    prompt = f"""You are a medical data extraction assistant for Indian pharmaceuticals.

The user is searching for: "{medicine_name}"

1. If this is a recognised pharmaceutical medicine sold in India:
   - Provide its exact composition (active ingredients with strengths as listed on pack)
   - Provide the dosage form: tablet / capsule / syrup / injection / cream / drops / powder / other
   - Set is_medicine to true

2. If this is NOT a pharmaceutical medicine (condom, supplement, food product, device, cosmetic):
   - Set is_medicine to false
   - Leave composition and active_ingredients empty

Respond ONLY with valid JSON, no markdown fences:
{{
  "is_medicine": true,
  "composition": "Ingredient1 Strength1 + Ingredient2 Strength2",
  "active_ingredients": [{{"name": "Ingredient1", "strength": "Strength1"}}],
  "dosage_form": "tablet",
  "confidence": "high"
}}"""

    try:
        response = client.models.generate_content(model=ai_cfg.gemini_model, contents=prompt)
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip())
        data = json.loads(text)
        data["source"] = "gemini"
        if not data.get("is_medicine", True):
            data.update({"not_a_medicine": True, "composition": "", "active_ingredients": []})
        return data
    except Exception as e:
        logger.error(f"Gemini lookup failed for '{medicine_name}': {e}")
        return {
            "is_medicine": False, "not_a_medicine": True,
            "composition": "", "active_ingredients": [],
            "dosage_form": "other", "confidence": "low",
            "source": "gemini", "notes": str(e),
        }


# ── Step 3: Cheapest generic (generic_med.csv) ────────────────────────────────

def _find_cheapest_generic(composition_key: str, dosage_form: Optional[str]) -> Optional[Dict]:
    """Find cheapest generic equivalent using local generic_med.csv."""
    df = _get_generic_df()
    tokens = [t.strip() for t in composition_key.split("+") if len(t.strip()) > 3]
    if not tokens:
        return None

    # Score every generic by composition key overlap
    df = df.copy()
    df["_overlap"] = df["name_lower"].apply(
        lambda n: _key_overlap(composition_key, _to_composition_key(n))
    )
    candidates = df[df["_overlap"] >= 0.4]

    # Fallback: at least one token must appear in the generic name
    if candidates.empty:
        pattern = "|".join(re.escape(t) for t in tokens)
        candidates = df[df["name_lower"].str.contains(pattern, na=False, case=False)]
        if not candidates.empty:
            candidates = candidates.copy()
            candidates["_overlap"] = candidates["name_lower"].apply(
                lambda n: _key_overlap(composition_key, _to_composition_key(n))
            )

    if candidates.empty:
        return None

    mrp_col = "MRP"
    candidates = candidates.sort_values(
        ["_overlap", mrp_col], ascending=[False, True]
    )
    best = candidates.iloc[0]
    return {
        "name": best["Generic Name"],
        "genericName": best["Generic Name"],
        "composition": best["Generic Name"],
        "mrp": _safe(float(best[mrp_col])) if not pd.isna(best[mrp_col]) else None,
        "packSize": best["Unit Size"],
        "form": dosage_form or "",
        "therapeuticClass": best["Group Name"],
    }


# ── Step 4: Cheaper brand alternatives (indian_pharmaceutical_products_clean.csv) ──

def _find_brand_alternatives(
    composition_key: str,
    dosage_form: Optional[str],
    exclude_brand: Optional[str],
    limit: int = 5,
) -> List[Dict]:
    """Find cheaper brand alternatives using local brand catalog CSV."""
    df = _get_brand_df()
    tokens = [t.strip() for t in composition_key.split("+") if len(t.strip()) > 3]
    if not tokens:
        return []

    pattern = "|".join(re.escape(t) for t in tokens)
    mask = df["composition_normalized"].str.contains(pattern, na=False, case=False)
    candidates = df[mask].copy()

    if candidates.empty:
        return []

    # Optional filters
    if dosage_form:
        dose_mask = candidates["dosage_form"].str.lower().str.strip() == dosage_form.lower()
        if dose_mask.any():
            candidates = candidates[dose_mask]

    if exclude_brand:
        candidates = candidates[candidates["brand_name"] != exclude_brand]

    # Score by composition overlap, keep only good matches
    candidates["_overlap"] = candidates["composition_normalized"].apply(
        lambda c: _key_overlap(composition_key, _to_composition_key(c))
    )
    candidates = candidates[candidates["_overlap"] >= 0.5]

    if candidates.empty:
        return []

    candidates = candidates.sort_values(["price"], ascending=True, na_position="last")
    return [
        {
            "brand_name": row["brand_name"],
            "manufacturer": row.get("manufacturer", ""),
            "price": _safe(row["price"]),
            "dosage_form": row.get("dosage_form", ""),
            "pack_size": row.get("pack_size"),
        }
        for _, row in candidates.head(limit).iterrows()
    ]


# ── Main Service ──────────────────────────────────────────────────────────────

class GenericFinderService:

    async def find(self, medicine_name: str) -> Dict:
        result: Dict = {
            "searched_medicine": None,
            "best_generic_option": None,
            "cheaper_brand_alternatives": [],
            "price_comparison": {
                "original_price": None,
                "generic_price": None,
                "total_savings": None,
            },
        }

        composition_key = ""
        dosage_form = ""
        original_price = None

        # ── Step 1: Brand catalog (CSV) ───────────────────────────────────────
        brand_doc = _search_brand_catalog(medicine_name)

        if brand_doc:
            raw_composition = _extract_composition(brand_doc)
            result["searched_medicine"] = {
                "name": brand_doc.get("brand_name", medicine_name),
                "composition": raw_composition,
                "price": _safe(brand_doc.get("price")),
                "dosage_form": brand_doc.get("dosage_form", ""),
                "manufacturer": brand_doc.get("manufacturer", ""),
                "source": "medicine_db",
            }
            composition_key = _to_composition_key(raw_composition)
            dosage_form = (brand_doc.get("dosage_form") or "").lower().strip()
            original_price = _safe(brand_doc.get("price"))

        else:
            # ── Step 2: Gemini composition lookup ─────────────────────────────
            logger.info(f"'{medicine_name}' not in medicines_db — asking Gemini")
            gemini_data = await _fetch_composition_from_gemini(medicine_name)

            if gemini_data.get("not_a_medicine") or not gemini_data.get("composition"):
                result["searched_medicine"] = {
                    "name": medicine_name,
                    "composition": None,
                    "price": None,
                    "dosage_form": None,
                    "manufacturer": None,
                    "source": "gemini",
                    "note": gemini_data.get("notes", "Not a recognised pharmaceutical medicine"),
                }
                return result

            raw_composition = gemini_data["composition"]
            result["searched_medicine"] = {
                "name": medicine_name,
                "composition": raw_composition,
                "price": None,
                "dosage_form": gemini_data.get("dosage_form", "other"),
                "manufacturer": None,
                "source": "gemini",
                "confidence": gemini_data.get("confidence", "medium"),
            }
            composition_key = _to_composition_key(raw_composition)
            dosage_form = (gemini_data.get("dosage_form") or "").lower().strip()
            original_price = None

        # ── Step 3: Cheapest generic (generic_med.csv) ───────────────────────
        if composition_key:
            generic = _find_cheapest_generic(composition_key, dosage_form or None)
            if generic:
                result["best_generic_option"] = {
                    "name": generic.get("genericName") or generic.get("name", ""),
                    "composition": generic.get("composition", ""),
                    "mrp": _safe(generic.get("mrp")),
                    "pack_size": generic.get("packSize", ""),
                    "form": generic.get("form", ""),
                    "therapeutic_class": generic.get("therapeuticClass", ""),
                }

        # ── Step 4: Cheaper brand alternatives (CSV) ─────────────────────────
        if composition_key:
            exclude = result["searched_medicine"]["name"] if result["searched_medicine"] else None
            alts = _find_brand_alternatives(composition_key, dosage_form or None, exclude)
            result["cheaper_brand_alternatives"] = [
                {
                    "brand_name": a.get("brand_name", ""),
                    "manufacturer": a.get("manufacturer", ""),
                    "price": _safe(a.get("price")),
                    "dosage_form": a.get("dosage_form", ""),
                    "pack_size": _safe(a.get("pack_size")),
                }
                for a in alts
            ]

        # ── Step 5: Savings calculation ───────────────────────────────────────
        generic_price = (
            result["best_generic_option"]["mrp"]
            if result["best_generic_option"] else None
        )
        if original_price is None and result["cheaper_brand_alternatives"]:
            original_price = result["cheaper_brand_alternatives"][0].get("price")

        savings = None
        if original_price is not None and generic_price is not None:
            savings = round(original_price - generic_price, 2)

        result["price_comparison"] = {
            "original_price": original_price,
            "generic_price": generic_price,
            "total_savings": savings,
        }
        result["composition_key"] = composition_key

        return result
