import { describe, expect, it } from 'vitest';
import { buildPromptQuery, normalizePagination } from '../src/services/prompt-query.js';

describe('normalizePagination', () => {
  it('clamps invalid page and limit values', () => {
    expect(normalizePagination({ page: '-4', limit: '500' })).toEqual({
      page: 1,
      limit: 24,
      skip: 0,
    });
  });

  it('calculates the skip for a valid page', () => {
    expect(normalizePagination({ page: '3', limit: '6' })).toEqual({
      page: 3,
      limit: 6,
      skip: 12,
    });
  });
});

describe('buildPromptQuery', () => {
  it('returns all approved prompts when visibility is not selected', () => {
    expect(buildPromptQuery({ search: 'react', tool: 'Claude' })).toEqual({
      status: 'approved',
      aiTool: 'Claude',
      $text: { $search: 'react' },
    });
  });

  it('filters public prompts when visibility is public', () => {
    expect(buildPromptQuery({ visibility: 'public' })).toEqual({
      status: 'approved',
      visibility: 'public',
    });
  });

  it('filters private prompts when visibility is private', () => {
    expect(buildPromptQuery({ visibility: 'private' })).toEqual({
      status: 'approved',
      visibility: 'private',
    });
  });
});