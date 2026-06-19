import { describe, expect, it } from 'vitest';
import { canAccessPromptContent, canManagePrompt, serializePrompt } from '../src/services/prompt-access.js';

const premiumPrompt = { toObject: () => ({ _id: 'p1', title: 'Premium', content: 'secret', visibility: 'private' }) };

describe('premium prompt access', () => {
  it('redacts private content for free users', () => {
    expect(canAccessPromptContent({ subscription: 'free' }, { visibility: 'private' })).toBe(false);
    expect(serializePrompt(premiumPrompt, { subscription: 'free' })).toMatchObject({ content: null, locked: true });
  });

  it('returns private content for premium users', () => {
    expect(serializePrompt(premiumPrompt, { subscription: 'premium' })).toMatchObject({ content: 'secret', locked: false });
  });
});

describe('prompt ownership', () => {
  it('allows the owner and admin but rejects another user', () => {
    const prompt = { creator: 'owner' };
    expect(canManagePrompt({ _id: 'owner', role: 'user' }, prompt)).toBe(true);
    expect(canManagePrompt({ _id: 'admin', role: 'admin' }, prompt)).toBe(true);
    expect(canManagePrompt({ _id: 'other', role: 'creator' }, prompt)).toBe(false);
  });
});
