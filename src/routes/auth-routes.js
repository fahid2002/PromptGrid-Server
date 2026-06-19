import { Router } from 'express';
import { googleLogin, login, logout, me, register } from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
const router = Router();
router.post('/register', asyncHandler(register)); router.post('/login', asyncHandler(login)); router.post('/google', asyncHandler(googleLogin)); router.post('/logout', asyncHandler(logout)); router.get('/me', authenticate, me);
export default router;
