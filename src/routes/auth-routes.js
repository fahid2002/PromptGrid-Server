import { Router } from 'express';
import { googleLogin, login, logout, me, refresh, register } from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { asyncHandler } from '../utils/async-handler.js';
const router = Router();
router.post('/register', uploadImage.single('image'), asyncHandler(register)); router.post('/login', asyncHandler(login)); router.post('/google', asyncHandler(googleLogin)); router.post('/refresh', asyncHandler(refresh)); router.post('/logout', asyncHandler(logout)); router.get('/me', authenticate, me);
export default router;
