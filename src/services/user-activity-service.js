import UserActivity from '../models/UserActivity.js';

// Stores a personal activity log for the current user.
// This is separate from admin moderation audit history.
export async function recordUserActivity({
  actor,
  action,
  title,
  summary,
  targetType,
  targetId,
  relatedPrompt,
  metadata = {},
}) {
  if (!actor) return null;

  return UserActivity.create({
    actor,
    action,
    title,
    summary,
    targetType,
    targetId,
    relatedPrompt,
    metadata,
  });
}