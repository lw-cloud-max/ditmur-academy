# Ditmur Academy - School Management System

This is a comprehensive, role-based SaaS school management portal tailored for Ditmur Academy.

## Features
- **Admin Portal:** Admissions, Student/Staff Directories, Class/Subject Configuration, CBT Exam Generation.
- **Student Portal:** Interactive Timetable, AI-generated Study Notes, CBT Exam Portal, Gamified Study Hub (Flashcards, Daily Trivia).
- **Parent Portal:** "My Children" Dashboard, Printable Academic Report Sheets, Live Paystack Fee Payments.
- **AI Integrations:** Automated Lesson Plan / Scheme of Work generation, CBT multiple-choice question generation, AI Report Sheet comments.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS & Lucide React Icons
- **Authentication:** NextAuth.js (Role-based JWT)
- **Database:** Prisma ORM & PostgreSQL (Neon)
- **Payments:** Paystack
- **AI Engine:** OpenAI (gpt-4o-mini)

## Deployment Instructions

### 1. Database Setup (Neon PostgreSQL)
1. Go to [Neon.tech](https://neon.tech) and create a free PostgreSQL database.
2. Copy your connection string (e.g., `postgres://username:password@ep-dry-lake-123.eu-central-1.aws.neon.tech/neondb?sslmode=require`).

### 2. Environment Variables
In your Vercel Dashboard (or `.env.local` locally), add the following environment variables:

```env
DATABASE_URL="your-neon-postgres-connection-string"

# NextAuth Secret (Run `openssl rand -base64 32` to generate one)
AUTH_SECRET="your-random-secret-key"
AUTH_TRUST_HOST=true

# Paystack API Keys (Get from paystack.com dashboard)
NEXT_PUBLIC_PAYSTACK_KEY="pk_live_or_test_key"
PAYSTACK_SECRET_KEY="sk_live_or_test_key"

# OpenAI API Key (Get from platform.openai.com)
OPENAI_API_KEY="sk-proj-your-api-key"
```

### 3. Deploy to Vercel
1. Push this repository to GitHub.
2. Go to [Vercel.com](https://vercel.com) and import the repository.
3. Paste the environment variables above into the deployment settings.
4. Click **Deploy**.

### 4. Initialize the Database
Once deployed, Vercel will automatically run `prisma generate`.
To initialize the database schema and add the default classes/admin user, run this command in your local terminal connected to the Neon database:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```
