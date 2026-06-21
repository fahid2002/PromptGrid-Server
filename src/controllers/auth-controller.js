import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import User from '../models/User.js';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_SESSION_MS,
  cookieOptions,
  hashPassword,
  normalizeRegistration,
  REFRESH_COOKIE_NAME,
  REFRESH_SESSION_MS,
  signToken,
  verifyPassword,
} from '../services/auth-service.js';
import { resolveGoogleAccount } from '../services/google-account.js';
import { storeImage } from '../services/gridfs-image.js';
import {
  createRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
} from '../services/session-service.js';
import { AppError } from '../utils/AppError.js';
import {
  googleSchema,
  loginSchema,
  registerSchema,
} from '../validators/auth-input.js';

// Clears all authentication cookies from the response
function clearSessionCookies(response) {
  response.clearCookie(ACCESS_COOKIE_NAME, {
    ...cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS),
    maxAge: undefined,
  });

  response.clearCookie(REFRESH_COOKIE_NAME, {
    ...cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS),
    maxAge: undefined,
  });

  response.clearCookie('promptgrid_token', {
    ...cookieOptions(env.NODE_ENV),
    maxAge: undefined,
  });
}

// Creates refresh session and sets access/refresh cookies
async function setSession(response, user) {
  const refresh = await createRefreshSession({
    userId: user._id,
  });

  response.cookie(
    ACCESS_COOKIE_NAME,
    signToken(user, env.JWT_SECRET, refresh.session._id),
    cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS)
  );

  response.cookie(
    REFRESH_COOKIE_NAME,
    refresh.token,
    cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS)
  );
}

// Registers a new user account
export async function register(request, response) {
  const input = normalizeRegistration(registerSchema.parse(request.body));

  // Prevent duplicate email registration
  if (await User.exists({ email: input.email })) {
    throw new AppError(409, 'An account already exists for this email');
  }

  // Store uploaded profile image if available
  const photoURL = request.file ? (await storeImage(request.file)).url : '';

  // Create user with hashed password
  const user = await User.create({
    ...input,
    photoURL,
    passwordHash: await hashPassword(input.password),
    password: undefined,
  });

  response.status(201).json({
    user,
  });
}

// Logs in user with email, password and selected role
export async function login(request, response) {
  const input = loginSchema.parse(request.body);

  const user = await User
    .findOne({
      email: input.email.toLowerCase(),
    })
    .select('+passwordHash');

  // Check password validity
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }

  // Make sure selected role matches actual account role
  if (user.role !== input.role) {
    throw new AppError(
      403,
      `This account is registered as ${user.role}. Select ${user.role} to continue.`
    );
  }

  await setSession(response, user);

  // Remove password hash before sending user data
  user.passwordHash = undefined;

  response.json({
    user,
  });
}

// Logs in or registers user using Google OAuth
export async function googleLogin(request, response) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(503, 'Google login is not configured');
  }

  const {
    credential,
    intent,
    role,
  } = googleSchema.parse(request.body);

  // Verify Google credential token
  const ticket = await new OAuth2Client(env.GOOGLE_CLIENT_ID).verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  // Require verified Google email
  if (!payload?.email || !payload.email_verified) {
    throw new AppError(401, 'Google account email is not verified');
  }

  // Resolve existing or new Google account
  const user = await resolveGoogleAccount({
    profile: {
      subject: payload.sub,
      email: payload.email,
      name: payload.name,
      photoURL: payload.picture,
    },
    intent,
    role,
    UserModel: User,
  });

  await setSession(response, user);

  response.json({
    user,
  });
}

// Refreshes access token using refresh token session
export async function refresh(request, response) {
  try {
    const rotated = await rotateRefreshSession(
      request.cookies[REFRESH_COOKIE_NAME]
    );

    const user = await User.findById(rotated.session.user);

    if (!user) {
      throw new AppError(401, 'Account no longer exists.');
    }

    response.cookie(
      ACCESS_COOKIE_NAME,
      signToken(user, env.JWT_SECRET, rotated.session._id),
      cookieOptions(env.NODE_ENV, ACCESS_SESSION_MS)
    );

    response.cookie(
      REFRESH_COOKIE_NAME,
      rotated.token,
      cookieOptions(env.NODE_ENV, REFRESH_SESSION_MS)
    );

    response.json({
      user,
    });
  } catch (error) {
    clearSessionCookies(response);

    throw error;
  }
}

// Returns currently authenticated user
export const me = (request, response) =>
  response.json({
    user: request.user,
  });

// Logs out user and clears session cookies
export async function logout(request, response) {
  await revokeRefreshSession(request.cookies[REFRESH_COOKIE_NAME]);

  clearSessionCookies(response);

  response.status(204).end();
}