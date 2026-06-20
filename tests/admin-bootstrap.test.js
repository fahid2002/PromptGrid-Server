import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { verifyPassword } from '../src/services/auth-service.js';
import { upsertAdmin } from '../src/services/admin-bootstrap.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 180000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('administrator bootstrap', () => {
  it('creates one premium admin with a bcrypt password hash', async () => {
    await upsertAdmin({ name: 'PromptGrid Admin', email: 'owner@example.com', password: 'first-secure-admin-password', UserModel: User });
    const admin = await User.findOne({ email: 'owner@example.com' }).select('+passwordHash');
    expect(admin).toMatchObject({ role: 'admin', subscription: 'premium' });
    expect(await verifyPassword('first-secure-admin-password', admin.passwordHash)).toBe(true);
  });

  it('updates the configured admin instead of creating a duplicate', async () => {
    await upsertAdmin({ name: 'Updated Admin', email: 'owner@example.com', password: 'second-secure-admin-password', UserModel: User });
    const admins = await User.find({ email: 'owner@example.com' }).select('+passwordHash');
    expect(admins).toHaveLength(1);
    expect(admins[0].name).toBe('Updated Admin');
    expect(await verifyPassword('second-secure-admin-password', admins[0].passwordHash)).toBe(true);
  });
});
