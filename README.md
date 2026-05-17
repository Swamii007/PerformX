# ⚡ PerformX
### AI-Powered Goal Setting & Tracking Portal
**AtomQuest Hackathon 1.0 — Atomberg Technologies**

---

## 🚀 Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://performx-xyz.vercel.app |
| Backend API | https://performx-api.onrender.com |
| API Docs | https://performx-api.onrender.com/docs |

---

## 🔑 Demo Credentials

| Role | Email | Password | Profile |
|------|-------|----------|---------|
| **Admin / HR** | admin@performx.com | Admin@123 | Priya Sharma |
| **Manager (Sales)** | manager@performx.com | Manager@123 | Rahul Mehta |
| **Manager (Eng)** | manager2@performx.com | Manager@123 | Deepa Nair |
| **Employee** | employee1@performx.com | Employee@123 | Ananya Patel — top performer, Q1+Q2 data |
| **Employee** | employee2@performx.com | Employee@123 | Vikram Singh — at-risk goals, mixed states |
| **Employee** | employee3@performx.com | Employee@123 | Rohan Desai — Engineering |
| **Employee** | employee4@performx.com | Employee@123 | Sneha Kulkarni — Engineering |

> Click the quick-login buttons on the login page for instant access — no typing needed.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│         Next.js 14 Frontend (Vercel)                │
│   App Router · Tailwind CSS · Radix UI              │
│   Zustand · Recharts · Sonner · next-themes         │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────────────┐
│         FastAPI Backend (Render)                    │
│   Python 3.13 · Motor · JWT Auth · Pydantic v2      │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
┌──────────▼──────────┐  ┌────────▼────────────────┐
│   MongoDB Atlas     │  │   External Services     │
│   (Cloud Database)  │  │   • Gemini API (AI)     │
│                     │  │   • SMTP (Email)        │
└─────────────────────┘  └─────────────────────────┘
```

---

## ✅ Features

### Phase 1 — Goal Creation & Approval
- Employee creates goals: Thrust Area, UoM, Target, Weightage
- **Validation**: total = 100%, min 10%, max 8 goals
- Manager L1 approval with inline target/weightage editing
- Return for rework with mandatory feedback
- Goals locked on approval — admin unlock with audit log
- **Shared Goals**: push departmental KPI to multiple employees simultaneously

### Phase 2 — Achievement Tracking
- Quarterly updates (Q1–Q4) with phase-gated window enforcement
- Progress scores computed automatically:
  - `Numeric Min` (higher is better): Achievement ÷ Target × 100
  - `Numeric Max` (lower is better): Target ÷ Achievement × 100
  - `Timeline`: 100% if on time, −2%/day late
  - `Zero-Based`: 100% if actual = 0, else 0%
- Progress status: Not Started / On Track / **At Risk** / Completed
- Manager check-in comments per goal per quarter

### Admin Controls
- Create performance cycles with full phase date ranges + validation
- Activate / deactivate cycles
- Create, edit, and deactivate users
- Unlock approved goals with reason (audit logged)
- Push shared departmental KPIs

### Reporting & Governance
- Achievement report export (Excel/XLSX)
- Completion dashboard — real-time
- Full audit trail — who changed what and when
- Department heatmap, QoQ trend, thrust area distribution

### AI Features (Gemini)
- Smart goal suggestions by thrust area + department
- Check-in comment summarization
- Natural language analytics insights
- Graceful fallback when API unavailable

### UX & Polish
- Dark mode (fully consistent)
- Toast notifications (Sonner) — no browser alerts
- Loading skeletons on all pages
- Inline form validation
- Polished empty states
- Confirmation dialogs for destructive actions
- At-risk alerts on employee dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS v4 |
| UI Components | Radix UI primitives, Lucide Icons, Recharts |
| State | Zustand + persist, React hooks |
| Backend | FastAPI, Python 3.13, Pydantic v2 |
| Database | MongoDB Atlas, Motor (async driver) |
| Auth | JWT (python-jose), bcrypt (12 rounds) |
| AI | Google Gemini 2.5 Flash (with cascade fallback) |
| Email | aiosmtplib (async SMTP) |
| Export | xlsx (XLSX/Excel format) |
| Deployment | Vercel (frontend), Render (backend) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+, Python 3.11+, MongoDB Atlas account

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in MONGODB_URI and JWT_SECRET
python -m app.seed          # load demo data (7 users, 18 goals, comments, audit logs)
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
# .env.local already configured for localhost:8000
npm run dev
```

Open **http://localhost:3000** and click any quick-login button.

---

## 🚢 Deployment

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for full step-by-step instructions.

**Quick summary:**
1. MongoDB Atlas → create cluster, get connection string
2. Google AI Studio → get Gemini API key
3. Render → deploy backend, set env vars, run seed
4. Vercel → deploy frontend, set `NEXT_PUBLIC_API_URL`

---

## 📁 Project Structure

```
PerformX/
├── backend/
│   ├── app/
│   │   ├── routers/        # auth, goals, checkins, analytics, ai, users, cycles, notifications
│   │   ├── models/         # Pydantic schemas (goal, user, cycle, checkin, notification)
│   │   ├── utils/          # auth, email, gemini, progress, notifications
│   │   ├── config.py       # env settings (pydantic-settings)
│   │   ├── database.py     # MongoDB Motor connection
│   │   └── seed.py         # demo data (7 users, 18 goals, Q1+Q2 data)
│   ├── main.py             # FastAPI app + CORS + routers
│   ├── render.yaml         # Render deployment config
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── login/          # Login page with quick-access buttons
        │   ├── employee/       # dashboard, goals, checkin, progress
        │   ├── manager/        # dashboard, goals, checkins, analytics
        │   └── admin/          # dashboard, users, goals, cycles, analytics, audit
        ├── components/
        │   ├── goals/          # GoalCard, CreateGoalModal, AchievementModal
        │   ├── layout/         # Sidebar, TopBar, AppLayout
        │   └── ui/             # Button, Card, Dialog, Toast, Skeleton, Progress...
        ├── hooks/              # useCycleWindow (phase + window flags)
        ├── lib/                # api.ts, utils.ts, export.ts
        └── store/              # authStore (Zustand + localStorage persist)
```

---

## 🎯 Demo Walkthrough

See **[DEMO_SCRIPT.md](./DEMO_SCRIPT.md)** for the full 8-minute presentation guide.

### Employee Journey (Ananya Patel)
1. Dashboard → 5 approved goals, avg score ~97%, Q1+Q2 data
2. My Goals → see achievements, progress bars, shared KPI badge
3. Check-in → Q1/Q2 updates, manager comments visible
4. Progress → overall score, QoQ trend chart, radar chart

### Manager Journey (Rahul Mehta)
1. Dashboard → team stats, pending approval alert
2. Team Goals → approve with inline edit, return with feedback
3. Check-ins → per-employee, per-quarter, AI summarize
4. Analytics → team charts, AI insights

### Admin Journey (Priya Sharma)
1. Dashboard → org-wide KPIs across 2 departments
2. Users → create/edit/deactivate users
3. Cycles → create new cycle, update phase, activate/deactivate
4. Goals → unlock approved goal, push shared KPI
5. Analytics → export XLSX, generate AI insights
6. Audit → full change history per goal

---

## 📄 Submission Assets

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | This file |
| [FINAL_PROJECT_STATUS.md](./FINAL_PROJECT_STATUS.md) | Feature checklist + BRD compliance |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Full REST API reference |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Step-by-step deployment |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | 8-minute presentation walkthrough |

---

*Built with ❤️ for AtomQuest Hackathon 1.0 · PerformX v1.0*
