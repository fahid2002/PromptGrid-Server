import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Session from '../src/models/Session.js';
import { createRefreshSession, hashRefreshToken, revokeRefreshSession, rotateRefreshSession } from '../src/services/session-service.js';

let mongo;
const userId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('rotating refresh sessions', () => {
  it('stores only a hash and rotates a valid refresh token', async () => {
    const created = await createRefreshSession({ userId, SessionModel: Session });
    expect(created.token).toHaveLength(64);
    expect(created.session.tokenHash).toBe(hashRefreshToken(created.token));
    expect(created.session.tokenHash).not.toBe(created.token);

    const rotated = await rotateRefreshSession(created.token, { SessionModel: Session });
    expect(rotated.token).not.toBe(created.token);
    expect(String(rotated.session.user)).toBe(String(userId));
    await expect(rotateRefreshSession(created.token, { SessionModel: Session })).rejects.toMatchObject({ status: 401 });
  });

  it('revokes the current refresh token', async () => {
    const created = await createRefreshSession({ userId, SessionModel: Session });
    expect(await revokeRefreshSession(created.token, { SessionModel: Session })).toBe(true);
    await expect(rotateRefreshSession(created.token, { SessionModel: Session })).rejects.toMatchObject({ status: 401 });
  });
});
