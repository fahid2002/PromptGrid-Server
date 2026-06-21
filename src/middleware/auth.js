import { env } from '../config/env.js';
import User from '../models/User.js';
import {
  ACCESS_COOKIE_NAME,
  verifyToken,
} from '../services/auth-service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/async-handler.js';

// Middleware for checking if user is authenticated
export const authenticate = asyncHandler(async (request, _response, next) => {
  // Check Bearer token from Authorization header
  const bearer = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : null;

  // Get token from cookie first, otherwise use Bearer token
  const token = request.cookies[ACCESS_COOKIE_NAME] || bearer;

  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  let payload;

  try {
    // Verify JWT token
    payload = verifyToken(token, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Session is invalid or expired');
  }

  // Find user from token payload
  const user = await User.findById(payload.sub);

  if (!user) {
    throw new AppError(401, 'Account no longer exists');
  }

  // Attach authenticated user to request
  request.user = user;

  next();
});

// Middleware for checking allowed user roles
export const requireRole = (...roles) => (request, _response, next) =>
  roles.includes(request.user.role)
    ? next()
    : next(new AppError(403, 'You do not have permission for this action'));