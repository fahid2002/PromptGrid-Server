import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function normalizeRegistration(input) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    photoURL: input.photoURL?.trim() || '',
    role: 'user',
    subscription: 'free',
  };
}

export function cookieOptions(environment = 'development') {
  const production = environment === 'production';
  return { httpOnly: true, secure: production, sameSite: production ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
}

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const signToken = (user, secret) => jwt.sign({ sub: String(user._id), role: user.role }, secret, { expiresIn: '7d', issuer: 'promptgrid-api', audience: 'promptgrid-client' });
export const verifyToken = (token, secret) => jwt.verify(token, secret, { issuer: 'promptgrid-api', audience: 'promptgrid-client' });
