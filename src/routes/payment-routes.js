import { Router } from 'express';
import {
  createCheckout,
  sessionStatus,
} from '../controllers/payment-controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

// Create Express router for payment routes
const router = Router();

// All payment routes require authentication
router.use(authenticate);

// Creates Stripe checkout session for premium payment
router.post(
  '/checkout',
  asyncHandler(createCheckout)
);

// Checks Stripe checkout session status after payment
router.get(
  '/session/:sessionId',
  asyncHandler(sessionStatus)
);

export default router;