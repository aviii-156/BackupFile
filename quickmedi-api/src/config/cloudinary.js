import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadToCloudinary = async (buffer, folder, filename) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `quickmedi/${folder}`,
          public_id: filename,
          resource_type: 'auto',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload to Cloudinary and return both the secure URL and the public_id.
 * Used by the chatbot prescription upload flow.
 */
export const uploadToCloudinaryWithId = async (buffer, folder, filename) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `quickmedi/${folder}`,
          public_id: filename,
          resource_type: 'auto',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

export default cloudinary;
