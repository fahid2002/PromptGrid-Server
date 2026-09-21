import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from './auth-service.js';
import { AppError } from '../utils/AppError.js';

const ISSUER = 'PromptGrid';
const RECOVERY_CODE_COUNT = 8;

function encryptionKey() {
  if (!env.MFA_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY)) {
    throw new AppError(503, 'MFA encryption is not configured on the server');
  }

  return Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');
}

export function encryptMfaSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptMfaSecret(value) {
  try {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new AppError(503, 'Stored MFA configuration could not be read');
  }
}

export async function createMfaSetup(email) {
  const secret = generateSecret();
  const uri = generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });

  return {
    secret,
    secretEncrypted: encryptMfaSecret(secret),
    qrCode: await QRCode.toDataURL(uri),
  };
}

export async function verifyMfaCode(secret, token) {
  try {
    const result = await verify({ secret, token: token.replace(/\s/g, '') });
    return result.valid;
  } catch {
    return false;
  }
}

export function createRecoveryCodes() {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(5).toString('hex').toUpperCase()
  );
}

export async function hashRecoveryCodes(codes) {
  return Promise.all(codes.map((code) => hashPassword(code)));
}

export async function consumeRecoveryCode(user, code) {
  const normalized = code.trim().toUpperCase();
  const index = await Promise.all(
    user.mfaRecoveryCodeHashes.map((hash, hashIndex) =>
      verifyPassword(normalized, hash).then((valid) => (valid ? hashIndex : -1))
    )
  );
  const matchedIndex = index.find((value) => value >= 0);

  if (matchedIndex === undefined) return false;

  user.mfaRecoveryCodeHashes.splice(matchedIndex, 1);
  await user.save();
  return true;
}

export function hashChallengeValue(value) {
  return createHash('sha256').update(value).digest('hex');
}
