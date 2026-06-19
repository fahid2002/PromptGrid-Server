# PromptGrid Server

Express/Mongoose API for the AI Prompt Sharing & Marketplace Platform.

**Live URL:** Add the Render production URL here after deployment.

## Security and behavior

- Passwords hashed with bcrypt (cost 12)
- JWT stored in secure HTTP-only cookies; bearer fallback supported
- User/Creator/Admin role middleware
- Zod request validation, Helmet, CORS and auth rate limiting
- MongoDB indexes for search and duplicate bookmark/review prevention
- Private prompt content redacted by the server for free accounts
- Stripe webhook signature verification and idempotent payment records
- Cloudinary memory uploads; no local production file persistence

## Run locally

1. Copy `.env.example` to `.env` and provide real credentials.
2. Run `npm install`, `npm test`, then `npm run dev`.
3. The health endpoint is `GET /api/health`.

Use `npm run dev:memory` for a credential-free temporary MongoDB server during local UI testing. Data disappears when that process stops.

## Main packages

Express, Mongoose, Zod, JWT, bcrypt, Stripe, Cloudinary, Google Auth Library, Helmet, CORS, Multer, Supertest, Vitest and MongoDB Memory Server.

## API areas

- `/api/auth`: registration, login, Google login, session restoration and logout
- `/api/prompts`: home aggregation, featured limit(6), backend search/filter/sort/pagination, details and interactions
- `/api/dashboard`: user, creator and role-protected admin operations
- `/api/payments`: Stripe Checkout, session verification and signed webhook fulfillment
- `/api/uploads`: authenticated Cloudinary image uploads

## Stripe

Create a webhook endpoint at `https://YOUR_RENDER_DOMAIN/api/payments/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its signing secret to `STRIPE_WEBHOOK_SECRET`. Premium is never granted from the redirect alone; the server retrieves the Checkout Session and requires `payment_status=paid`.

## Render

Create a Web Service from this directory or use `render.yaml`. Add every `.env.example` key in Render's environment settings. Set `CLIENT_URL` to the exact Vercel production origin. MongoDB Atlas network access must allow Render connections.

No seed script is included: all counts, ratings, users, prompts and payments originate from real MongoDB records.

After deployment, replace this README's Live URL, test `/api/health`, register a real account, promote the first admin directly in MongoDB Atlas, then test moderation and Stripe in test mode before enabling live Stripe keys.
