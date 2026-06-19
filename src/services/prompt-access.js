export function canAccessPromptContent(user, prompt) {
  return prompt.visibility === 'public' || user?.subscription === 'premium' || user?.role === 'admin';
}

export function serializePrompt(prompt, user) {
  const value = typeof prompt.toObject === 'function' ? prompt.toObject() : { ...prompt };
  const locked = !canAccessPromptContent(user, value);
  return { ...value, content: locked ? null : value.content, locked };
}

export function canManagePrompt(user, prompt) {
  const creatorId = String(prompt.creator?._id ?? prompt.creator);
  return Boolean(user && (user.role === 'admin' || creatorId === String(user._id)));
}
