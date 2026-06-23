import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { webhook } from './controllers/payment-controller.js';
import { env } from './config/env.js';
import {
  errorHandler,
  notFound,
} from './middleware/error-handler.js';
import authRoutes from './routes/auth-routes.js';
import dashboardRoutes from './routes/dashboard-routes.js';
import imageRoutes from './routes/image-routes.js';
import notificationRoutes from './routes/notification-routes.js';
import paymentRoutes from './routes/payment-routes.js';
import promptRoutes from './routes/prompt-routes.js';
import uploadRoutes from './routes/upload-routes.js';
import { asyncHandler } from './utils/async-handler.js';

// Create Express app
export const app = express();

// Trust proxy for deployment platforms like Render
app.set('trust proxy', 1);

// Add security headers
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// Enable CORS for frontend client
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  })
);

// Stripe webhook needs raw body before JSON parser
app.post(
  '/api/payments/webhook',
  express.raw({
    type: 'application/json',
  }),
  asyncHandler(webhook)
);

// Parse JSON request body and cookies
app.use(
  express.json({
    limit: '1mb',
  }),
  cookieParser()
);

// Auth routes with rate limiting
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
  authRoutes
);

// Main API routes
app.use('/api/prompts', promptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (_request, response) =>
  response.json({
    message: 'PromptGrid API is running',
    health: '/api/health',
    docs: 'Use /api/prompts, /api/auth, /api/payments, /api/dashboard',
  })
);

// Health check route
app.get('/api/health', (_request, response) =>
  response.json({
    status: 'ok',
  })
);

// Not found and global error handling
app.use(
  notFound,
  errorHandler
);