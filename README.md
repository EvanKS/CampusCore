# CampusFlow

> **Production-grade, multi-tenant campus productivity platform** for students, teachers, parents, and college administrators.

**Free-tier only · No Docker · No credit card required**

---

## Features

| Feature | Roles |
|---|---|
| 🔐 Email + Google OAuth, JWT tokens | All |
| 🎛️ Role-based dashboards (4 roles) | All |
| ✅ Task/Deadline CRUD + WhatsApp reminder + Calendar event | Student |
| 📊 Attendance marking + risk alerts | Teacher, Student, Parent |
| 📢 AI Notice Summarizer + WhatsApp broadcast | Teacher, Admin |
| 🤖 AI Study Buddy (chat, flashcards, quiz) | Student |
| 💼 Placement Application Tracker | Student |
| 👥 Study Group Scheduler | Student |
| 📈 Analytics + Audit log + Automation health | Admin |
| 📥 Bulk CSV user import | Admin |
| 🔔 Notification center (in-app + WhatsApp + email) | All |
| 🌙 Light/Dark/System theming | All |
| 📱 Installable PWA with offline caching | All |

## Tech Stack

```
Frontend  Next.js 14 (App Router) · TypeScript · Tailwind CSS · React Query
Backend   Node.js · Express · TypeScript · Zod validation
Database  PostgreSQL 15 via Supabase free tier (RLS enforced)
Queue     Upstash Redis + BullMQ (deadline reminders)
AI        Groq (Llama 3, primary) + Gemini 1.5 Flash (fallback)
Automation n8n (local, no Docker) + Twilio WhatsApp + Google Calendar
CI/CD     GitHub Actions
Hosting   Vercel (frontend) + Render (backend)
```

## Quick Start (No Docker)

### Prerequisites
- Node.js v18+
- Free accounts: Supabase, Upstash, Groq (see [DEPLOYMENT.md](docs/DEPLOYMENT.md))

### Backend

```bash
cd backend
cp .env.example .env    # Fill in your keys (see docs/DEPLOYMENT.md)
npm install
npm run migrate         # Run DB migrations against Supabase
npm run seed            # Load demo data (optional)
npm run dev             # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev             # http://localhost:3000
```

### Automation (optional but recommended)

```bash
npm install -g n8n
n8n start               # http://localhost:5678
# Import backend/src/n8n/deadline-reminder.json
# Import backend/src/n8n/notice-broadcast.json
```

### Tests

```bash
cd backend
npm test                # Jest — auth, RBAC, scheduling logic
```

## Demo Credentials

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Student | student@demo.campusflow.com | Demo1234! |
| Teacher | teacher@demo.campusflow.com | Demo1234! |
| Parent | parent@demo.campusflow.com | Demo1234! |
| Admin | admin@demo.campusflow.com | Demo1234! |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system diagram.

```
Browser/PWA (Vercel)
    │ HTTPS + JWT
Express API (Render)
    ├── Supabase PostgreSQL (RLS)
    ├── Upstash Redis (BullMQ)
    ├── Groq/Gemini (AI)
    └── n8n → Twilio + Google Calendar
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design & data flow
- [docs/DATABASE.md](docs/DATABASE.md) — Schema, RLS policies, migrations
- [docs/API.md](docs/API.md) — Full API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Step-by-step deployment guide

## Security

- Real `.env` / `.env.local` files are gitignored; only `.env.example` is committed
- Secrets are never in `NEXT_PUBLIC_*` variables
- JWT refresh tokens are hashed in the DB
- Row-Level Security enforces multi-tenant isolation at the Postgres level
- Rate limiting: 100 req/15min global, 20 req/15min on auth routes

## What I'd Add Next

- WebSocket real-time notifications (Supabase Realtime)
- Auto-graded quizzes (AI + teacher rubric)
- Parent WhatsApp onboarding bot (Twilio Flows)
- Gamification — attendance streaks and achievement badges
- Mobile app (React Native, sharing API + backend)
- Advanced analytics with Recharts (attendance heatmaps, grade trends)
