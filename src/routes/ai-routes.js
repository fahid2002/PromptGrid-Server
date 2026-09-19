import { Router } from 'express';
import {
  assistant,
  moderate,
  optimize,
  run,
  semanticSearch,
} from '../controllers/ai-controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.use(authenticate);
router.post('/optimize', asyncHandler(optimize));
router.post('/run', asyncHandler(run));
router.post('/moderate', asyncHandler(moderate));
router.post('/search', asyncHandler(semanticSearch));
router.post('/assistant', asyncHandler(assistant));

export default router;
