import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const ACCESS_COOKIE_NAME = 'promptgrid_access';
export const REFRESH_COOKIE_NAME = 'promptgrid_refresh';
export const ACCESS_SESSION_MS = 15 * 60 * 1000;
export const REFRESH_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeRegistration(input) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    photoURL: input.photoURL?.trim() || '',
    role: input.role || 'user',
    subscription: 'free',
  };
}

export function cookieOptions(environment = 'development', maxAge = ACCESS_SESSION_MS) {
  const production = environment === 'production';
  return { httpOnly: true, secure: production, sameSite: 'lax', maxAge, path: '/' };
}

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const signToken = (user, secret, sessionId) => jwt.sign({ sub: String(user._id), sid: String(sessionId) }, secret, { expiresIn: '15m', issuer: 'promptgrid-api', audience: 'promptgrid-client' });
export const verifyToken = (token, secret) => jwt.verify(token, secret, { issuer: 'promptgrid-api', audience: 'promptgrid-client' });
