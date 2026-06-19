import { Router } from 'express';
import { upload } from '../controllers/upload-controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { asyncHandler } from '../utils/async-handler.js';
const router = Router(); router.post('/image', authenticate, uploadImage.single('image'), asyncHandler(upload)); export default router;
