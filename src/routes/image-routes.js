import { Router } from 'express';
import { showImage } from '../controllers/image-controller.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.get('/:id', asyncHandler(showImage));
export default router;
