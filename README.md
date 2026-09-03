# 🎓 CampusCore — Next-Gen Campus Productivity & Academic Management Platform

[![Next.js 14](https://img.shields.io/badge/Next.js-14_(App_Router)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Upstash-Redis_&_BullMQ-FF4438?style=for-the-badge&logo=redis)](https://upstash.com/)
[![AI Powered](https://img.shields.io/badge/AI-Groq_%7C_Gemini_1.5-FF6F00?style=for-the-badge&logo=google)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **CampusCore** is a production-grade, multi-tenant academic management and productivity platform designed to bridge communication and streamline daily operations for **Students**, **Teachers**, **Parents**, and **College Administrators**.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Student Portal](#-student-portal)
  - [Teacher Portal](#-teacher-portal)
  - [Parent Portal](#-parent-portal)
  - [Admin Dashboard](#-admin-dashboard)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Repository Setup](#1-clone-repository)
  - [Backend Setup](#2-backend-configuration)
  - [Frontend Setup](#3-frontend-configuration)
  - [Workflow Automation Setup (n8n - Optional)](#4-automation-workflows-n8n---optional)
- [Demo Credentials](#-demo-credentials)
- [API Overview](#-api-overview)
- [Security & Architecture Highlights](#-security--architecture-highlights)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Modern colleges often suffer from fragmented communication channels: notices get buried in messaging groups, students miss critical assignment deadlines, parents lack visibility into attendance risks, and teachers juggle manual roll calls across disparate spreadsheets.

**CampusCore** solves this by unifying academic productivity into a unified, high-performance web and PWA application powered by AI and asynchronous task queues:
- **Intelligent Study Assistance**: AI-generated flashcards, summaries, and personalized study chats.
- **Proactive Notifications**: Multi-channel alerts (In-App, WhatsApp, and Google Calendar sync via BullMQ queues).
- **Early-Warning Attendance Tracking**: Automatic attendance percentage calculation and threshold risk detection.
- **Enterprise-Grade RBAC**: Strict Row-Level Security (RLS) policies and JWT auth supporting 4 distinct user roles.

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- **Task & Deadline Management**: Full CRUD with priority labeling, subject association, and automated WhatsApp reminder triggers.
- **AI Study Buddy**: Interactive AI academic assistant offering conversational tutoring, automatic flashcard creation from notes, and smart revision support.
- **Attendance Insights**: Subject-wise percentage tracking, warning badges when dropping below required thresholds (e.g. 75%), and class breakdown.
- **Placement & Career Tracker**: Track job/internship applications, interview rounds, offer statuses, and custom recruiter notes.
- **Study Group Collaboration**: Discover, create, and join peer study groups with scheduled meeting times and member management.

### 👩‍🏫 Teacher Portal
- **Fast Attendance Marking**: Streamlined roll-call entry by subject, batch, and date with immediate risk status recalculation.
- **Smart Notice Publisher**: Compose institutional notices with integrated AI Summarization to generate concise broadcast bullet points.
- **Student Performance Oversight**: Class-wide attendance summaries to quickly identify students requiring academic intervention.

### 👨‍👩‍👦 Parent Portal
- **Linked Student Overview**: Real-time visibility into the linked ward's attendance rates, subject status, and critical risk flags.
- **Notice Board**: Direct access to verified official college announcements.
- **Secure Onboarding**: Self-service student linking using uniquely generated, cryptographically signed parent invitation codes.

### 🛡️ Admin Dashboard
- **Campus Analytics**: High-level visual statistics across total students, faculty, overall attendance health, and active courses.
- **Bulk CSV Ingestion**: Multi-user onboarding allowing bulk CSV file uploads for students and faculty.
- **Audit Logging & Automation Health**: Comprehensive event logging tracking all key actions with execution telemetry for background queues.
- **Institution Settings**: Configure global parameters, notification policies, and minimum attendance thresholds.

---

## 📐 System Architecture

```
                               ┌─────────────────────────┐
                               │   Next.js 14 Web / PWA  │
                               │ (Tailwind + React Query)│
                               └────────────┬────────────┘
                                            │ HTTPS / JWT
                                            ▼
                               ┌─────────────────────────┐
                               │     Express REST API    │
                               │  (TypeScript + Zod)     │
                               └──────┬──────┬─────┬─────┘
                                      │      │     │
                 ┌────────────────────┘      │     └────────────────────┐
                 ▼                           ▼                          ▼
      ┌────────────────────┐      ┌────────────────────┐     ┌────────────────────┐
      │  Supabase Postgres │      │   Upstash Redis    │     │   AI Providers     │
      │  (RLS Enforced)    │      │ (BullMQ Task Queue)│     │  (Groq + Gemini)   │
      └────────────────────┘      └──────────┬─────────┘     └────────────────────┘
                                             │
                                             ▼
                                  ┌────────────────────┐
                                  │   n8n Automations  │
                                  │ (WhatsApp/Calendar)│
                                  └────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 14 (App Router)](https://nextjs.org/), React 18, [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), Lucide Icons, [TanStack React Query](https://tanstack.com/query) |
| **Backend** | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), TypeScript, [Zod](https://zod.dev/) Schema Validation |
| **Database & Auth** | [PostgreSQL (Supabase)](https://supabase.com/) with Row-Level Security (RLS), JWT tokens (Access + Refresh token rotation), Google OAuth |
| **Queues & Caching** | [Upstash Redis](https://upstash.com/), [BullMQ](https://bullmq.io/) |
| **AI Engine** | [Groq SDK](https://groq.com/) (Llama 3.3 / Llama 3) with fallback to Google Gemini 1.5 Flash |
| **Automations & Notifications** | [n8n](https://n8n.io/) Webhooks, Twilio WhatsApp API, Google Calendar API |
| **Testing** | [Jest](https://jestjs.io/), Supertest |

---

## 💻 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** or **pnpm** / **yarn**
- Free Tier Accounts (no credit card needed):
  - [Supabase](https://supabase.com/) (PostgreSQL Database)
  - [Upstash](https://upstash.com/) (Serverless Redis)
  - [Groq Console](https://console.groq.com/) (AI Inference)

---

### 1. Clone Repository

```bash
git clone https://github.com/EvanKS/CampusCore.git
cd CampusCore
```

---

### 2. Backend Configuration

```bash
# Navigate to backend
cd backend

# Create environment configuration
cp .env.example .env

# Install backend dependencies
npm install

# Run database schema migrations against Supabase
npm run migrate

# (Optional) Seed database with demo data
npm run seed

# Start development server (runs on port 4000)
npm run dev
```

#### Backend Environment Variables (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
UPSTASH_REDIS_REST_URL=https://[YOUR_UPSTASH_ENDPOINT].upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
```

---

### 3. Frontend Configuration

```bash
# Open a new terminal in the frontend directory
cd frontend

# Create local environment configuration
cp .env.local.example .env.local

# Install frontend dependencies
npm install

# Start Next.js development server (runs on port 3000)
npm run dev
```

#### Frontend Environment Variables (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

---

### 4. Automation Workflows (n8n - Optional)

CampusCore includes turnkey workflow definitions for automated WhatsApp and calendar notifications:

```bash
# Install and run n8n locally
npm install -g n8n
n8n start
```
1. Open n8n at `http://localhost:5678`.
2. Import `backend/src/n8n/deadline-reminder.json` and `backend/src/n8n/notice-broadcast.json`.
3. Set your Twilio WhatsApp / Google Calendar credentials in the workflow nodes.

---

## 🔑 Demo Credentials

If you ran `npm run seed` in the backend, you can sign in instantly using the following test accounts:

| Role | Email Address | Password |
|---|---|---|
| 👨‍🎓 **Student** | `student@demo.campusflow.com` | `Demo1234!` |
| 👩‍🏫 **Teacher** | `teacher@demo.campusflow.com` | `Demo1234!` |
| 👨‍👩‍👦 **Parent** | `parent@demo.campusflow.com` | `Demo1234!` |
| 🛡️ **Admin** | `admin@demo.campusflow.com` | `Demo1234!` |

---

## 🔌 API Overview

All protected API endpoints expect an `Authorization: Bearer <access_token>` header.

| Endpoint Group | Prefix | Description |
|---|---|---|
| **Auth** | `/api/auth` | Login, Register, Refresh Token, Google OAuth, Password Reset |
| **Users** | `/api/users` | Profiles, onboarding flows, parent linking codes |
| **Tasks** | `/api/tasks` | Student tasks, priorities, deadlines, and reminder triggers |
| **Attendance** | `/api/attendance` | Roll-call logging, subject summaries, parent/student views |
| **Notices** | `/api/notices` | Campus notice broadcast, AI summaries, audience filters |
| **AI Services** | `/api/ai` | Study-buddy chat, notes management, auto-flashcard generator |
| **Placement** | `/api/placement` | Student placement applications and interview status tracker |
| **Study Groups** | `/api/study-groups` | Group formation, member lists, meeting scheduler |
| **Admin** | `/api/admin` | Institution-wide analytics, audit trail, bulk CSV imports |

*For complete endpoint schemas and payloads, see [docs/API.md](docs/API.md).*

---

## 🔒 Security & Architecture Highlights

- **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL layer to guarantee multi-tenant tenant isolation.
- **Zero Exposed Secrets**: All sensitive keys remain on the Express backend; no API tokens exposed via `NEXT_PUBLIC_*`.
- **Hashed Refresh Tokens**: Refresh tokens are cryptographically hashed before database storage with automatic token rotation.
- **Granular Rate Limiting**: Global rate limiting (100 req / 15 min) and strict authentication rate limiting (20 req / 15 min) prevent brute-force attacks.
- **Zod Schema Validation**: All incoming requests are validated against strict TypeScript schemas before reaching business logic.

---

## 📁 Project Structure

```
CampusCore/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment & connection configs
│   │   ├── controllers/     # Route controller logic
│   │   ├── db/              # Migrations, seed data, and Supabase client
│   │   ├── middlewares/     # Auth, RBAC, error handling, rate limiters
│   │   ├── n8n/             # Pre-built automation workflow JSONs
│   │   ├── queues/          # BullMQ queue definitions and workers
│   │   ├── routes/          # Express route declarations
│   │   ├── services/        # AI, notification, and third-party services
│   │   └── utils/           # Shared helpers and Winston logger
│   ├── tests/               # Jest test suites
│   └── package.json
│
├── frontend/
│   ├── public/              # Static assets and PWA manifests
│   ├── src/
│   │   ├── app/             # Next.js 14 App Router pages & layouts
│   │   ├── components/      # UI components (Dashboard, Modals, Forms, Sidebar)
│   │   ├── contexts/        # Auth and Theme context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # API client (Axios) and utility functions
│   │   └── types/           # TypeScript interfaces and shared types
│   └── package.json
│
├── docs/                    # Technical documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
