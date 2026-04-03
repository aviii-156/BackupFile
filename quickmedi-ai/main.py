"""
QuickMedi AI - Main Application
FastAPI application for AI-powered medicine and prescription services
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import sys
from datetime import datetime
import io

# Force UTF-8 on Windows stdout/stderr so Hindi/multilingual log lines don't crash
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Import routes
from routes import (
    ai_routes,
    ocr_routes,
    medicine_routes,
    interaction_routes,
    chatbot_routes,
    voice_routes,
    generic_routes,
    sathi_routes,
)

# Import config
from config.settings import get_settings
from config.ai_config import get_ai_config

# Configure logging
import os
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(log_dir, 'quickmedi_ai.log'), encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()
ai_config = get_ai_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    """
    # Startup
    logger.info("Starting QuickMedi AI application...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Initialize services
    logger.info("Initializing AI services...")

    # Load medicine & interaction data from local CSV files
    try:
        from utils.data_loader import get_data_loader
        get_data_loader().load_data()
    except Exception as e:
        logger.warning(f"Data pre-load skipped: {e}")

    # Pre-warm Whisper model so the first voice request has no cold-start delay
    try:
        from services.voice_service import VoiceService
        vs = VoiceService()
        vs.warmup()
    except Exception as e:
        logger.warning(f"Whisper warmup skipped: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down QuickMedi AI application...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered medicine and prescription management system",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handle all uncaught exceptions
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.debug else "An error occurred"
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "documentation": "/docs" if settings.debug else None
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.now().isoformat()
    }


# API info endpoint
@app.get("/api/info")
async def api_info():
    """
    API information endpoint
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "ai_provider": ai_config.primary_ai_provider,
        "features": {
            "ocr": True,
            "chatbot": ai_config.enable_chatbot,
            "vision_api": ai_config.enable_vision_api,
            "medical_advice": ai_config.enable_medical_advice
        }
    }


# Include routers
app.include_router(ai_routes.router, prefix="/api")
app.include_router(ocr_routes.router, prefix="/api")
app.include_router(medicine_routes.router, prefix="/api")
app.include_router(interaction_routes.router, prefix="/api")
app.include_router(chatbot_routes.router, prefix="/api")
app.include_router(voice_routes.router, prefix="/api")
app.include_router(generic_routes.router, prefix="/api")
app.include_router(sathi_routes.router, prefix="/api")


# Middleware for logging requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all incoming requests
    """
    start_time = datetime.now()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.now() - start_time).total_seconds()
    
    # Log response
    logger.info(
        f"Response: {response.status_code} "
        f"Duration: {duration:.3f}s"
    )
    
    return response


if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,  
        reload=False,  
        log_level=settings.log_level.lower()
    )
