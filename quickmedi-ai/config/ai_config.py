"""
AI Configuration Module
AI model specific configurations
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class AIConfig(BaseSettings):
    """
    AI model configurations
    """
    
    # Gemini Configuration
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_vision_model: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.7
    gemini_top_p: float = 0.9
    gemini_top_k: int = 40
    gemini_max_output_tokens: int = 2048
    
    # Model Selection
    primary_ai_provider: str = "gemini"
    
    # Feature Flags
    enable_vision_api: bool = True
    enable_chatbot: bool = True
    enable_medical_advice: bool = True
    
    # Safety Settings
    enable_content_filtering: bool = True
    max_prompt_length: int = 4000
    max_response_length: int = 4000
    
    # Timeouts (seconds)
    api_timeout: int = 30
    vision_api_timeout: int = 45
    
    # Retry Settings
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Caching
    enable_response_caching: bool = True
    cache_ttl: int = 3600  # 1 hour
    
    # Rate Limiting
    requests_per_minute: int = 60
    requests_per_day: int = 1000
    
    # Medical Disclaimer
    medical_disclaimer: str = (
        "This information is for educational purposes only and should not "
        "replace professional medical advice. Always consult with a "
        "healthcare provider for medical concerns."
    )
    
    # Prompt Templates
    system_prompt_prefix: str = "You are a helpful medical AI assistant."
    
    # Language Settings
    default_language: str = "en"
    supported_languages: list = ["en", "es", "fr", "de", "hi"]
    
    # Output Format
    response_format: str = "json"  # json or text
    include_sources: bool = True
    include_confidence_scores: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        env_prefix = "AI_"
        extra = "ignore"  # Ignore extra fields


@lru_cache()
def get_ai_config() -> AIConfig:
    """
    Get cached AI configuration instance
    
    Returns:
        AIConfig instance
    """
    return AIConfig()


