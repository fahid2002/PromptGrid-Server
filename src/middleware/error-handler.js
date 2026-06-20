import multer from 'multer';
import { ZodError } from 'zod';

export function notFound(request, _response, next) { const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`); error.status = 404; next(error); }

export function errorHandler(error, _request, response, _next) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ message: 'Profile photo must be 5 MB or smaller.' });
  if (error instanceof ZodError) return response.status(400).json({ message: 'Validation failed', details: error.flatten() });
  if (error.code === 11000) return response.status(409).json({ message: 'A record with this value already exists' });
  const status = error.status || 500;
  return response.status(status).json({ message: status === 500 ? 'Internal server error' : error.message, details: error.details });
}
