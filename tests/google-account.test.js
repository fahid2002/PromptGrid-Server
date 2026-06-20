import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { resolveGoogleAccount } from '../src/services/google-account.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Google account intent', () => {
  const creatorProfile = { subject: 'google-creator', email: 'creator@gmail.com', name: 'Google Creator', photoURL: 'https://example.com/photo.jpg' };

  it('registers an unknown verified email with the selected public role', async () => {
    const user = await resolveGoogleAccount({ profile: creatorProfile, intent: 'register', role: 'creator', UserModel: User });
    expect(user).toMatchObject({ email: 'creator@gmail.com', role: 'creator', subscription: 'free' });
  });

  it('rejects duplicate registration and unknown login with meaningful errors', async () => {
    await expect(resolveGoogleAccount({ profile: creatorProfile, intent: 'register', role: 'user', UserModel: User })).rejects.toMatchObject({ status: 409 });
    await expect(resolveGoogleAccount({ profile: { ...creatorProfile, email: 'missing@gmail.com' }, intent: 'login', role: 'user', UserModel: User })).rejects.toMatchObject({ status: 404 });
  });

  it('logs in an existing email without changing its role', async () => {
    const user = await resolveGoogleAccount({ profile: { ...creatorProfile, name: 'Updated Google Name' }, intent: 'login', role: 'creator', UserModel: User });
    expect(user).toMatchObject({ name: 'Updated Google Name', role: 'creator' });
  });

  it('rejects the wrong selected role and password-only accounts', async () => {
    await expect(resolveGoogleAccount({ profile: creatorProfile, intent: 'login', role: 'user', UserModel: User })).rejects.toMatchObject({ status: 403 });
    await User.create({ name: 'Password User', email: 'password@gmail.com', role: 'user', subscription: 'free' });
    await expect(resolveGoogleAccount({ profile: { ...creatorProfile, subject: 'password-google', email: 'password@gmail.com' }, intent: 'login', role: 'user', UserModel: User })).rejects.toMatchObject({ status: 401 });
  });
});
