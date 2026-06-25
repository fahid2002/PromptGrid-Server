import { z } from 'zod';
import Bookmark from '../models/Bookmark.js';
import Prompt from '../models/Prompt.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import { recordAudit } from '../services/audit-service.js';
import {
  notify,
  notifyAdmins,
} from '../services/notification-service.js';
import { canAccessPromptContent } from '../services/prompt-access.js';
import { recordUserActivity } from '../services/user-activity-service.js';
import { AppError } from '../utils/AppError.js';

// Adds or removes bookmark for an approved prompt
export async function toggleBookmark(request, response) {
  const prompt = await Prompt.findOne({
    _id: request.params.id,
    status: 'approved',
  });

  if (!prompt) {
    throw new AppError(404, 'Prompt not found');
  }

  // If bookmark already exists, remove it
  const existing = await Bookmark.findOneAndDelete({
    user: request.user._id,
    prompt: prompt._id,
  });

  if (existing) {
    await recordUserActivity({
      actor: request.user._id,
      action: 'bookmark_removed',
      title: 'Bookmark removed',
      summary: `You removed “${prompt.title}” from saved prompts.`,
      targetType: 'bookmark',
      targetId: existing._id,
      relatedPrompt: prompt._id,
      metadata: {
        promptTitle: prompt.title,
      },
    });

    return response.json({
      bookmarked: false,
      message: 'Bookmark removed',
    });
  }

  // Otherwise create a new bookmark
  const bookmark = await Bookmark.create({
    user: request.user._id,
    prompt: prompt._id,
  });

  await recordUserActivity({
    actor: request.user._id,
    action: 'prompt_bookmarked',
    title: 'Prompt bookmarked',
    summary: `You saved “${prompt.title}” to your bookmarks.`,
    targetType: 'bookmark',
    targetId: bookmark._id,
    relatedPrompt: prompt._id,
    metadata: {
      promptTitle: prompt.title,
    },
  });

  response.json({
    bookmarked: true,
    message: 'Prompt bookmarked',
  });
}

// Creates or updates a review for a prompt
export async function review(request, response) {
  const input = z
    .object({
      rating: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(5),

      comment: z
        .string()
        .trim()
        .min(3)
        .max(1200),
    })
    .parse(request.body);

  const prompt = await Prompt.findOne({
    _id: request.params.id,
    status: 'approved',
  });

  if (!prompt) {
    throw new AppError(404, 'Prompt not found');
  }

  // Premium/private prompt review access check
  if (!canAccessPromptContent(request.user, prompt)) {
    throw new AppError(
      403,
      'Premium access is required to review this prompt'
    );
  }

  // Create or update user's review
  const saved = await Review.findOneAndUpdate(
    {
      user: request.user._id,
      prompt: prompt._id,
    },
    input,
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    }
  );

  // Recalculate prompt average rating and review count
  const [rating] = await Review.aggregate([
    {
      $match: {
        prompt: prompt._id,
      },
    },
    {
      $group: {
        _id: '$prompt',
        average: {
          $avg: '$rating',
        },
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  await Prompt.findByIdAndUpdate(prompt._id, {
    averageRating: rating?.average || 0,
    reviewCount: rating?.count || 0,
  });

  const jobs = [
    recordUserActivity({
      actor: request.user._id,
      action: 'review_submitted',
      title: 'Review submitted',
      summary: `You reviewed “${prompt.title}” with ${saved.rating} star(s).`,
      targetType: 'review',
      targetId: saved._id,
      relatedPrompt: prompt._id,
      metadata: {
        rating: saved.rating,
        promptTitle: prompt.title,
      },
    }),
  ];

  // Notify creator if someone else reviewed their prompt
  if (String(prompt.creator) !== String(request.user._id)) {
    jobs.push(
      notify({
        recipient: prompt.creator,
        recipientRole: 'creator',
        type: 'review_received',
        title: 'New prompt review',
        message: `${request.user.name} reviewed “${prompt.title}”.`,
        href: `/prompts/${prompt._id}`,
        relatedPrompt: prompt._id,
        eventKey: `review:${saved._id}:${saved.updatedAt?.getTime() || Date.now()}`,
      })
    );
  }

  await Promise.all(jobs);

  response.status(201).json({
    review: saved,
  });
}

// Reports a prompt to the admin team
export async function report(request, response) {
  const input = z
    .object({
      reason: z.enum([
        'Inappropriate Content',
        'Spam',
        'Copyright Violation',
      ]),

      description: z
        .string()
        .max(1200)
        .optional()
        .default(''),
    })
    .parse(request.body);

  const prompt = await Prompt
    .findById(request.params.id)
    .select('title description category aiTool difficulty visibility creator');

  if (!prompt) {
    throw new AppError(404, 'Prompt not found');
  }

  // Save report record with prompt snapshot.
  // This keeps original prompt details even if the prompt is removed later.
  const saved = await Report.create({
    ...input,
    prompt: prompt._id,
    reporter: request.user._id,
    promptSnapshot: {
      title: prompt.title,
      description: prompt.description,
      category: prompt.category,
      aiTool: prompt.aiTool,
      difficulty: prompt.difficulty,
      visibility: prompt.visibility,
      creator: prompt.creator,
    },
  });

  // Notify admins, record admin audit log, and store user's own activity
  await Promise.all([
    notifyAdmins({
      type: 'prompt_reported',
      title: 'Prompt reported',
      message: `“${prompt.title}” was reported for ${saved.reason}.`,
      href: '/dashboard/admin/reports',
      relatedPrompt: prompt._id,
      relatedReport: saved._id,
      eventKey: `report:${saved._id}`,
    }),

    recordAudit({
      actor: request.user._id,
      action: 'prompt_reported',
      targetType: 'report',
      targetId: saved._id,
      summary: `Reported prompt: ${prompt.title}`,
      snapshot: {
        report: saved.toObject(),
        prompt: prompt.toObject(),
      },
    }),

    recordUserActivity({
      actor: request.user._id,
      action: 'prompt_reported',
      title: 'Prompt reported',
      summary: `You reported “${prompt.title}” for ${saved.reason}.`,
      targetType: 'report',
      targetId: saved._id,
      relatedPrompt: prompt._id,
      metadata: {
        reason: saved.reason,
        promptTitle: prompt.title,
      },
    }),
  ]);

  response.status(201).json({
    report: saved,
  });
}