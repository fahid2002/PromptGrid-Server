import { describe, expect, it } from 'vitest';
import { cookieOptions, normalizeRegistration } from '../src/services/auth-service.js';

describe('authentication defaults', () => {
  it('never accepts a client supplied privileged role', () => {
    expect(normalizeRegistration({ name: 'A', email: 'A@EXAMPLE.COM', password: '12345678', role: 'admin' })).toMatchObject({
      email: 'a@example.com', role: 'user', subscription: 'free',
    });
  });

  it('uses secure httpOnly production cookies', () => {
    expect(cookieOptions('production')).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' });
  });
});
