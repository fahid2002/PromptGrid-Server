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

## Deployment

The server is deployed on Render.

Recommended Render settings:

```txt
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

After changing environment variables, redeploy the Render service.

## Testing Checklist

Before final submission, verify:

* Server health endpoint works
* User registration works
* Email/password login works
* Google login works
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
