import { Router } from 'express';
import {
  googleLogin,
  login,
  logout,
  me,
  refresh,
  register,
} from '../controllers/auth-controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { asyncHandler } from '../utils/async-handler.js';

// Create Express router for authentication routes
const router = Router();

// Register route with optional image upload
router.post(
  '/register',
  uploadImage.single('image'),
  asyncHandler(register)
);

// Login route
router.post(
  '/login',
  asyncHandler(login)
);

// Google login route
router.post(
  '/google',
  asyncHandler(googleLogin)
);

// Refresh session route
router.post(
  '/refresh',
  asyncHandler(refresh)
);

// Logout route
router.post(
  '/logout',
  asyncHandler(logout)
);

// Get currently logged-in user
router.get(
  '/me',
  authenticate,
  me
);

export default router;