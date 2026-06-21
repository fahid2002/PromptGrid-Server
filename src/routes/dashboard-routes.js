import { Router } from 'express';
import {
  adminStats,
  allAdminPrompts,
  allUsers,
  auditHistory,
  creatorAnalytics,
  deleteUser,
  myBookmarks,
  myDashboard,
  myPrompts,
  myReviews,
  moderatePrompt,
  payments,
  promptAnalytics,
  reportAction,
  reports,
  updateRole,
} from '../controllers/dashboard-controller.js';
import {
  authenticate,
  requireRole,
} from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(myDashboard));
router.get('/prompts', asyncHandler(myPrompts));
router.get('/prompts/:id/analytics', asyncHandler(promptAnalytics));
router.get('/bookmarks', asyncHandler(myBookmarks));
router.get('/reviews', asyncHandler(myReviews));
router.get(
  '/analytics',
  requireRole('creator', 'admin'),
  asyncHandler(creatorAnalytics)
);

router.get(
  '/admin/stats',
  requireRole('admin'),
  asyncHandler(adminStats)
);

router.get(
  '/admin/audit',
  requireRole('admin'),
  asyncHandler(auditHistory)
);

router.get(
  '/admin/users',
  requireRole('admin'),
  asyncHandler(allUsers)
);

router.patch(
  '/admin/users/:id/role',
  requireRole('admin'),
  asyncHandler(updateRole)
);

router.delete(
  '/admin/users/:id',
  requireRole('admin'),
  asyncHandler(deleteUser)
);

router.get(
  '/admin/prompts',
  requireRole('admin'),
  asyncHandler(allAdminPrompts)
);

router.patch(
  '/admin/prompts/:id/moderate',
  requireRole('admin'),
  asyncHandler(moderatePrompt)
);

router.get(
  '/admin/payments',
  requireRole('admin'),
  asyncHandler(payments)
);

router.get(
  '/admin/reports',
  requireRole('admin'),
  asyncHandler(reports)
);

router.patch(
  '/admin/reports/:id',
  requireRole('admin'),
  asyncHandler(reportAction)
);

export default router;