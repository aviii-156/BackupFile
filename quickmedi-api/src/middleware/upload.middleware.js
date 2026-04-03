import multer from 'multer';
import sharp from 'sharp';
import { ApiError } from '../utils/apiError.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Multer configuration with memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPG, JPEG, PNG, and PDF are allowed.'), false);
  }
};

// Multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * Middleware to process and upload image to Cloudinary
 * Compresses images with Sharp before uploading
 */
export const uploadImage = (folder) => {
  return async (req, res, next) => {
    try {
      // Parse nested form-data fields (address[city] -> address.city)
      if (req.body) {
        const parsedBody = {};
        
        Object.keys(req.body).forEach(key => {
          // Check if key has bracket notation (e.g., address[city])
          const match = key.match(/^(\w+)\[(\w+)\]$/);
          
          if (match) {
            const [, parentKey, childKey] = match;
            
            if (!parsedBody[parentKey]) {
              parsedBody[parentKey] = {};
            }
            
            parsedBody[parentKey][childKey] = req.body[key];
          } else {
            parsedBody[key] = req.body[key];
          }
        });
        
        req.body = parsedBody;
      }

      if (!req.file) {
        return next();
      }

      // Check if it's an image
      if (req.file.mimetype.startsWith('image/')) {
        // Compress image with Sharp
        const compressedBuffer = await sharp(req.file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Upload to Cloudinary
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const imageUrl = await uploadToCloudinary(compressedBuffer, folder, filename);
        
        req.uploadedImageUrl = imageUrl;
      } else if (req.file.mimetype === 'application/pdf') {
        // Upload PDF directly
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const pdfUrl = await uploadToCloudinary(req.file.buffer, folder, filename);
        
        req.uploadedImageUrl = pdfUrl;
      }

      next();
    } catch (error) {
      console.error('Upload error:', error);
      next(new ApiError(500, 'File upload failed'));
    }
  };
};

/**
 * Middleware to process and upload multiple images
 */
export const uploadImages = (folder, maxCount = 10) => {
  return async (req, res, next) => {
    try {
      // Parse nested form-data fields (address[city] -> address.city)
      if (req.body) {
        const parsedBody = {};
        
        Object.keys(req.body).forEach(key => {
          // Check if key has bracket notation (e.g., address[city])
          const match = key.match(/^(\w+)\[(\w+)\]$/);
          
          if (match) {
            const [, parentKey, childKey] = match;
            
            if (!parsedBody[parentKey]) {
              parsedBody[parentKey] = {};
            }
            
            parsedBody[parentKey][childKey] = req.body[key];
          } else {
            parsedBody[key] = req.body[key];
          }
        });
        
        req.body = parsedBody;
      }

      if (!req.files || req.files.length === 0) {
        return next();
      }

      const uploadPromises = req.files.map(async (file) => {
        if (file.mimetype.startsWith('image/')) {
          // Compress image
          const compressedBuffer = await sharp(file.buffer)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return await uploadToCloudinary(compressedBuffer, folder, filename);
        } else {
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return await uploadToCloudinary(file.buffer, folder, filename);
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      req.uploadedImageUrls = uploadedUrls;

      next();
    } catch (error) {
      console.error('Multiple upload error:', error);
      next(new ApiError(500, 'File upload failed'));
    }
  };
};

export default { upload, uploadImage, uploadImages };
