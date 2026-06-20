import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';

let mongo;
let app;
let Prompt;
let User;
let firstPromptId;
const promptInput = (title, visibility = 'public') => ({
  title,
  description: 'A complete description for this tested AI prompt.',
  content: 'Act as a specialist and produce a detailed result for the supplied input.',
  category: 'Coding',
  aiTool: 'Claude',
  tags: ['coding', 'review'],
  difficulty: 'Intermediate',
  usageInstructions: 'Replace the supplied input, then paste the prompt into Claude.',
  thumbnailURL: 'https://example.com/prompt.png',
  visibility,
});

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY = 'sk_test_integration';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_integration';
  ({ app } = await import('../src/app.js'));
  ({ default: Prompt } = await import('../src/models/Prompt.js'));
  ({ default: User } = await import('../src/models/User.js'));
  await mongoose.connect(process.env.MONGODB_URI);
}, 180000);

afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

describe('authenticated marketplace flow', () => {
  it('registers user and creator roles while rejecting duplicates and admin registration', async () => {
    const user = await request(app).post('/api/auth/register').field('name', 'Public User').field('email', 'public@example.com').field('password', 'securepass123').field('role', 'user').expect(201);
    expect(user.body.user).toMatchObject({ email: 'public@example.com', role: 'user', subscription: 'free' });

    const creator = await request(app).post('/api/auth/register').field('name', 'Public Creator').field('email', 'creator@example.com').field('password', 'securepass123').field('role', 'creator').expect(201);
    expect(creator.body.user).toMatchObject({ email: 'creator@example.com', role: 'creator', subscription: 'free' });
    await request(app).post('/api/auth/login').send({ email: 'creator@example.com', password: 'securepass123', role: 'user' }).expect(403);
    await request(app).post('/api/auth/login').send({ email: 'creator@example.com', password: 'securepass123', role: 'creator' }).expect(200);

    await request(app).post('/api/auth/register').field('name', 'Duplicate Creator').field('email', 'creator@example.com').field('password', 'securepass123').field('role', 'creator').expect(409);
    await request(app).post('/api/auth/register').field('name', 'Blocked Admin').field('email', 'blocked-admin@example.com').field('password', 'securepass123').field('role', 'admin').expect(400);
    await request(app).post('/api/auth/register').field('name', 'Invalid Photo').field('email', 'invalid-photo@example.com').field('password', 'securepass123').field('role', 'user').attach('image', Buffer.from('not an image'), { filename: 'profile.txt', contentType: 'text/plain' }).expect(400);
    await request(app).post('/api/auth/register').field('name', 'Large Photo').field('email', 'large-photo@example.com').field('password', 'securepass123').field('role', 'user').attach('image', Buffer.alloc((5 * 1024 * 1024) + 1), { filename: 'profile.png', contentType: 'image/png' }).expect(413);
    const withPhoto = await request(app).post('/api/auth/register').field('name', 'Photo User').field('email', 'photo@example.com').field('password', 'securepass123').field('role', 'user').attach('image', Buffer.from('89504e470d0a1a0a', 'hex'), { filename: 'profile.png', contentType: 'image/png' }).expect(201);
    expect(withPhoto.body.user.photoURL).toMatch(/^\/api\/images\/[a-f\d]{24}$/);
    await request(app).get(withPhoto.body.user.photoURL).expect(200).expect('Content-Type', /image\/png/);
  });

  it('registers, logs in by cookie, enforces the free limit, and protects premium content', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: 'Course User', email: 'course@example.com', password: 'securepass123', photoURL: '' }).expect(201);
    const login = await agent.post('/api/auth/login').send({ email: 'course@example.com', password: 'securepass123', role: 'user' }).expect(200);
    expect(login.headers['set-cookie'].join(';')).toContain('promptgrid_access=');
    expect(login.headers['set-cookie'].join(';')).toContain('promptgrid_refresh=');

    const first = await agent.post('/api/prompts').send(promptInput('Private Workflow Prompt', 'private')).expect(201);
    firstPromptId = first.body.prompt._id;
    expect(first.body.prompt).toMatchObject({ status: 'pending', copyCount: 0, featured: false });
    await agent.post('/api/prompts').send(promptInput('Second Tested Prompt')).expect(201);
    await agent.post('/api/prompts').send(promptInput('Third Tested Prompt')).expect(201);
    await agent.post('/api/prompts').send(promptInput('Fourth Tested Prompt')).expect(403);

    await Prompt.findByIdAndUpdate(first.body.prompt._id, { status: 'approved' });
    const locked = await agent.get(`/api/prompts/${first.body.prompt._id}`).expect(200);
    expect(locked.body.prompt).toMatchObject({ locked: true, content: null });
    await agent.post(`/api/prompts/${first.body.prompt._id}/copy`).expect(403);

    await User.findOneAndUpdate({ email: 'course@example.com' }, { subscription: 'premium' });
    const unlocked = await agent.get(`/api/prompts/${first.body.prompt._id}`).expect(200);
    expect(unlocked.body.prompt.locked).toBe(false);
    expect(unlocked.body.prompt.content).toContain('Act as a specialist');

    const bookmark = await agent.put(`/api/prompts/${first.body.prompt._id}/bookmark`).expect(200);
    expect(bookmark.body.bookmarked).toBe(true);
    const removed = await agent.put(`/api/prompts/${first.body.prompt._id}/bookmark`).expect(200);
    expect(removed.body.bookmarked).toBe(false);
    await agent.post(`/api/prompts/${first.body.prompt._id}/reviews`).send({ rating: 5, comment: 'This prompt works well.' }).expect(201);
    await agent.post(`/api/prompts/${first.body.prompt._id}/reports`).send({ reason: 'Spam', description: 'Testing moderation flow.' }).expect(201);
    await agent.post('/api/auth/refresh').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.post('/api/auth/refresh').expect(401);
  }, 30000);

  it('lets an admin change roles, moderate prompts, inspect pagination, and warn a creator', async () => {
    await User.create({ name: 'Course Admin', email: 'admin@example.com', passwordHash: await bcrypt.hash('adminpass123', 12), role: 'admin', subscription: 'premium' });
    const admin = request.agent(app);
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: 'adminpass123', role: 'admin' }).expect(200);
    const users = await admin.get('/api/dashboard/admin/users').expect(200);
    const courseUser = users.body.users.find((user) => user.email === 'course@example.com');
    await admin.patch(`/api/dashboard/admin/users/${courseUser._id}/role`).send({ role: 'creator' }).expect(200);
    await admin.patch(`/api/dashboard/admin/prompts/${firstPromptId}/moderate`).send({ action: 'approve' }).expect(200);
    await admin.patch(`/api/dashboard/admin/prompts/${firstPromptId}/moderate`).send({ action: 'feature' }).expect(200);
    const prompts = await admin.get('/api/dashboard/admin/prompts?page=1&limit=2').expect(200);
    expect(prompts.body.pagination).toMatchObject({ page: 1, limit: 2, pages: 2 });
    const reports = await admin.get('/api/dashboard/admin/reports').expect(200);
    await admin.patch(`/api/dashboard/admin/reports/${reports.body.reports[0]._id}`).send({ status: 'warned' }).expect(200);
    const warned = await User.findById(courseUser._id);
    expect(warned.role).toBe('creator');
    expect(warned.warnings).toHaveLength(1);
  }, 30000);

  it('rejects invalid Stripe signatures and accepts a correctly signed event', async () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'payment_intent.created', data: { object: { id: 'pi_test' } } });
    await request(app).post('/api/payments/webhook').set('stripe-signature', 'invalid').set('Content-Type', 'application/json').send(payload).expect(400);
    const stripe = new Stripe('sk_test_signed_event');
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    await request(app).post('/api/payments/webhook').set('stripe-signature', signature).set('Content-Type', 'application/json').send(payload).expect(200);
  });
});
