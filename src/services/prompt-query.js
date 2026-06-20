const MAX_LIMIT = 24;

export function normalizePagination({ page = 1, limit = 6 } = {}) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || 6));
  return { page: normalizedPage, limit: normalizedLimit, skip: (normalizedPage - 1) * normalizedLimit };
}

export function buildPromptQuery({ search, category, tool, difficulty } = {}) {
  const query = { status: 'approved', visibility: 'public' };
  if (category) query.category = category;
  if (tool) query.aiTool = tool;
  if (difficulty) query.difficulty = difficulty;
  if (search?.trim()) query.$text = { $search: search.trim() };
  return query;
}

export function promptSort(sort = 'popular') {
  if (sort === 'copied') return { copyCount: -1, createdAt: -1 };
  if (sort === 'latest') return { createdAt: -1 };
  return { averageRating: -1, copyCount: -1, createdAt: -1 };
}

export function featuredPromptSort() {
  return { copyCount: -1, averageRating: -1, createdAt: -1 };
}
