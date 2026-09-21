# PromptGrid Server

Backend API for **PromptGrid**, an AI Prompt Sharing & Marketplace Platform where users can browse prompts, create prompts, save prompts, review prompts, report prompts, and unlock premium prompt content through Stripe Checkout.

## Live Links

* **Server API:** https://promptgrid-server-fahid2002.onrender.com
* **Health Check:** https://promptgrid-server-fahid2002.onrender.com/api/health
* **Client App:** https://promptgrid-client.vercel.app

## Features

* Email/password authentication
* Google OAuth login
* JWT authentication with secure cookies
* User, creator, and admin role management
* Public and premium/private prompt system
* Premium prompt locking for free users
* Prompt create, update, delete, copy, bookmark, review, and report APIs
* Admin dashboard APIs for users, prompts, reports, payments, and analytics
* Stripe Checkout payment integration
* Stripe webhook verification for successful payments
* Automatic user upgrade to premium after successful payment
* Admin notification system for important platform events
* Gemini-powered Prompt Builder and Optimizer API
* Gemini-powered Prompt Playground API
* AI Prompt Review API for safety and quality suggestions
* Semantic Prompt Search API for approved public prompts
* Authenticated PromptGrid AI Assistant API
* Protected AI routes using JWT authentication
* Optional Authenticator-app MFA with encrypted TOTP secrets and recovery codes
* Resend HTTPS Email API for production Email OTP on Render Free
* Gmail SMTP Email OTP fallback for local development or paid hosts
* GridFS image upload support
* MongoDB database with Mongoose
* Security middleware using Helmet, CORS, rate limiting, and cookie parser
* Automated test coverage with Vitest

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcrypt
* Google OAuth
* otplib TOTP authentication
* QRCode generation
* Resend Email API and Nodemailer Gmail SMTP delivery
* Stripe Checkout
* GridFS
* Helmet
* CORS
* Vitest
* Render

## Project Structure

```txt
promptgrid-server/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── index.js
├── scripts/
├── tests/
├── package.json
├── render.yaml
└── README.md
```

## Environment Variables

Create a `.env` file in the root of the server project.

```env
NODE_ENV=development
PORT=5000

MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=promptgrid

JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PROJECT_NUMBER=your_google_project_number

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
MFA_ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Gmail SMTP Email OTP (server-only)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=PromptGrid Security <your-gmail-address@gmail.com>

# Resend Email API (recommended for Render Free; server-only)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=PromptGrid <onboarding@resend.dev>

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

ADMIN_NAME=PromptGrid Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

For production on Render, set these values in the Render environment settings:

```env
NODE_ENV=production
PORT=5000

MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=promptgrid

JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=https://promptgrid-client.vercel.app

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PROJECT_NUMBER=your_google_project_number

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
MFA_ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Email OTP provider settings (server-only)
# Render Free blocks outbound SMTP ports, so use Resend in production.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=PromptGrid Security <your-gmail-address@gmail.com>

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=PromptGrid <onboarding@resend.dev>

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

ADMIN_NAME=PromptGrid Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

Never commit real `.env` secrets to GitHub. Keep real MongoDB, JWT, Google, Stripe, and admin credentials only in local `.env` files or deployment environment variables.

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

The server will run on:

```txt
http://localhost:5000
```

Health check:

```txt
http://localhost:5000/api/health
```

## Run Tests

```bash
npm run test
```

## Database Scripts

Seed the admin user:

```bash
npm run seed:admin
```

Seed starter prompts:

```bash
npm run seed:prompts
```

Migrate data from an old database if needed:

```bash
npm run migrate:database
```

## Stripe Setup

PromptGrid uses Stripe Checkout for premium access payment.

Required server environment variables:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe webhook endpoint:

```txt
https://promptgrid-server-fahid2002.onrender.com/api/payments/webhook
```

Required webhook events:

```txt
checkout.session.completed
checkout.session.async_payment_succeeded
```

After a successful payment:

* A payment record is saved in MongoDB
* The user subscription is upgraded to `premium`
* Premium/private prompt content becomes unlocked
* Admin receives a premium subscription notification

## Main API Routes

```txt
GET    /api/health

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/logout
POST   /api/auth/mfa/send-email-login
POST   /api/auth/mfa/verify-email-login
POST   /api/auth/password/reset/send-code
POST   /api/auth/password/reset
POST   /api/auth/password/change/send-code
POST   /api/auth/password/change

GET    /api/prompts
GET    /api/prompts/home
GET    /api/prompts/:id
POST   /api/prompts
PATCH  /api/prompts/:id
DELETE /api/prompts/:id
POST   /api/prompts/:id/copy
PUT    /api/prompts/:id/bookmark
POST   /api/prompts/:id/reviews
DELETE /api/prompts/:id/reviews
POST   /api/prompts/:id/report

POST   /api/ai/optimize
POST   /api/ai/run
POST   /api/ai/moderate
POST   /api/ai/search
POST   /api/ai/assistant

POST   /api/payments/checkout
GET    /api/payments/session/:sessionId
POST   /api/payments/webhook

GET    /api/dashboard
GET    /api/dashboard/admin/users
GET    /api/dashboard/admin/prompts
GET    /api/dashboard/admin/reports
GET    /api/dashboard/admin/payments

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
```

All `/api/ai/*` routes require an authenticated user. The server uses the configured Gemini model through `@google/genai`; the API key remains server-side and is never sent to the client.

## Multi-factor Authentication

PromptGrid supports optional TOTP-based MFA through an authenticator app. User MFA secrets are encrypted in MongoDB with the server-only `MFA_ENCRYPTION_KEY`, and recovery codes are stored as hashes. Generate a 32-byte key for local development with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Never expose `MFA_ENCRYPTION_KEY` to the client or commit it to GitHub. MFA routes are authenticated except for the short-lived login verification challenge:

```txt
GET    /api/auth/mfa/status
POST   /api/auth/mfa/setup
POST   /api/auth/mfa/enable
POST   /api/auth/mfa/disable
POST   /api/auth/mfa/verify-login
POST   /api/auth/mfa/send-email-login
POST   /api/auth/mfa/verify-email-login
```

### Email OTP verification

PromptGrid supports one-time email codes for MFA login, password changes, and password resets. In production on Render Free, the server uses the Resend HTTPS Email API because Render blocks outbound SMTP ports. Local development and paid hosts can use Gmail SMTP with a 16-character App Password. The App Password and Resend API key are never sent to the browser or stored in client-side environment variables.

For Render Free, configure these values only on the server environment:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=PromptGrid <onboarding@resend.dev>
```

For local development or a host that permits SMTP, configure:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=PromptGrid Security <your-gmail-address@gmail.com>
```

The Gmail account must have Google 2-Step Verification enabled and an App Password created for the server. Do not use the regular Gmail password. Resend uses HTTPS; Gmail SMTP uses encrypted TLS in transit. Application-level protection is added by hashing OTPs in MongoDB, expiring them after 10 minutes, limiting attempts to five, enforcing a resend cooldown, and invalidating each code after successful use.

Email OTP is available for:

* MFA login as an alternative to the Authenticator app
* Authenticated password changes, together with the current password
* Forgot-password recovery

Each OTP is bound to its action (`mfa-login`, `password-change`, or `password-reset`) so a code issued for one purpose cannot be reused for another. Password changes can also be confirmed with the existing Authenticator-app TOTP code.

## AI API Behavior

```txt
/api/ai/optimize   Returns a structured optimized prompt
/api/ai/run        Executes a prompt against supplied input
/api/ai/moderate   Returns safety, quality, score, and suggestions
/api/ai/search     Ranks up to 60 approved public prompts semantically
/api/ai/assistant  Returns concise contextual assistant responses
```

If `GEMINI_MODEL` is not provided, the server uses `gemini-3.1-flash-lite`. Gemini-related failures are converted into safe API error messages instead of exposing provider details.

## Authentication and Security Flow

### Standard login

```txt
Credentials or Google OAuth token
→ Server validates the identity and selected role
→ If MFA is disabled, access and refresh cookies are created
→ If MFA is enabled, a five-minute signed MFA challenge is returned
```

### MFA login

```txt
Password or Google login
→ Short-lived MFA challenge
→ TOTP or one-time recovery code verification
→ Access and refresh cookies are created only after verification
```

MFA implementation details:

* TOTP secrets are generated with `otplib`.
* QR codes are generated server-side with `qrcode`.
* TOTP secrets are encrypted with AES-256-GCM before MongoDB storage.
* `MFA_ENCRYPTION_KEY` is a server-only 32-byte hexadecimal key.
* Recovery codes are shown once and stored only as password hashes.
* Recovery codes are removed after successful use.
* MFA secrets, recovery hashes, password hashes, and Google subject identifiers are excluded from normal user JSON responses.
* Login and authentication routes are rate-limited by the Express application.

`MFA_ENCRYPTION_KEY` encrypts the TOTP secret used by Google Authenticator or another authenticator app. It is not an email password, Gmail App Password, or OTP code. Keep it unchanged while encrypted MFA accounts are in use; rotating it without migration makes existing authenticator secrets unreadable.

Do not rotate `MFA_ENCRYPTION_KEY` while encrypted MFA accounts are in use unless a controlled key migration is performed.

## Data and Access Boundaries

* Public marketplace endpoints expose approved public prompts only.
* Premium/private prompt content is filtered by server-side access rules.
* AI routes require authentication and keep the Gemini API key on the server.
* Dashboard routes apply user, creator, and admin role restrictions.
* Notification queries are scoped to the authenticated recipient.
* Refresh tokens are rotated and stored as hashes in MongoDB.

## Deployment

The server is deployed on Render.

Recommended Render settings:

```txt
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

Render Free blocks outbound SMTP ports `25`, `465`, and `587`. Add `RESEND_API_KEY` as a secret environment variable and keep `RESEND_FROM=PromptGrid <onboarding@resend.dev>` unless a verified sender/domain is configured in Resend. Never commit the API key to GitHub.

After changing environment variables, redeploy the Render service.

## Testing Checklist

Before final submission, verify:

* Server health endpoint works
* User registration works
* Email/password login works
* Google login works
* AI routes reject unauthenticated requests
* Prompt optimizer returns structured JSON
* Prompt playground returns generated output
* AI moderation returns a review result
* Semantic prompt search returns approved public matches
* AI assistant responds for authenticated users
* MFA setup creates an authenticator QR code
* MFA enablement rejects an incorrect code
* MFA-enabled login requires a valid TOTP code
* Recovery codes are one-time and are not returned again
* MFA disable requires a valid current code
* Email MFA sends a branded code through Resend on Render Free or Gmail SMTP locally
* Email MFA login accepts a valid, unexpired code
* Password change requires the current password plus either TOTP or Email OTP
* Forgot-password recovery requires an Email OTP
* Email OTP codes expire, are attempt-limited, action-bound, and cannot be reused
* Public prompts load
* Premium prompts appear as locked cards for free users
* Prompt creation works
* Admin can approve/reject prompts
* Stripe test payment works
* User becomes premium after payment
* Payment record is saved in MongoDB
* Admin receives notification after premium payment

## Author

Developed by **Fahid Hasan**.

## License

This project is for educational and portfolio purposes.
