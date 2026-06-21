import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// Allowed image MIME types
const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Multer middleware for image upload
export const uploadImage = multer({
  // Store uploaded file in memory before processing
  storage: multer.memoryStorage(),

  // Maximum file size: 5 MB
  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  // Validate uploaded file type
  fileFilter: (_request, file, done) =>
    allowedImageTypes.has(file.mimetype)
      ? done(null, true)
      : done(
          new AppError(
            400,
            'Profile photo must be a JPEG, PNG, or WebP image.'
          )
        ),
});