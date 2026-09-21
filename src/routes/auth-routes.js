import { Router } from 'express';
import {
  googleLogin,
  login,
  logout,
  me,
  disableMfa,
  enableMfa,
  mfaStatus,
  refresh,
  register,
  setupMfa,
  verifyMfaLogin,
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

// Completes a login after an MFA challenge
router.post(
  '/mfa/verify-login',
  asyncHandler(verifyMfaLogin)
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

// Authenticated MFA setup and management routes
router.get('/mfa/status', authenticate, asyncHandler(mfaStatus));
router.post('/mfa/setup', authenticate, asyncHandler(setupMfa));
router.post('/mfa/enable', authenticate, asyncHandler(enableMfa));
router.post('/mfa/disable', authenticate, asyncHandler(disableMfa));

export default router;
