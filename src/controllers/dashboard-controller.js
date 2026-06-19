import { z } from 'zod';
import Bookmark from '../models/Bookmark.js';
import Payment from '../models/Payment.js';
import Prompt from '../models/Prompt.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { normalizePagination } from '../services/prompt-query.js';
import { AppError } from '../utils/AppError.js';

export async function myDashboard(request, response) {
  const userId = request.user._id;
  const [promptCount, bookmarks, reviews] = await Promise.all([Prompt.countDocuments({ creator: userId }), Bookmark.countDocuments({ user: userId }), Review.countDocuments({ user: userId })]);
  response.json({ stats: { prompts: promptCount, bookmarks, reviews, subscription: request.user.subscription }, user: request.user });
}

export async function myPrompts(request, response) { response.json({ prompts: await Prompt.find({ creator: request.user._id }).sort({ createdAt: -1 }) }); }
export async function myBookmarks(request, response) { response.json({ bookmarks: await Bookmark.find({ user: request.user._id }).sort({ createdAt: -1 }).populate({ path: 'prompt', populate: { path: 'creator', select: 'name photoURL' } }) }); }
export async function myReviews(request, response) { response.json({ reviews: await Review.find({ user: request.user._id }).sort({ createdAt: -1 }).populate('prompt', 'title') }); }

export async function creatorAnalytics(request, response) {
  const creator = request.user._id;
  const [summary, prompts, growth] = await Promise.all([
    Prompt.aggregate([{ $match: { creator } }, { $group: { _id: null, prompts: { $sum: 1 }, copies: { $sum: '$copyCount' } } }]),
    Prompt.aggregate([{ $match: { creator } }, { $lookup: { from: Bookmark.collection.name, localField: '_id', foreignField: 'prompt', as: 'bookmarks' } }, { $project: { title: 1, copies: '$copyCount', bookmarks: { $size: '$bookmarks' }, createdAt: 1 } }, { $sort: { copies: -1 } }]),
    Prompt.aggregate([{ $match: { creator } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, prompts: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
  ]);
  response.json({ summary: { ...(summary[0] || { prompts: 0, copies: 0 }), bookmarks: prompts.reduce((total, item) => total + item.bookmarks, 0) }, prompts, growth });
}

export async function promptAnalytics(request, response) {
  const prompt = await Prompt.findById(request.params.id);
  if (!prompt) throw new AppError(404, 'Prompt not found');
  if (request.user.role !== 'admin' && String(prompt.creator) !== String(request.user._id)) throw new AppError(403, 'Only the creator or an admin can view these analytics');
  const [bookmarks, reviews] = await Promise.all([Bookmark.countDocuments({ prompt: prompt._id }), Review.countDocuments({ prompt: prompt._id })]);
  response.json({ prompt: { _id: prompt._id, title: prompt.title }, stats: { copies: prompt.copyCount, bookmarks, reviews, rating: prompt.averageRating } });
}

export async function adminStats(_request, response) {
  const [users, prompts, reviews, copies] = await Promise.all([User.countDocuments(), Prompt.countDocuments(), Review.countDocuments(), Prompt.aggregate([{ $group: { _id: null, value: { $sum: '$copyCount' } } }])]);
  response.json({ users, prompts, reviews, copies: copies[0]?.value || 0 });
}
export async function allUsers(_request, response) { response.json({ users: await User.find().sort({ createdAt: -1 }) }); }
export async function updateRole(request, response) { const role = z.enum(['user', 'creator', 'admin']).parse(request.body.role); if (String(request.user._id) === request.params.id && role !== 'admin') throw new AppError(400, 'You cannot remove your own admin role'); response.json({ user: await User.findByIdAndUpdate(request.params.id, { role }, { returnDocument: 'after', runValidators: true }) }); }
export async function deleteUser(request, response) { if (String(request.user._id) === request.params.id) throw new AppError(400, 'You cannot delete your own account'); const owned = await Prompt.find({ creator: request.params.id }).distinct('_id'); await Promise.all([User.findByIdAndDelete(request.params.id), Prompt.deleteMany({ creator: request.params.id }), Bookmark.deleteMany({ $or: [{ user: request.params.id }, { prompt: { $in: owned } }] }), Review.deleteMany({ $or: [{ user: request.params.id }, { prompt: { $in: owned } }] }), Report.deleteMany({ $or: [{ reporter: request.params.id }, { prompt: { $in: owned } }] })]); response.status(204).end(); }

export async function allAdminPrompts(request, response) { const { page, limit, skip } = normalizePagination(request.query); const [prompts, total] = await Promise.all([Prompt.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('creator', 'name email'), Prompt.countDocuments()]); response.json({ prompts, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } }); }
export async function moderatePrompt(request, response) { const input = z.object({ action: z.enum(['approve', 'reject', 'feature', 'unfeature']), feedback: z.string().max(1200).optional() }).parse(request.body); const existing = await Prompt.findById(request.params.id); if (!existing) throw new AppError(404, 'Prompt not found'); if (input.action === 'reject' && !input.feedback?.trim()) throw new AppError(400, 'Rejection feedback is required'); if (input.action === 'feature' && existing.status !== 'approved') throw new AppError(400, 'Only approved prompts can be featured'); const update = input.action === 'approve' ? { status: 'approved', rejectionFeedback: '' } : input.action === 'reject' ? { status: 'rejected', rejectionFeedback: input.feedback, featured: false } : { featured: input.action === 'feature' }; const prompt = await Prompt.findByIdAndUpdate(request.params.id, update, { returnDocument: 'after', runValidators: true }); response.json({ prompt }); }
export async function payments(_request, response) { response.json({ payments: await Payment.find().sort({ paidAt: -1 }).populate('user', 'name email') }); }
export async function reports(_request, response) { response.json({ reports: await Report.find().sort({ createdAt: -1 }).populate('prompt', 'title creator').populate('reporter', 'name email') }); }
export async function reportAction(request, response) { const status = z.enum(['removed', 'warned', 'dismissed']).parse(request.body.status); const report = await Report.findByIdAndUpdate(request.params.id, { status }, { returnDocument: 'after' }).populate('prompt'); if (!report) throw new AppError(404, 'Report not found'); if (status === 'removed' && report.prompt) await Promise.all([Prompt.findByIdAndDelete(report.prompt._id), Bookmark.deleteMany({ prompt: report.prompt._id }), Review.deleteMany({ prompt: report.prompt._id })]); if (status === 'warned' && report.prompt) await User.findByIdAndUpdate(report.prompt.creator, { $push: { warnings: { reason: report.reason, report: report._id, issuedAt: new Date() } } }); response.json({ report }); }
