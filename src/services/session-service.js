import { createHash, randomBytes, randomUUID } from 'node:crypto';
import Session from '../models/Session.js';
import { AppError } from '../utils/AppError.js';

export const REFRESH_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');
const newRefreshToken = () => randomBytes(32).toString('hex');

export async function createRefreshSession({ userId, familyId = randomUUID(), SessionModel = Session }) {
  const token = newRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const session = await SessionModel.create({ user: userId, tokenHash, familyId, expiresAt: new Date(Date.now() + REFRESH_SESSION_MS) });
  return { token, session };
}

export async function rotateRefreshSession(token, { SessionModel = Session } = {}) {
  if (!token) throw new AppError(401, 'Your session has expired. Please log in again.');
  const tokenHash = hashRefreshToken(token);
  const current = await SessionModel.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'before' },
  );
  if (!current) throw new AppError(401, 'Your session has expired or was already used. Please log in again.');
  const rotated = await createRefreshSession({ userId: current.user, familyId: current.familyId, SessionModel });
  await SessionModel.updateOne({ _id: current._id }, { $set: { replacedByTokenHash: rotated.session.tokenHash } });
  return rotated;
}

export async function revokeRefreshSession(token, { SessionModel = Session } = {}) {
  if (!token) return false;
  const result = await SessionModel.updateOne({ tokenHash: hashRefreshToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount === 1;
}
