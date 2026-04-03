"""
Image Service Module
Handles image processing and validation
"""

from typing import Dict, Optional
import logging
from PIL import Image, ImageEnhance, ImageFilter
import io
import numpy as np

from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ImageService:
    """
    Service for image processing operations
    """
    
    def __init__(self):
        self.max_image_size = (2048, 2048)
        self.min_image_size = (200, 200)
        logger.info("ImageService initialized")
    
    async def preprocess_image(self, image_data: bytes) -> bytes:
        """
        Preprocess image for better OCR results
        
        Args:
            image_data: Binary image data
            
        Returns:
            Processed image data
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large
            if image.size[0] > self.max_image_size[0] or image.size[1] > self.max_image_size[1]:
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)
            
            # Enhance image
            image = self._enhance_image(image)
            
            # Convert back to bytes
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=95)
            return output.getvalue()
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise
    
    def _enhance_image(self, image: Image.Image) -> Image.Image:
        """
        Enhance image quality for OCR
        
        Args:
            image: PIL Image
            
        Returns:
            Enhanced PIL Image
        """
        try:
            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Increase sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            
            # Reduce noise
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            return image
        except Exception as e:
            logger.error(f"Error enhancing image: {str(e)}")
            return image
    
    async def validate_prescription_image(self, image_data: bytes) -> bool:
        """
        Validate if image is a valid prescription
        
        Args:
            image_data: Binary image data
            
        Returns:
            True if valid prescription image
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Check image size
            if (image.size[0] < self.min_image_size[0] or 
                image.size[1] < self.min_image_size[1]):
                logger.warning("Image too small")
                return False
            
            # Check if image is too blurry
            if self._is_blurry(image):
                logger.warning("Image too blurry")
                return False
            
            # Check if image has enough text content
            # This is a basic check - in production, use more sophisticated methods
            return True
        except Exception as e:
            logger.error(f"Error validating prescription image: {str(e)}")
            return False
    
    def _is_blurry(self, image: Image.Image, threshold: float = 100.0) -> bool:
        """
        Check if image is too blurry using Laplacian variance
        
        Args:
            image: PIL Image
            threshold: Blur threshold
            
        Returns:
            True if image is blurry
        """
        try:
            # Convert to grayscale
            gray = image.convert('L')
            
            # Convert to numpy array
            img_array = np.array(gray)
            
            # Calculate Laplacian
            laplacian = np.array([
                [0, 1, 0],
                [1, -4, 1],
                [0, 1, 0]
            ])
            
            # Convolve
            from scipy import signal
            laplacian_img = signal.convolve2d(
                img_array, 
                laplacian, 
                mode='same', 
                boundary='symm'
            )
            
            # Calculate variance
            variance = laplacian_img.var()
            
            return variance < threshold
        except Exception as e:
            logger.error(f"Error checking blur: {str(e)}")
            return False
    
    async def rotate_image(
        self, 
        image_data: bytes, 
        angle: float
    ) -> bytes:
        """
        Rotate image by specified angle
        
        Args:
            image_data: Binary image data
            angle: Rotation angle in degrees
            
        Returns:
            Rotated image data
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            rotated = image.rotate(angle, expand=True)
            
            output = io.BytesIO()
            rotated.save(output, format='JPEG', quality=95)
            return output.getvalue()
        except Exception as e:
            logger.error(f"Error rotating image: {str(e)}")
            raise
    
    async def crop_image(
        self, 
        image_data: bytes,
        box: tuple
    ) -> bytes:
        """
        Crop image to specified box
        
        Args:
            image_data: Binary image data
            box: (left, top, right, bottom) tuple
            
        Returns:
            Cropped image data
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            cropped = image.crop(box)
            
            output = io.BytesIO()
            cropped.save(output, format='JPEG', quality=95)
            return output.getvalue()
        except Exception as e:
            logger.error(f"Error cropping image: {str(e)}")
            raise
