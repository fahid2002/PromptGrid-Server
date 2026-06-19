import { cloudinary } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export async function upload(request, response) {
  if (!request.file) throw new AppError(400, 'An image file is required');
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new AppError(503, 'Image upload is not configured');
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'promptgrid', resource_type: 'image', transformation: [{ width: 1200, height: 675, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }] }, (error, value) => error ? reject(error) : resolve(value));
    stream.end(request.file.buffer);
  });
  response.status(201).json({ url: result.secure_url });
}
