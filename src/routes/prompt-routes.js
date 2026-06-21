import { Router } from 'express';
import {
  copy,
  create,
  details,
  featured,
  home,
  listPublic,
  remove,
  update,
} from '../controllers/prompt-controller.js';
import {
  report,
  review,
  toggleBookmark,
} from '../controllers/interaction-controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

// Create Express router for prompt routes
const router = Router();

// Public homepage prompt data route
router.get(
  '/home',
  asyncHandler(home)
);

// Public featured prompts route
router.get(
  '/featured',
  asyncHandler(featured)
);

// Public prompt listing route
router.get(
  '/',
  asyncHandler(listPublic)
);

// Create a new prompt, requires login
router.post(
  '/',
  authenticate,
  asyncHandler(create)
);

// Get single prompt details, requires login
router.get(
  '/:id',
  authenticate,
  asyncHandler(details)
);

// Update a prompt, requires login
router.patch(
  '/:id',
  authenticate,
  asyncHandler(update)
);

// Delete a prompt, requires login
router.delete(
  '/:id',
  authenticate,
  asyncHandler(remove)
);

// Copy prompt content, requires login
router.post(
  '/:id/copy',
  authenticate,
  asyncHandler(copy)
);

// Add or remove bookmark, requires login
router.put(
  '/:id/bookmark',
  authenticate,
  asyncHandler(toggleBookmark)
);

// Submit or update review, requires login
router.post(
  '/:id/reviews',
  authenticate,
  asyncHandler(review)
);

// Report a prompt, requires login
router.post(
  '/:id/reports',
  authenticate,
  asyncHandler(report)
);

export default router;