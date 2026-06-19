import { Router } from 'express';
import { createCheckout, sessionStatus } from '../controllers/payment-controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
const router = Router(); router.use(authenticate); router.post('/checkout', asyncHandler(createCheckout)); router.get('/session/:sessionId', asyncHandler(sessionStatus)); export default router;
