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
  signMfaChallenge,
  signToken,
  verifyToken,
  verifyPassword,
} from '../services/auth-service.js';
import {
  resolveGoogleAccount,
  shouldCreateGoogleSession,
} from '../services/google-account.js';
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
  mfaCodeSchema,
  mfaLoginSchema,
  registerSchema,
} from '../validators/auth-input.js';
import {
  consumeRecoveryCode,
  createMfaSetup,
  createRecoveryCodes,
  decryptMfaSecret,
  hashRecoveryCodes,
  verifyMfaCode,
} from '../services/mfa-service.js';

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

function mfaChallengeResponse(user) {
  return {
    mfaRequired: true,
    challengeToken: signMfaChallenge(user, env.JWT_SECRET),
  };
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

  if (user.mfaEnabled) {
    return response.json(mfaChallengeResponse(user));
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
    accessToken,
    intent,
    role,
  } = googleSchema.parse(request.body);

  // Verify the popup OAuth token belongs to this web client before using it.
  const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const tokenInfo = await googleClient.getTokenInfo(accessToken);
  if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw new AppError(401, 'Google token was issued for another application');
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileResponse.ok) {
    throw new AppError(401, 'Unable to verify Google account');
  }
  const payload = await profileResponse.json();

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

  if (shouldCreateGoogleSession(intent)) {
    if (user.mfaEnabled) return response.json(mfaChallengeResponse(user));
    await setSession(response, user);
  }

  response.json({
    user,
  });
}

// Completes a password or Google login after the MFA challenge is verified
export async function verifyMfaLogin(request, response) {
  const input = mfaLoginSchema.parse(request.body);
  let challenge;

  try {
    challenge = verifyToken(input.challengeToken, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Your MFA challenge has expired. Please log in again.');
  }

  if (challenge.purpose !== 'mfa') {
    throw new AppError(401, 'Invalid MFA challenge');
  }

  const user = await User.findById(challenge.sub)
    .select('+mfaSecretEncrypted +mfaRecoveryCodeHashes');

  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
    throw new AppError(401, 'MFA is not enabled for this account');
  }

  const secret = decryptMfaSecret(user.mfaSecretEncrypted);
  const validCode = input.code
    ? await verifyMfaCode(secret, input.code)
    : await consumeRecoveryCode(user, input.recoveryCode);

  if (!validCode) throw new AppError(401, 'Invalid MFA code');

  await setSession(response, user);
  response.json({ user });
}

// Returns MFA status for the authenticated user
export async function mfaStatus(request, response) {
  const user = await User.findById(request.user._id)
    .select('+mfaRecoveryCodeHashes');

  response.json({
    enabled: Boolean(user?.mfaEnabled),
    recoveryCodesRemaining: user?.mfaRecoveryCodeHashes?.length || 0,
  });
}

// Creates a pending authenticator setup and returns a QR code
export async function setupMfa(request, response) {
  if (request.user.mfaEnabled) throw new AppError(409, 'MFA is already enabled');

  const setup = await createMfaSetup(request.user.email);
  await User.findByIdAndUpdate(request.user._id, {
    mfaSecretEncrypted: setup.secretEncrypted,
    mfaRecoveryCodeHashes: [],
  });

  response.json({
    qrCode: setup.qrCode,
    manualSecret: setup.secret,
  });
}

// Verifies the first authenticator code and enables MFA
export async function enableMfa(request, response) {
  const { code } = mfaCodeSchema.parse(request.body);
  const user = await User.findById(request.user._id)
    .select('+mfaSecretEncrypted +mfaRecoveryCodeHashes');

  if (!user?.mfaSecretEncrypted) throw new AppError(400, 'Start MFA setup first');
  if (user.mfaEnabled) throw new AppError(409, 'MFA is already enabled');

  const secret = decryptMfaSecret(user.mfaSecretEncrypted);
  if (!code || !(await verifyMfaCode(secret, code))) {
    throw new AppError(401, 'Invalid authenticator code');
  }

  const recoveryCodes = createRecoveryCodes();
  user.mfaEnabled = true;
  user.mfaRecoveryCodeHashes = await hashRecoveryCodes(recoveryCodes);
  await user.save();

  response.json({
    enabled: true,
    recoveryCodes,
  });
}

// Disables MFA after verifying the current authenticator or recovery code
export async function disableMfa(request, response) {
  const input = mfaCodeSchema.parse(request.body);
  const user = await User.findById(request.user._id)
    .select('+mfaSecretEncrypted +mfaRecoveryCodeHashes');

  if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
    throw new AppError(400, 'MFA is not enabled');
  }

  const secret = decryptMfaSecret(user.mfaSecretEncrypted);
  const valid = input.code
    ? await verifyMfaCode(secret, input.code)
    : await consumeRecoveryCode(user, input.recoveryCode);

  if (!valid) throw new AppError(401, 'Invalid MFA code');

  user.mfaEnabled = false;
  user.mfaSecretEncrypted = undefined;
  user.mfaRecoveryCodeHashes = [];
  await user.save();

  response.json({ enabled: false });
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
