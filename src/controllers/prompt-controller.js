import { z } from 'zod';
import Bookmark from '../models/Bookmark.js';
import Prompt from '../models/Prompt.js';
import Review from '../models/Review.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { canAccessPromptContent, canManagePrompt, serializePrompt } from '../services/prompt-access.js';
import { buildPromptQuery, normalizePagination, promptSort } from '../services/prompt-query.js';
import { AppError } from '../utils/AppError.js';

const promptSchema = z.object({ title: z.string().trim().min(3).max(160), description: z.string().trim().min(10).max(1200), content: z.string().min(10).max(20000), category: z.string().trim().min(2), aiTool: z.string().trim().min(2), tags: z.array(z.string().trim().min(1)).min(1).max(12), difficulty: z.enum(['Beginner', 'Intermediate', 'Pro']), usageInstructions: z.string().trim().min(10).max(3000), thumbnailURL: z.string().url(), visibility: z.enum(['public', 'private']) });

export async function featured(_request, response) {
  const prompts = await Prompt.find({ status: 'approved' }).sort({ featured: -1, copyCount: -1, averageRating: -1 }).limit(6).populate('creator', 'name photoURL');
  response.json({ prompts: prompts.map((prompt) => serializePrompt(prompt, null)) });
}

export async function listPublic(request, response) {
  const pagination = normalizePagination(request.query);
  const query = buildPromptQuery(request.query);
  const [prompts, total, categories, tools] = await Promise.all([
    Prompt.find(query).sort(promptSort(request.query.sort)).skip(pagination.skip).limit(pagination.limit).populate('creator', 'name photoURL'),
    Prompt.countDocuments(query),
    Prompt.distinct('category', { status: 'approved', visibility: 'public' }),
    Prompt.distinct('aiTool', { status: 'approved', visibility: 'public' }),
  ]);
  response.json({ prompts: prompts.map((prompt) => serializePrompt(prompt, null)), filters: { categories, tools, difficulties: ['Beginner', 'Intermediate', 'Pro'] }, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.max(1, Math.ceil(total / pagination.limit)) } });
}

export async function details(request, response) {
  const prompt = await Prompt.findById(request.params.id).populate('creator', 'name photoURL role');
  if (!prompt || (prompt.status !== 'approved' && !canManagePrompt(request.user, prompt))) throw new AppError(404, 'Prompt not found');
  const [reviews, bookmarked] = await Promise.all([Review.find({ prompt: prompt._id }).sort({ createdAt: -1 }).populate('user', 'name email photoURL'), Bookmark.exists({ user: request.user._id, prompt: prompt._id })]);
  response.json({ prompt: serializePrompt(prompt, request.user), reviews, bookmarked: Boolean(bookmarked) });
}

export async function create(request, response) {
  const input = promptSchema.parse(request.body);
  if (request.user.subscription === 'free' && await Prompt.countDocuments({ creator: request.user._id }) >= 3) throw new AppError(403, 'Free users can publish up to 3 prompts');
  const prompt = await Prompt.create({ ...input, creator: request.user._id, copyCount: 0, status: 'pending', featured: false });
  response.status(201).json({ prompt });
}

export async function update(request, response) {
  const prompt = await Prompt.findById(request.params.id);
  if (!prompt) throw new AppError(404, 'Prompt not found');
  if (!canManagePrompt(request.user, prompt)) throw new AppError(403, 'Only the creator or an admin can update this prompt');
  const input = promptSchema.partial().parse(request.body);
  Object.assign(prompt, input);
  if (request.user.role !== 'admin') { prompt.status = 'pending'; prompt.featured = false; prompt.rejectionFeedback = ''; }
  await prompt.save();
  response.json({ prompt });
}

export async function remove(request, response) {
  const prompt = await Prompt.findById(request.params.id);
  if (!prompt) throw new AppError(404, 'Prompt not found');
  if (!canManagePrompt(request.user, prompt)) throw new AppError(403, 'Only the creator or an admin can delete this prompt');
  await Promise.all([prompt.deleteOne(), Bookmark.deleteMany({ prompt: prompt._id }), Review.deleteMany({ prompt: prompt._id }), Report.deleteMany({ prompt: prompt._id })]);
  response.status(204).end();
}

export async function copy(request, response) {
  const prompt = await Prompt.findById(request.params.id);
  if (!prompt || prompt.status !== 'approved') throw new AppError(404, 'Prompt not found');
  if (!canAccessPromptContent(request.user, prompt)) throw new AppError(403, 'Premium access is required');
  const updated = await Prompt.findByIdAndUpdate(prompt._id, { $inc: { copyCount: 1 } }, { returnDocument: 'after' });
  response.json({ content: prompt.content, copyCount: updated.copyCount });
}

export async function home(_request, response) {
  const [featuredPrompts, topCreators, reviews, categories, totals] = await Promise.all([
    Prompt.find({ status: 'approved' }).sort({ featured: -1, copyCount: -1 }).limit(6).populate('creator', 'name photoURL'),
    Prompt.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$creator', prompts: { $sum: 1 }, copies: { $sum: '$copyCount' }, rating: { $avg: '$averageRating' } } }, { $sort: { copies: -1 } }, { $limit: 4 }, { $lookup: { from: User.collection.name, localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { prompts: 1, copies: 1, rating: 1, user: { _id: 1, name: 1, photoURL: 1 } } }]),
    Review.find().sort({ createdAt: -1 }).limit(4).populate('user', 'name photoURL').populate('prompt', 'title'),
    Prompt.distinct('category', { status: 'approved', visibility: 'public' }),
    Prompt.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, copies: { $sum: '$copyCount' }, prompts: { $sum: 1 } } }]),
  ]);
  response.json({ featured: featuredPrompts.map((prompt) => serializePrompt(prompt, null)), topCreators, reviews, categories, totals: totals[0] || { copies: 0, prompts: 0 } });
}
