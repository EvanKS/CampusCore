# CampusFlow — Antigravity Build Prompt (standalone, copy-paste ready)

This is the complete prompt. Nothing else is needed — hand this whole file to
Antigravity as your first message.

---

```
You are acting as a senior full-stack engineer. Build "CampusFlow" — a production-grade,
multi-tenant campus productivity platform for students, teachers, parents, and college
administrators. This must be a complete, working, deployable application — not a demo
or prototype. Prioritize correctness, clean architecture, and code I can put in a
professional portfolio.

## HARD CONSTRAINT: free resources only, software-only, no hardware, NO DOCKER
Every service, API, and hosting choice MUST be usable on a permanently free tier with
no credit card required. Do not introduce anything paid, anything requiring a trial that
expires, or ANY physical/hardware/IoT component. I do NOT have Docker installed and do
not want to install it — set up all local development against free CLOUD services
directly instead of local containers:
- Database: connect straight to a Supabase free-tier Postgres project (no local Postgres)
- Queue/cache: connect straight to an Upstash Redis free-tier database (no local Redis)
- Automation: install n8n directly on my machine with `npm install -g n8n` and run it
  with `n8n start` (no Docker container for n8n)
Walk me through creating each free account (Supabase, Upstash, Groq, Twilio, Google Cloud)
step by step before writing code that depends on it, and tell me exactly which value from
each dashboard goes into which environment variable.

## Before you write any code
1. Confirm Node.js (v18+) and npm are installed on my machine; if not, tell me how to
   install them. Do not attempt to use Docker at any point in this build.
2. As you create the folder structure, verify it after each major step — list the
   directory tree and confirm there are no stray, empty, duplicate, or malformed folders
   (e.g. from shell brace-expansion mistakes producing a literal folder named
   "{something") before moving on to writing code inside it.
3. Ask me for each free API key/credential only when you're about to use it, not all at
   once — e.g. ask for the Supabase connection string right before running the schema
   migration, not at the very start.

## Tech stack (free-tier only, no Docker)
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, next-themes,
  React Query, React Hook Form + Zod — runs locally with `npm run dev`, deployable free
  on Vercel
- Backend: Node.js, Express, TypeScript, Zod validation, JWT auth — runs locally with
  `npm run dev`, deployable free on Render (free web service tier)
- Database: PostgreSQL via Supabase free tier (500MB storage / 5GB bandwidth), connected
  to directly (no local Postgres), with Row-Level Security for multi-tenant isolation,
  using Supabase's built-in connection pooler
- Queue: Upstash Redis free tier + BullMQ for scheduled reminders, connected to directly
  (no local Redis)
- AI: a pluggable provider interface defaulting to Groq's free API (no credit card),
  swappable to Gemini 1.5 Flash free tier as fallback, used for notice summarization,
  flashcard generation, and a study-buddy chat endpoint
- Automation: n8n installed locally via `npm install -g n8n` (free, no Docker, no trial
  expiry) with a Twilio WhatsApp Sandbox node + Google Calendar OAuth2 node, triggered by
  backend webhooks, PLUS a native fallback path (direct Twilio + Google Calendar API
  calls, both free-tier) inside notificationService.ts so core reminders don't depend
  solely on n8n uptime
- CI/CD: GitHub Actions (free for public repos)

## Roles & access control
Implement four roles with strict RBAC: student, teacher, parent, admin (college/institution
admin). Parents are read-only and can only view data for students they are explicitly
linked to via a verified invite-code flow. Admins manage their own institution only
(multi-tenant isolation via institution_id + Postgres RLS — no institution can see another
institution's data under any circumstance).

## Required features
1. Auth: email/password + Google OAuth, JWT access + refresh tokens, role-based routing
2. Onboarding per role (student: branch/year/subjects/phone; teacher: department; parent:
   invite-code link to child; admin: institution setup)
3. Central dashboard per role with role-relevant widgets
4. Task/Deadline CRUD (student) with WhatsApp reminder + Google Calendar auto-event on
   creation, via webhook to n8n AND a direct-API fallback if n8n webhook fails
5. AI Study Buddy: chat over student's own notes, flashcard generator, quiz generator
6. Attendance module: teachers mark attendance, students/parents view %, automatic
   WhatsApp risk alert when a subject's attendance drops below the institution's threshold
7. Notice Summarizer: teacher/admin posts a notice, AI produces a 3-bullet summary, system
   creates a Calendar event and WhatsApp-broadcasts to all target students
8. Placement Prep Tracker and Study Group Scheduler modules (student-facing)
9. Admin panel: bulk CSV user import, institution-wide analytics, automation health log
   (n8n execution success/failure), global notice broadcast
10. Notification center (in-app + WhatsApp + email) with per-user channel preferences
11. Full audit log of significant data changes

## Database requirements
- Engine: PostgreSQL 15+ on Supabase free tier (relational — this data is inherently
  relational: institutions → students/teachers → subjects → attendance/tasks)
- Multi-tenant isolation: every tenant-scoped table carries institution_id (directly or
  via join), enforced with Postgres Row-Level Security, not just application code
- Referential integrity: all relationships enforced with foreign keys, explicit
  ON DELETE behavior chosen per table
- Role-appropriate access encoded directly in RLS policies (parents only read linked-and-
  verified students' data; teachers only write attendance for subjects they teach;
  students only CRUD their own tasks)
- Every insert/update/delete on tasks, attendance_records, notices, and users.role writes
  to an audit_log table via Postgres triggers
- created_at on every table; updated_at maintained via trigger where rows are editable
- Every foreign key indexed; composite indexes for real query patterns (student_user_id +
  deadline_at on tasks; subject_id + date on attendance_records; institution_id +
  target_scope on notices)
- CHECK constraints and ENUM types for status/role fields, not free-text strings
- Idempotent notification logging: unique constraint on (user_id, channel,
  related_entity_id) so a retried webhook can't double-send
- All schema changes via versioned SQL migration files, never hand-edited in the Supabase
  dashboard beyond local experimentation

## Non-functional requirements
- Must work correctly on ALL common devices and access methods, not just phone/tablet/
  desktop screen sizes:
  - Responsive layout: mobile (bottom nav, single column), tablet (collapsible sidebar),
    desktop (persistent sidebar, multi-column) — implement and visually verify all three
  - Cross-browser: test rendering/functionality in Chrome, Safari, Firefox, and Edge
  - Both touch input (phones/tablets) and mouse+keyboard input (desktop/laptop) — no
    hover-only interactions that become unusable on touch devices
  - Older/low-end/budget Android phones and slow mobile networks: keep initial page
    weight small, lazy-load non-critical content, avoid heavy animations that lag on
    weak hardware
  - Works acceptably on slow/unstable college wifi — the PWA offline caching (below)
    should let the dashboard and task list still load with no connection
  - Screen readers and keyboard-only navigation (WCAG AA, detailed below) so it's usable
    by students/staff relying on assistive technology
- Theming: Light, Dark, and System-default, persisted per user, CSS-variable based
- WCAG AA accessibility: keyboard navigation, aria labels, sufficient contrast in both themes
- Installable PWA with offline caching of dashboard/tasks
- Rate limiting on all public/webhook-triggering endpoints
- Input validation (Zod) on every API route, no unvalidated user input reaches the DB
- Secrets and API keys must never be committed to GitHub. Specifically:
  - Create a real `.env` (backend) and `.env.local` (frontend) with my actual keys, for
    local use only
  - Create matching `.env.example` / `.env.local.example` files with the same variable
    names but placeholder values (e.g. `your_groq_api_key_here`) — these ARE meant to be
    committed
  - Add `.env`, `.env.local`, and any other real-credential file to `.gitignore` before
    the first git commit, and confirm with me that `git status` shows no `.env` file
    staged before I push anything
  - Never put secret keys (Supabase service role key, Twilio auth token, Groq/Gemini
    keys, Google client secret) in any `NEXT_PUBLIC_*` frontend variable — those are
    bundled into browser JS and become publicly visible. Only non-secret values like the
    API base URL belong in `NEXT_PUBLIC_*`
  - When I deploy to Vercel/Render later, set the real values in each platform's
    dashboard environment-variable settings, not in any committed file
- Everywhere a paid tier, hardware device, or Docker container could seem like the
  "proper" solution, choose the free-tier/cloud/no-Docker equivalent instead and note the
  tradeoff in comments/README
- Include automated tests for auth, RBAC boundaries (a parent must never be able to read
  another student's data), and the reminder scheduling logic
- Provide deployment docs for Vercel (frontend) + Render (backend) + Supabase (DB) +
  Upstash (Redis) — all free tier, all cloud, no Docker
- Provide a README with setup instructions (no Docker steps), architecture diagram, and a
  "what I'd add next" section

## Deliverables
- Complete frontend/ and backend/ codebases
- SQL migration files implementing the full schema
- Two exported n8n workflow JSON files (deadline-reminder.json, notice-broadcast.json)
- docs/ARCHITECTURE.md, docs/DATABASE.md, docs/API.md, docs/DEPLOYMENT.md
- A seed script populating 1 demo institution with realistic students/teachers/parents/
  tasks/notices/attendance so the app demos convincingly out of the box

Build this incrementally: (1) free-account setup walkthrough + DB schema + migrations,
(2) auth + RBAC, (3) core CRUD + dashboards per role, (4) notification service + n8n
integration + fallback, (5) AI features, (6) admin analytics, (7) responsive/theming
polish, (8) tests + seed data + docs. After each phase, tell me what you built, confirm
it runs with `npm run dev` (no Docker required at any point), and flag any decisions that
deviate from this spec.
```
