import { env } from '../config/env.js';
import User from '../models/User.js';
import { verifyToken } from '../services/auth-service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authenticate = asyncHandler(async (request, _response, next) => {
  const bearer = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
  const token = request.cookies.promptgrid_token || bearer;
  if (!token) throw new AppError(401, 'Authentication required');
  let payload;
  try { payload = verifyToken(token, env.JWT_SECRET); } catch { throw new AppError(401, 'Session is invalid or expired'); }
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'Account no longer exists');
  request.user = user;
  next();
});

export const requireRole = (...roles) => (request, _response, next) => roles.includes(request.user.role) ? next() : next(new AppError(403, 'You do not have permission for this action'));
