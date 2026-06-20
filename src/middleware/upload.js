import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, done) => allowedImageTypes.has(file.mimetype)
    ? done(null, true)
    : done(new AppError(400, 'Profile photo must be a JPEG, PNG, or WebP image.')),
});
