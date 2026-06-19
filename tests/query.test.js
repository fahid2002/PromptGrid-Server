import { describe, expect, it } from 'vitest';
import { buildPromptQuery, normalizePagination } from '../src/services/prompt-query.js';

describe('normalizePagination', () => {
  it('clamps invalid page and limit values', () => {
    expect(normalizePagination({ page: '-4', limit: '500' })).toEqual({ page: 1, limit: 24, skip: 0 });
  });

  it('calculates the skip for a valid page', () => {
    expect(normalizePagination({ page: '3', limit: '6' })).toEqual({ page: 3, limit: 6, skip: 12 });
  });
});

describe('buildPromptQuery', () => {
  it('always limits the public marketplace to approved public prompts', () => {
    expect(buildPromptQuery({ search: 'react', tool: 'Claude' })).toEqual({
      status: 'approved',
      visibility: 'public',
      aiTool: 'Claude',
      $text: { $search: 'react' },
    });
  });
});
