# CampusFlow — Architecture

> **Free-tier only · No Docker · No credit card required**

## Overview

CampusFlow is a production-grade, multi-tenant campus productivity platform built for four roles — **student, teacher, parent, and admin** — with strict per-institution data isolation.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / PWA                            │
│         Next.js 14 (App Router) · TypeScript · Tailwind         │
│              Deployed: Vercel (free tier)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JWT Bearer
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Backend                          │
│          Node.js · TypeScript · Zod validation                  │
│              Deployed: Render (free web service)                 │
└──┬──────────────┬────────────┬──────────────┬───────────────────┘
   │              │            │              │
   ▼              ▼            ▼              ▼
Supabase       Upstash      Groq API      n8n (local)
PostgreSQL      Redis        (AI)         + Twilio
(DB + RLS)    (BullMQ)   + Gemini        + Google
                          fallback        Calendar
```

## Components

### Frontend — Next.js 14 (App Router)
- **Routing**: file-based App Router under `src/app/(app)/`
- **Auth guard**: `AuthContext` + `AuthGuard` wrapper in the `(app)` layout
- **Data fetching**: React Query (`@tanstack/react-query`) with 60s stale time
- **Theming**: `next-themes` + CSS custom properties (light/dark/system)
- **PWA**: `manifest.json` + `sw.js` service worker (offline dashboard/tasks caching)
- **UI**: Tailwind CSS + custom design system in `globals.css`

### Backend — Express + TypeScript
- **Entry**: `src/index.ts` — security middleware → rate limiting → routes → error handler
- **Routes**: `auth`, `users`, `tasks`, `attendance`, `notices`, `notifications`, `ai`, `admin`, `placement`, `study-groups`, `webhooks`
- **Auth**: JWT access tokens (15m) + refresh tokens (7d), stored hashed in DB
- **RBAC**: `authenticate` + `authorize(...roles)` middleware chain
- **Validation**: Zod schemas on every route — no raw user input reaches the DB

### Database — Supabase PostgreSQL
- Multi-tenant: every tenant-scoped table has `institution_id`
- Row-Level Security (RLS) policies for all four roles
- Audit log via Postgres triggers on tasks, attendance, notices, users.role
- Migration files in `backend/src/db/migrations/`

### Queue — Upstash Redis + BullMQ
- `deadline-reminders` queue schedules WhatsApp + email reminders 24h before task deadlines
- Graceful degradation: if Redis unavailable, the n8n webhook path still fires

### AI — Groq (primary) + Gemini (fallback)
- Pluggable `aiService.ts` tries Groq first, falls back to Gemini 1.5 Flash
- Features: notice summarization, flashcard generation, quiz generation, study-buddy chat

### Automation — n8n + direct-API fallback
- Two n8n workflow JSONs: `deadline-reminder.json`, `notice-broadcast.json`
- `notificationService.ts` provides a direct Twilio + Google Calendar fallback path
- Automation health logged to `automation_logs` table (visible in admin analytics)

## Data Flow — Task Creation (example)

```
Student creates task
        │
        ▼
POST /api/tasks (Zod validation)
        │
        ▼
INSERT into tasks table
        │
    ┌───┴────────────────────────────────┐
    │                                    │
    ▼                                    ▼
POST to n8n webhook               scheduleDeadlineReminder()
(deadline-reminder.json)          → BullMQ / Upstash Redis
    │                                    │
    ▼  (on failure)                      ▼ (24h before deadline)
Direct Twilio + Google            Worker sends WhatsApp + Email
Calendar API calls                + creates Google Calendar event
```

## Security

| Concern | Implementation |
|---|---|
| Secrets | `.env` / `.env.local` gitignored, `.env.example` committed |
| JWT | Access 15m + Refresh 7d, refresh tokens hashed in DB |
| RBAC | Middleware enforces roles on every route |
| Multi-tenancy | `institution_id` on every table + Postgres RLS |
| Rate limiting | Global 100 req/15m + auth-specific 20 req/15m |
| Input validation | Zod on all routes |
| `NEXT_PUBLIC_*` | Only non-secret API base URL exposed to browser |

## What I'd Add Next

- Real-time notifications via WebSocket / Supabase Realtime
- Teacher-generated quiz with auto-grading
- Parent WhatsApp onboarding bot via Twilio Flows
- Bulk SMS for low-data-connectivity students
- Calendar sync via Google People API for classroom scheduling
- Gamification: streaks and achievement badges for attendance + task completion
