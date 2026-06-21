import { Router } from 'express';
import { upload } from '../controllers/upload-controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { asyncHandler } from '../utils/async-handler.js';

// Create Express router for upload routes
const router = Router();

// Upload image route, requires login
router.post(
  '/image',
  authenticate,
  uploadImage.single('image'),
  asyncHandler(upload)
);

export default router;