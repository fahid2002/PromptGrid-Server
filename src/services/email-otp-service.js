import { randomInt } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from './auth-service.js';
import { sendVerificationEmail } from './email-service.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function issueEmailOtp(user, purpose) {
  const now = Date.now();
  if (user.emailOtpLastSentAt && now - user.emailOtpLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError(429, 'Please wait before requesting another email code');
  }

  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  user.emailOtpHash = await hashPassword(code);
  user.emailOtpExpiresAt = new Date(now + OTP_TTL_MS);
  user.emailOtpAttempts = 0;
  user.emailOtpPurpose = purpose;
  user.emailOtpLastSentAt = new Date(now);
  await user.save();
  await sendVerificationEmail({ to: user.email, code, purpose });
}

export async function consumeEmailOtp(user, code, purpose) {
  if (!user.emailOtpHash || user.emailOtpPurpose !== purpose || !user.emailOtpExpiresAt) return false;
  if (user.emailOtpExpiresAt.getTime() < Date.now() || user.emailOtpAttempts >= MAX_ATTEMPTS) return false;

  user.emailOtpAttempts += 1;
  const valid = await verifyPassword(code, user.emailOtpHash);
  if (!valid) {
    await user.save();
    return false;
  }

  user.emailOtpHash = undefined;
  user.emailOtpExpiresAt = undefined;
  user.emailOtpAttempts = 0;
  user.emailOtpPurpose = undefined;
  user.emailOtpLastSentAt = undefined;
  await user.save();
  return true;
}
