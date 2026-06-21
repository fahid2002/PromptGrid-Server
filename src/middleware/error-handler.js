import multer from 'multer';
import { ZodError } from 'zod';

// Handles unknown routes
export function notFound(request, _response, next) {
  const error = new Error(
    `Route not found: ${request.method} ${request.originalUrl}`
  );

  error.status = 404;

  next(error);
}

// Global error handler middleware
export function errorHandler(error, _request, response, _next) {
  // Handles file size upload error from multer
  if (
    error instanceof multer.MulterError &&
    error.code === 'LIMIT_FILE_SIZE'
  ) {
    return response
      .status(413)
      .json({
        message: 'Profile photo must be 5 MB or smaller.',
      });
  }

  // Handles Zod validation errors
  if (error instanceof ZodError) {
    return response
      .status(400)
      .json({
        message: 'Validation failed',
        details: error.flatten(),
      });
  }

  // Handles MongoDB duplicate key error
  if (error.code === 11000) {
    return response
      .status(409)
      .json({
        message: 'A record with this value already exists',
      });
  }

  // Use error status if available, otherwise use 500
  const status = error.status || 500;

  return response
    .status(status)
    .json({
      message: status === 500 ? 'Internal server error' : error.message,
      details: error.details,
    });
}