import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export async function uploadImageBuffer(file, { folder = 'promptgrid', width = 1200, height = 675 } = {}) {
  if (!file) throw new AppError(400, 'An image file is required');
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Image upload is not configured. Add the Cloudinary environment variables or register without a photo.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      resource_type: 'image',
      transformation: [{ width, height, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
    }, (error, value) => error ? reject(new AppError(502, 'Image upload failed. Please try again.')) : resolve(value.secure_url));
    stream.end(file.buffer);
  });
}
