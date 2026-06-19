import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { cookieOptions, hashPassword, normalizeRegistration, signToken, verifyPassword } from '../services/auth-service.js';
import { AppError } from '../utils/AppError.js';

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email(), photoURL: z.string().url().or(z.literal('')).optional(), password: z.string().min(8).max(128) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const googleSchema = z.object({ credential: z.string().min(1) });

function setSession(response, user) {
  response.cookie('promptgrid_token', signToken(user, env.JWT_SECRET), cookieOptions(env.NODE_ENV));
}

export async function register(request, response) {
  const input = normalizeRegistration(registerSchema.parse(request.body));
  if (await User.exists({ email: input.email })) throw new AppError(409, 'An account already exists for this email');
  const user = await User.create({ ...input, passwordHash: await hashPassword(input.password), password: undefined });
  response.status(201).json({ user });
}

export async function login(request, response) {
  const input = loginSchema.parse(request.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new AppError(401, 'Invalid email or password');
  setSession(response, user);
  user.passwordHash = undefined;
  response.json({ user });
}

export async function googleLogin(request, response) {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google login is not configured');
  const { credential } = googleSchema.parse(request.body);
  const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) throw new AppError(401, 'Google account email is not verified');
  const user = await User.findOneAndUpdate(
    { email: payload.email.toLowerCase() },
    { $set: { name: payload.name || payload.email, photoURL: payload.picture || '' }, $setOnInsert: { googleSubject: payload.sub, role: 'user', subscription: 'free' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  setSession(response, user);
  response.json({ user });
}

export const me = (request, response) => response.json({ user: request.user });
export function logout(_request, response) { response.clearCookie('promptgrid_token', { ...cookieOptions(env.NODE_ENV), maxAge: undefined }); response.status(204).end(); }
