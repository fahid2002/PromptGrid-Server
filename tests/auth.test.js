import { describe, expect, it } from 'vitest';
import { ACCESS_SESSION_MS, cookieOptions, normalizeRegistration, signToken, verifyToken } from '../src/services/auth-service.js';
import { googleSchema, loginSchema, registerSchema } from '../src/validators/auth-input.js';

describe('authentication defaults', () => {
  it('accepts only public user and creator registration roles', () => {
    expect(registerSchema.parse({ name: 'Account User', email: 'a@example.com', password: '12345678', role: 'user' }).role).toBe('user');
    expect(registerSchema.parse({ name: 'Account Creator', email: 'b@example.com', password: '12345678', role: 'creator' }).role).toBe('creator');
    expect(() => registerSchema.parse({ name: 'Not Admin', email: 'c@example.com', password: '12345678', role: 'admin' })).toThrow();
  });

  it('defaults registration to user and preserves a validated creator role', () => {
    expect(normalizeRegistration({ name: 'A Name', email: 'A@EXAMPLE.COM', password: '12345678' })).toMatchObject({ email: 'a@example.com', role: 'user', subscription: 'free' });
    expect(normalizeRegistration({ name: 'Creator', email: 'C@EXAMPLE.COM', password: '12345678', role: 'creator' })).toMatchObject({ email: 'c@example.com', role: 'creator', subscription: 'free' });
  });

  it('requires an explicit Google register or login intent', () => {
    expect(googleSchema.parse({ accessToken: 'token', intent: 'register', role: 'creator' })).toMatchObject({ intent: 'register', role: 'creator' });
    expect(googleSchema.parse({ accessToken: 'token', intent: 'login' })).toMatchObject({ intent: 'login', role: 'user' });
    expect(() => googleSchema.parse({ accessToken: 'token', intent: 'admin', role: 'admin' })).toThrow();
  });

  it('requires a selected login role including admin', () => {
    expect(loginSchema.parse({ email: 'admin@example.com', password: 'secret', role: 'admin' }).role).toBe('admin');
    expect(loginSchema.parse({ email: 'user@example.com', password: 'secret' }).role).toBe('user');
  });

  it('uses secure httpOnly production cookies', () => {
    expect(cookieOptions('production', ACCESS_SESSION_MS)).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', maxAge: ACCESS_SESSION_MS });
  });

  it('creates a short-lived access JWT tied to a session', () => {
    const token = signToken({ _id: 'user-id', role: 'user' }, 'a-secret-that-is-at-least-32-characters', 'session-id');
    const payload = verifyToken(token, 'a-secret-that-is-at-least-32-characters');
    expect(payload).toMatchObject({ sub: 'user-id', sid: 'session-id' });
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });
});
