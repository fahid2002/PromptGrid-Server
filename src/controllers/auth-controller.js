import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { ACCESS_COOKIE_NAME, ACCESS_SESSION_MS, cookieOptions, hashPassword, normalizeRegistration, REFRESH_COOKIE_NAME, REFRESH_SESSION_MS, signToken, verifyPassword } from '../services/auth-service.js';
import { resolveGoogleAccount } from '../services/google-account.js';
import { uploadImageBuffer } from '../services/image-upload.js';
import { createRefreshSession, revokeRefreshSession, rotateRefreshSession } from '../services/session-service.js';
import { AppError } from '../utils/AppError.js';
import { googleSchema, loginSchema, registerSchema } from '../validators/auth-input.js';

function clearSessionCookies(response) {
  response.clearCookie(ACCESS_COOKIE_NAME, { ...cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS), maxAge: undefined });
  response.clearCookie(REFRESH_COOKIE_NAME, { ...cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS), maxAge: undefined });
  response.clearCookie('promptgrid_token', { ...cookieOptions(env.NODE_ENV), maxAge: undefined });
}

async function setSession(response, user) {
  const refresh = await createRefreshSession({ userId: user._id });
  response.cookie(ACCESS_COOKIE_NAME, signToken(user, env.JWT_SECRET, refresh.session._id), cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS));
  response.cookie(REFRESH_COOKIE_NAME, refresh.token, cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS));
}

export async function register(request, response) {
  const input = normalizeRegistration(registerSchema.parse(request.body));
  if (await User.exists({ email: input.email })) throw new AppError(409, 'An account already exists for this email');
  const photoURL = request.file ? await uploadImageBuffer(request.file, { folder: 'promptgrid/profiles', width: 600, height: 600 }) : '';
  const user = await User.create({ ...input, photoURL, passwordHash: await hashPassword(input.password), password: undefined });
  response.status(201).json({ user });
}

export async function login(request, response) {
  const input = loginSchema.parse(request.body);
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new AppError(401, 'Invalid email or password');
  if (user.role !== input.role) throw new AppError(403, `This account is registered as ${user.role}. Select ${user.role} to continue.`);
  await setSession(response, user);
  user.passwordHash = undefined;
  response.json({ user });
}

export async function googleLogin(request, response) {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError(503, 'Google login is not configured');
  const { credential, intent, role } = googleSchema.parse(request.body);
  const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) throw new AppError(401, 'Google account email is not verified');
  const user = await resolveGoogleAccount({
    profile: { subject: payload.sub, email: payload.email, name: payload.name, photoURL: payload.picture },
    intent,
    role,
    UserModel: User,
  });
  await setSession(response, user);
  response.json({ user });
}

export async function refresh(request, response) {
  try {
    const rotated = await rotateRefreshSession(request.cookies[REFRESH_COOKIE_NAME]);
    const user = await User.findById(rotated.session.user);
    if (!user) throw new AppError(401, 'Account no longer exists.');
    response.cookie(ACCESS_COOKIE_NAME, signToken(user, env.JWT_SECRET, rotated.session._id), cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS));
    response.cookie(REFRESH_COOKIE_NAME, rotated.token, cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS));
    response.json({ user });
  } catch (error) {
    clearSessionCookies(response);
    throw error;
  }
}

export const me = (request, response) => response.json({ user: request.user });
export async function logout(request, response) {
  await revokeRefreshSession(request.cookies[REFRESH_COOKIE_NAME]);
  clearSessionCookies(response);
  response.status(204).end();
}
