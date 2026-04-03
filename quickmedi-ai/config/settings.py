"""
Settings Module
Application configuration settings
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings
    """
    
    # Application
    app_name: str = "QuickMedi AI"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # API Keys
    gemini_api_key: Optional[str] = None
    
    # MongoDB
    mongodb_uri: Optional[str] = None
    
    # Database (if needed - legacy)
    database_url: Optional[str] = None
    
    # Redis (for caching)
    redis_url: Optional[str] = None
    
    # File Storage
    upload_folder: str = "uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list = ["jpg", "jpeg", "png", "pdf"]
    
    # OCR Settings
    tesseract_path: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "quickmedi_ai.log"
    
    # CORS
    cors_origins: list = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list = ["*"]
    cors_allow_headers: list = ["*"]
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    
    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI Model Settings
    default_ai_provider: str = "gemini"
    max_tokens: int = 2000
    temperature: float = 0.7
    
    # Cache Settings
    cache_ttl: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields (like AI_ prefixed vars)


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    
    Returns:
        Settings instance
    """
    return Settings()
