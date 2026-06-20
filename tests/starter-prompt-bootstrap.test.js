import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as promptQuery from '../src/services/prompt-query.js';

async function loadBootstrapModule() {
  try {
    return await import('../src/services/starter-prompt-bootstrap.js');
  } catch {
    return {};
  }
}

describe('starter prompt bootstrap', () => {
  it('stores ten approved public prompts without placeholder creator IDs', () => {
    const prompts = JSON.parse(readFileSync(resolve('src/data/starter-prompts.json'), 'utf8'));
    expect(prompts).toHaveLength(10);
    expect(prompts.every((prompt) => prompt.status === 'approved' && prompt.visibility === 'public')).toBe(true);
    expect(prompts.every((prompt) => !('creator' in prompt))).toBe(true);
  });

  it('builds idempotent upserts owned by the database creator', async () => {
    const bootstrap = await loadBootstrapModule();
    const operations = bootstrap.buildStarterPromptOperations?.([{ title: 'One', copyCount: 99, featured: true }], 'creator-id');
    expect(operations).toEqual([expect.objectContaining({
      updateOne: expect.objectContaining({
        filter: { title: 'One', creator: 'creator-id' },
        update: {
          $set: expect.objectContaining({ creator: 'creator-id', status: 'approved', visibility: 'public', featured: false }),
          $setOnInsert: { copyCount: 0, averageRating: 0, reviewCount: 0 },
        },
        upsert: true,
      }),
    })]);
  });

  it('ranks featured prompts automatically by real copy count', () => {
    expect(promptQuery.featuredPromptSort?.()).toEqual({ copyCount: -1, averageRating: -1, createdAt: -1 });
  });

  it('provides a prompt seed command', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    expect(pkg.scripts['seed:prompts']).toBe('node scripts/seed-prompts.js');
  });
});
