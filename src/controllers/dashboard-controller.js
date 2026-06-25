import { z } from 'zod';
import Bookmark from '../models/Bookmark.js';
import Payment from '../models/Payment.js';
import Prompt from '../models/Prompt.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import { recordAudit } from '../services/audit-service.js';
import { notify } from '../services/notification-service.js';
import { normalizePagination } from '../services/prompt-query.js';
import { AppError } from '../utils/AppError.js';

// Shows logged-in user's dashboard summary
export async function myDashboard(request, response) {
  const userId = request.user._id;

  const [
    promptCount,
    bookmarks,
    reviews,
  ] = await Promise.all([
    Prompt.countDocuments({
      creator: userId,
    }),
    Bookmark.countDocuments({
      user: userId,
    }),
    Review.countDocuments({
      user: userId,
    }),
  ]);

  response.json({
    stats: {
      prompts: promptCount,
      bookmarks,
      reviews,
      subscription: request.user.subscription,
    },
    user: request.user,
  });
}

// Returns prompts created by the logged-in user
export async function myPrompts(request, response) {
  response.json({
    prompts: await Prompt
      .find({
        creator: request.user._id,
      })
      .sort({
        createdAt: -1,
      }),
  });
}

// Returns bookmarks saved by the logged-in user
export async function myBookmarks(request, response) {
  response.json({
    bookmarks: await Bookmark
      .find({
        user: request.user._id,
      })
      .sort({
        createdAt: -1,
      })
      .populate({
        path: 'prompt',
        populate: {
          path: 'creator',
          select: 'name photoURL',
        },
      }),
  });
}

// Returns reviews submitted by the logged-in user
export async function myReviews(request, response) {
  response.json({
    reviews: await Review
      .find({
        user: request.user._id,
      })
      .sort({
        createdAt: -1,
      })
      .populate('prompt', 'title'),
  });
}

// Shows analytics for creator dashboard
export async function creatorAnalytics(request, response) {
  const creator = request.user._id;

  const [
    summary,
    prompts,
    growth,
  ] = await Promise.all([
    Prompt.aggregate([
      {
        $match: {
          creator,
        },
      },
      {
        $group: {
          _id: null,
          prompts: {
            $sum: 1,
          },
          copies: {
            $sum: '$copyCount',
          },
        },
      },
    ]),

    Prompt.aggregate([
      {
        $match: {
          creator,
        },
      },
      {
        $lookup: {
          from: Bookmark.collection.name,
          localField: '_id',
          foreignField: 'prompt',
          as: 'bookmarks',
        },
      },
      {
        $project: {
          title: 1,
          copies: '$copyCount',
          bookmarks: {
            $size: '$bookmarks',
          },
          createdAt: 1,
        },
      },
      {
        $sort: {
          copies: -1,
        },
      },
    ]),

    Prompt.aggregate([
      {
        $match: {
          creator,
        },
      },
      {
        $group: {
          _id: {
            year: {
              $year: '$createdAt',
            },
            month: {
              $month: '$createdAt',
            },
          },
          prompts: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]),
  ]);

  response.json({
    summary: {
      ...(summary[0] || {
        prompts: 0,
        copies: 0,
      }),
      bookmarks: prompts.reduce(
        (total, item) => total + item.bookmarks,
        0
      ),
    },
    prompts,
    growth,
  });
}

// Shows analytics for a single prompt
export async function promptAnalytics(request, response) {
  const prompt = await Prompt.findById(request.params.id);

  if (!prompt) {
    throw new AppError(404, 'Prompt not found');
  }

  // Only creator or admin can view prompt analytics
  if (
    request.user.role !== 'admin' &&
    String(prompt.creator) !== String(request.user._id)
  ) {
    throw new AppError(
      403,
      'Only the creator or an admin can view these analytics'
    );
  }

  const [
    bookmarks,
    reviews,
  ] = await Promise.all([
    Bookmark.countDocuments({
      prompt: prompt._id,
    }),
    Review.countDocuments({
      prompt: prompt._id,
    }),
  ]);

  response.json({
    prompt: {
      _id: prompt._id,
      title: prompt.title,
    },
    stats: {
      copies: prompt.copyCount,
      bookmarks,
      reviews,
      rating: prompt.averageRating,
    },
  });
}

// Shows overall admin dashboard statistics
export async function adminStats(_request, response) {
  const [
    users,
    prompts,
    reviews,
    copies,
  ] = await Promise.all([
    User.countDocuments(),
    Prompt.countDocuments(),
    Review.countDocuments(),
    Prompt.aggregate([
      {
        $group: {
          _id: null,
          value: {
            $sum: '$copyCount',
          },
        },
      },
    ]),
  ]);

  response.json({
    users,
    prompts,
    reviews,
    copies: copies[0]?.value || 0,
  });
}

// Returns all users for admin dashboard
export async function allUsers(_request, response) {
  response.json({
    users: await User
      .find()
      .sort({
        createdAt: -1,
      }),
  });
}

// Updates user role from admin dashboard
export async function updateRole(request, response) {
  const role = z
    .enum([
      'user',
      'creator',
      'admin',
    ])
    .parse(request.body.role);

  // Admin cannot remove their own admin role
  if (String(request.user._id) === request.params.id && role !== 'admin') {
    throw new AppError(400, 'You cannot remove your own admin role');
  }

  response.json({
    user: await User.findByIdAndUpdate(
      request.params.id,
      {
        role,
      },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    ),
  });
}

// Deletes a user and related marketplace content
export async function deleteUser(request, response) {
  if (String(request.user._id) === request.params.id) {
    throw new AppError(400, 'You cannot delete your own account');
  }

  const owned = await Prompt
    .find({
      creator: request.params.id,
    })
    .distinct('_id');

  await Promise.all([
    User.findByIdAndDelete(request.params.id),

    Session.deleteMany({
      user: request.params.id,
    }),

    Notification.deleteMany({
      recipient: request.params.id,
    }),

    Prompt.deleteMany({
      creator: request.params.id,
    }),

    Bookmark.deleteMany({
      $or: [
        {
          user: request.params.id,
        },
        {
          prompt: {
            $in: owned,
          },
        },
      ],
    }),

    Review.deleteMany({
      $or: [
        {
          user: request.params.id,
        },
        {
          prompt: {
            $in: owned,
          },
        },
      ],
    }),

    Report.deleteMany({
      $or: [
        {
          reporter: request.params.id,
        },
        {
          prompt: {
            $in: owned,
          },
        },
      ],
    }),

    recordAudit({
      actor: request.user._id,
      action: 'user_deleted',
      targetType: 'user',
      targetId: request.params.id,
      summary: 'Administrator deleted a user account',
      snapshot: {
        ownedPrompts: owned,
      },
    }),
  ]);

  response.status(204).end();
}

// Returns paginated prompts for admin moderation
export async function allAdminPrompts(request, response) {
  const {
    page,
    limit,
    skip,
  } = normalizePagination(request.query);

  const [
    prompts,
    total,
    ranked,
  ] = await Promise.all([
    Prompt
      .find()
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'name email')
      .lean(),

    Prompt.countDocuments(),

    Prompt
      .find({
        status: 'approved',
        visibility: 'public',
      })
      .sort({
        copyCount: -1,
        averageRating: -1,
        createdAt: -1,
      })
      .limit(6)
      .select('_id')
      .lean(),
  ]);

  const featuredIds = new Set(
    ranked.map((item) => String(item._id))
  );

  response.json({
    prompts: prompts.map((prompt) => ({
      ...prompt,
      automaticallyFeatured: featuredIds.has(String(prompt._id)),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

// Approves, rejects, features or unfeatures a prompt
export async function moderatePrompt(request, response) {
  const input = z
    .object({
      action: z.enum([
        'approve',
        'reject',
        'feature',
        'unfeature',
      ]),
      feedback: z
        .string()
        .max(1200)
        .optional(),
    })
    .parse(request.body);

  const existing = await Prompt.findById(request.params.id);

  if (!existing) {
    throw new AppError(404, 'Prompt not found');
  }

  if (input.action === 'reject' && !input.feedback?.trim()) {
    throw new AppError(400, 'Rejection feedback is required');
  }

  if (input.action === 'feature' && existing.status !== 'approved') {
    throw new AppError(400, 'Only approved prompts can be featured');
  }

  const update =
    input.action === 'approve'
      ? {
          status: 'approved',
          rejectionFeedback: '',
        }
      : input.action === 'reject'
        ? {
            status: 'rejected',
            rejectionFeedback: input.feedback,
            featured: false,
          }
        : {
            featured: input.action === 'feature',
          };

  const prompt = await Prompt.findByIdAndUpdate(
    request.params.id,
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  const isStatusAction =
    input.action === 'approve' ||
    input.action === 'reject';

  const jobs = [
    recordAudit({
      actor: request.user._id,
      action: `prompt_${input.action}`,
      targetType: 'prompt',
      targetId: prompt._id,
      summary: `${input.action} prompt: ${prompt.title}`,
      snapshot: {
        before: existing.toObject(),
        after: prompt.toObject(),
        feedback: input.feedback || '',
      },
    }),
  ];

  // Send notification when prompt status changes
  if (isStatusAction) {
    jobs.push(
      notify({
        recipient: prompt.creator,
        recipientRole: 'creator',
        type: `prompt_${prompt.status}`,
        title: `Prompt ${prompt.status}`,
        message:
          input.action === 'approve'
            ? `“${prompt.title}” is now public.`
            : `“${prompt.title}” was rejected: ${input.feedback}`,
        href: '/dashboard?view=my-prompts',
        relatedPrompt: prompt._id,
        eventKey: `moderation:${prompt._id}:${prompt.status}:${Date.now()}`,
      })
    );
  }

  await Promise.all(jobs);

  response.json({
    prompt,
  });
}

// Returns all payment records for admin
export async function payments(_request, response) {
  response.json({
    payments: await Payment
      .find()
      .sort({
        paidAt: -1,
      })
      .populate('user', 'name email'),
  });
}

// Returns all report records for admin
// Returns all report records for admin
export async function reports(_request, response) {
  response.json({
    reports: await Report
      .find()
      .sort({
        createdAt: -1,
      })
      .populate(
        'prompt',
        'title description category aiTool difficulty visibility creator'
      )
      .populate('reporter', 'name email'),
  });
}

// Performs action on a submitted report
// Performs action on a submitted report
export async function reportAction(request, response) {
  const status = z
    .enum([
      'removed',
      'warned',
      'dismissed',
    ])
    .parse(request.body.status);

  const report = await Report
    .findById(request.params.id)
    .populate('prompt')
    .populate('reporter', 'name role');

  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  const promptSnapshot = report.prompt
    ? {
        title: report.prompt.title,
        description: report.prompt.description,
        category: report.prompt.category,
        aiTool: report.prompt.aiTool,
        difficulty: report.prompt.difficulty,
        visibility: report.prompt.visibility,
        creator: report.prompt.creator,
      }
    : report.promptSnapshot || {};

  report.status = status;

  // Save prompt information before removing the actual prompt
  if (report.prompt && !report.promptSnapshot?.title) {
    report.promptSnapshot = promptSnapshot;
  }

  await report.save();

  const promptTitle =
    promptSnapshot?.title ||
    report.prompt?.title ||
    'reported prompt';

  const jobs = [
    recordAudit({
      actor: request.user._id,
      action: `report_${status}`,
      targetType: 'report',
      targetId: report._id,
      summary: `${status} report for ${promptTitle}`,
      snapshot: {
        report: report.toObject(),
        prompt: report.prompt?.toObject?.() || promptSnapshot || null,
      },
    }),
  ];

  // Remove prompt and related data if report action is removed
  if (status === 'removed' && report.prompt) {
    jobs.push(
      Prompt.findByIdAndDelete(report.prompt._id),

      Bookmark.deleteMany({
        prompt: report.prompt._id,
      }),

      Review.deleteMany({
        prompt: report.prompt._id,
      }),

      notify({
        recipient: report.prompt.creator,
        recipientRole: 'creator',
        type: 'prompt_removed',
        title: 'Prompt removed',
        message: `Your prompt “${report.prompt.title}” was removed after a report for ${report.reason}.`,
        href: '/dashboard?view=my-prompts',
        relatedReport: report._id,
        eventKey: `report_action:${report._id}:removed:creator`,
      })
    );
  }

  // Warn creator if report action is warned
  if (status === 'warned' && report.prompt) {
    const warningMessage = report.description
      ? `Your prompt “${report.prompt.title}” received a warning for ${report.reason}. Admin note: ${report.description}. Please update the prompt to follow platform guidelines or delete it from your dashboard.`
      : `Your prompt “${report.prompt.title}” received a warning for ${report.reason}. Please update the prompt to follow platform guidelines or delete it from your dashboard.`;

    jobs.push(
      User.findByIdAndUpdate(
        report.prompt.creator,
        {
          $push: {
            warnings: {
              reason: report.reason,
              report: report._id,
              issuedAt: new Date(),
            },
          },
        }
      ),

      notify({
        recipient: report.prompt.creator,
        recipientRole: 'creator',
        type: 'admin_warning',
        title: 'Warning from administrator',
        message: warningMessage,
        href: '/dashboard?view=my-prompts',
        relatedPrompt: report.prompt._id,
        relatedReport: report._id,
        eventKey: `report_action:${report._id}:warned`,
      })
    );
  }

  // Notify reporter that the report was resolved
  if (report.reporter?._id) {
    jobs.push(
      notify({
        recipient: report.reporter._id,
        recipientRole: report.reporter.role || 'user',
        type: 'report_resolved',
        title: 'Report resolved',
        message: `Your report was ${status}.`,
        href: '/dashboard',
        relatedReport: report._id,
        eventKey: `report_action:${report._id}:${status}:reporter`,
      })
    );
  }

  await Promise.all(jobs);

  response.json({
    report,
  });
}
// Removes a report from the reported prompts page without deleting the prompt
export async function deleteReport(request, response) {
  const report = await Report.findById(request.params.id);

  if (!report) {
    throw new AppError(404, 'Report not found');
  }

  await Promise.all([
    recordAudit({
      actor: request.user._id,
      action: 'report_deleted',
      targetType: 'report',
      targetId: report._id,
      summary: `Removed report from admin list: ${
        report.promptSnapshot?.title || 'reported prompt'
      }`,
      snapshot: report.toObject(),
    }),

    report.deleteOne(),
  ]);

  response.status(204).end();
}

// Returns audit log history for admin
export async function auditHistory(request, response) {
  const {
    page,
    limit,
    skip,
  } = normalizePagination(request.query);

  const [
    entries,
    total,
  ] = await Promise.all([
    AuditLog
      .find()
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email'),

    AuditLog.countDocuments(),
  ]);

  response.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}