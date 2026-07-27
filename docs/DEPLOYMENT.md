# CampusFlow — Deployment Guide

> All services are permanently **free tier** · No Docker · No credit card required

---

## Services Overview

| Service | What | Free tier |
|---|---|---|
| Supabase | PostgreSQL database | 500 MB storage, 5 GB bandwidth |
| Upstash | Redis (BullMQ queue) | 10,000 commands/day |
| Groq | AI (primary) | Free API, no card |
| Google Cloud | OAuth2 + Calendar API | Free quota |
| Twilio | WhatsApp Sandbox | Free sandbox (no real number needed) |
| Vercel | Frontend hosting | Free hobby tier |
| Render | Backend hosting | Free web service (spins down after inactivity) |
| n8n | Automation | Install locally, free forever |

---

## 1. Supabase (Database)

1. Sign up at [supabase.com](https://supabase.com) → **New Project**
2. Choose a region, set a strong DB password, save it
3. Go to **Settings → Database → Connection string → Transaction pooler**  
   Copy the URI — this is your `DATABASE_URL`
4. Also copy the **Session pooler** URI — this is your `DIRECT_URL`
5. Go to **Settings → API** → copy the **anon** key (for frontend if needed) and **service_role** key (backend only — never expose to browser)

```env
# backend/.env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Run migrations:**
```bash
cd backend && npm run migrate
```

---

## 2. Upstash (Redis)

1. Sign up at [upstash.com](https://upstash.com) → **Create Database** → choose region
2. Go to **Details** → copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

```env
# backend/.env
UPSTASH_REDIS_REST_URL=https://[id].upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

---

## 3. Groq (AI)

1. Sign up at [console.groq.com](https://console.groq.com) — no credit card
2. **API Keys → Create API Key**
3. Copy the key → `GROQ_API_KEY`

```env
# backend/.env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-70b-versatile
```

---

## 4. Google Cloud (OAuth + Calendar)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Enable APIs**:
   - Google OAuth2 / People API
   - Google Calendar API
3. **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback` (dev) + your Render URL (prod)
4. Download the credentials JSON:
   - `GOOGLE_CLIENT_ID` = client_id
   - `GOOGLE_CLIENT_SECRET` = client_secret
5. For Calendar integration, create a **Service Account** → download JSON → set `GOOGLE_SERVICE_ACCOUNT_KEY` to the JSON string

```env
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_ID=primary
```

---

## 5. Twilio WhatsApp Sandbox

1. Sign up at [twilio.com](https://twilio.com) — free trial (no card needed for sandbox)
2. Go to **Messaging → Try it out → Send a WhatsApp message**
3. Follow instructions to join the sandbox (send a WhatsApp message to +14155238886)
4. From **Twilio Console**:
   - `TWILIO_ACCOUNT_SID` = Account SID
   - `TWILIO_AUTH_TOKEN` = Auth Token
   - `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886` (sandbox number)

```env
# backend/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## 6. n8n (Automation)

Install globally (no Docker):
```bash
npm install -g n8n
n8n start
# Open http://localhost:5678
```

Import workflows:
1. Open n8n → **Workflows → Import from File**
2. Import `backend/src/n8n/deadline-reminder.json`
3. Import `backend/src/n8n/notice-broadcast.json`
4. Configure Twilio and Google Calendar credentials in each workflow
5. Activate both workflows

```env
# backend/.env
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_WEBHOOK_SECRET=your_random_secret_here
```

---

## 7. Running Locally

### Backend
```bash
cd backend
cp .env.example .env   # Fill in all values above
npm install
npm run migrate        # First time only
npm run seed           # Optional: load demo data
npm run dev            # Starts on http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # Fill in NEXT_PUBLIC_API_URL
npm install
npm run dev            # Starts on http://localhost:3000
```

---

## 8. Deploying to Vercel (Frontend)

1. Push code to GitHub (ensure `.env.local` is gitignored!)
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Set root directory to `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://campusflow-api.onrender.com/api`)
5. Deploy

---

## 9. Deploying to Render (Backend)

1. Go to [render.com](https://render.com) → **New Web Service** → Connect GitHub
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. Add all environment variables from `backend/.env` in Render's dashboard
4. Add `FRONTEND_URL` = your Vercel URL

> ⚠️ Render free tier spins down after 15 min of inactivity. First request after idle will take ~30s to cold-start. For always-on, use a paid tier or Fly.io.

---

## 10. Post-Deployment Checklist

- [ ] Run `npm run migrate` against production DB (using `DIRECT_URL`)
- [ ] Run `npm run seed` for demo data (optional)
- [ ] Test Google OAuth redirect with production Vercel URL
- [ ] Update Twilio WhatsApp sandbox webhook to Render URL
- [ ] Verify n8n webhooks are reachable from Render (or deploy n8n to a cloud VM)
- [ ] Confirm `.env` / `.env.local` are not in `git status`
