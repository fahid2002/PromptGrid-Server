import { z } from 'zod';
import Bookmark from '../models/Bookmark.js';
import Prompt from '../models/Prompt.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import { canAccessPromptContent } from '../services/prompt-access.js';
import { recordAudit } from '../services/audit-service.js';
import { notify, notifyAdmins } from '../services/notification-service.js';
import { AppError } from '../utils/AppError.js';

export async function toggleBookmark(request, response) {
  const prompt = await Prompt.findOne({ _id: request.params.id, status: 'approved' });
  if (!prompt) throw new AppError(404, 'Prompt not found');
  const existing = await Bookmark.findOneAndDelete({ user: request.user._id, prompt: prompt._id });
  if (existing) return response.json({ bookmarked: false, message: 'Bookmark removed' });
  await Bookmark.create({ user: request.user._id, prompt: prompt._id });
  response.json({ bookmarked: true, message: 'Prompt bookmarked' });
}

export async function review(request, response) {
  const input = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(3).max(1200) }).parse(request.body);
  const prompt = await Prompt.findOne({ _id: request.params.id, status: 'approved' });
  if (!prompt) throw new AppError(404, 'Prompt not found');
  if (!canAccessPromptContent(request.user, prompt)) throw new AppError(403, 'Premium access is required to review this prompt');
  const saved = await Review.findOneAndUpdate({ user: request.user._id, prompt: prompt._id }, input, { upsert: true, returnDocument: 'after', runValidators: true });
  const [rating] = await Review.aggregate([{ $match: { prompt: prompt._id } }, { $group: { _id: '$prompt', average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  await Prompt.findByIdAndUpdate(prompt._id, { averageRating: rating?.average || 0, reviewCount: rating?.count || 0 });
  if (String(prompt.creator) !== String(request.user._id)) await notify({ recipient: prompt.creator, recipientRole: 'creator', type: 'review_received', title: 'New prompt review', message: `${request.user.name} reviewed “${prompt.title}”.`, href: `/prompts/${prompt._id}`, relatedPrompt: prompt._id, eventKey: `review:${saved._id}:${saved.updatedAt?.getTime() || Date.now()}` });
  response.status(201).json({ review: saved });
}

export async function report(request, response) {
  const input = z.object({ reason: z.enum(['Inappropriate Content', 'Spam', 'Copyright Violation']), description: z.string().max(1200).optional().default('') }).parse(request.body);
  const prompt = await Prompt.findById(request.params.id).select('title creator');
  if (!prompt) throw new AppError(404, 'Prompt not found');
  const saved = await Report.create({ ...input, prompt: request.params.id, reporter: request.user._id });
  await Promise.all([
    notifyAdmins({ type: 'prompt_reported', title: 'Prompt reported', message: `“${prompt.title}” was reported for ${saved.reason}.`, href: '/dashboard?view=admin-reports', relatedPrompt: prompt._id, relatedReport: saved._id, eventKey: `report:${saved._id}` }),
    recordAudit({ actor: request.user._id, action: 'prompt_reported', targetType: 'report', targetId: saved._id, summary: `Reported prompt: ${prompt.title}`, snapshot: { report: saved.toObject(), prompt: prompt.toObject() } }),
  ]);
  response.status(201).json({ report: saved });
}
