# PerformX — Deployment Guide

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend build |
| Python | 3.11+ | Backend runtime |
| MongoDB Atlas | Free tier+ | Database |
| Google AI Studio | Free | Gemini API key |
| GitHub account | — | Source hosting |

---

## Step 1 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free cluster
2. **Database Access** → Add user with `readWriteAnyDatabase` role → note username/password
3. **Network Access** → Add IP `0.0.0.0/0` (allow all — required for Render)
4. **Connect** → Drivers → copy connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/performx
   ```
5. Replace `<user>` and `<password>` with your credentials

---

## Step 2 — Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API Key** → Create API key in new project
3. Copy the key (starts with `AIza...`)

---

## Step 3 — Backend Deployment (Render)

### 3a. Push to GitHub
```bash
cd backend
git init
git add .
git commit -m "Initial PerformX backend"
git remote add origin https://github.com/YOUR_USERNAME/performx-backend.git
git push -u origin main
```

### 3b. Create Render Web Service
1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `performx-api`
   - **Region:** Singapore (closest to India)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank if backend is root, or set to `backend`)*
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free

### 3c. Set Environment Variables on Render
Go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/performx` |
| `JWT_SECRET` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `FRONTEND_URL` | `https://your-app.vercel.app` *(set after Vercel deploy)* |
| `ENVIRONMENT` | `production` |
| `SMTP_HOST` | `smtp.gmail.com` *(optional)* |
| `SMTP_PORT` | `587` *(optional)* |
| `SMTP_USER` | Your Gmail address *(optional)* |
| `SMTP_PASSWORD` | Gmail App Password *(optional)* |

### 3d. Deploy & Seed
1. Click **Deploy** — wait ~3 minutes for first build
2. Once live, note your URL: `https://performx-api.onrender.com`
3. Seed demo data via the Render **Shell** tab:
   ```bash
   python -m app.seed
   ```
4. Verify: visit `https://performx-api.onrender.com/health` → should return `{"status":"healthy"}`
5. API docs: `https://performx-api.onrender.com/docs`

> **Note:** Free Render instances spin down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) for always-on.

---

## Step 4 — Frontend Deployment (Vercel)

### 4a. Push to GitHub
```bash
cd frontend
git init
git add .
git commit -m "Initial PerformX frontend"
git remote add origin https://github.com/YOUR_USERNAME/performx-frontend.git
git push -u origin main
```

### 4b. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your `performx-frontend` GitHub repo
3. Configure:
   - **Framework Preset:** Next.js *(auto-detected)*
   - **Root Directory:** *(leave blank)*
   - **Build Command:** `npm run build` *(default)*
   - **Output Directory:** `.next` *(default)*

### 4c. Set Environment Variables on Vercel
Go to **Settings → Environment Variables**:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://performx-api.onrender.com/api/v1` | Production |

### 4d. Deploy
1. Click **Deploy** — Vercel builds and deploys in ~2 minutes
2. Note your URL: `https://performx-xyz.vercel.app`

### 4e. Update Backend CORS
Go back to Render → Environment Variables → update `FRONTEND_URL`:
```
FRONTEND_URL=https://performx-xyz.vercel.app
```
Trigger a redeploy on Render.

---

## Step 5 — Verify Production

Run through this checklist:

- [ ] `GET /health` returns `{"status":"healthy"}`
- [ ] Login page loads at your Vercel URL
- [ ] Quick-login buttons work for all 4 demo accounts
- [ ] Employee can view goals and progress
- [ ] Manager can approve/return goals
- [ ] Admin analytics charts render with data
- [ ] AI insights button generates text
- [ ] Dark mode toggle works
- [ ] Export button downloads XLSX file

---

## Environment Variables Reference

### Backend (`.env` / Render)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | — | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | — | Random 32+ char secret for JWT signing |
| `GEMINI_API_KEY` | ⚠️ | None | Google AI Studio key (AI features degrade gracefully without it) |
| `FRONTEND_URL` | ✅ | `http://localhost:3000` | Your Vercel URL for CORS |
| `ENVIRONMENT` | — | `development` | Set to `production` on Render |
| `JWT_EXPIRE_MINUTES` | — | `1440` | Token expiry (24h default) |
| `SMTP_HOST` | — | `smtp.gmail.com` | Email server host |
| `SMTP_PORT` | — | `587` | Email server port |
| `SMTP_USER` | — | None | Gmail address for sending emails |
| `SMTP_PASSWORD` | — | None | Gmail App Password (not your login password) |

### Frontend (`.env.local` / Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Full backend URL + `/api/v1` |

---

## Gmail App Password Setup (Optional — for Email Notifications)

1. Enable 2FA on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create app password for "Mail"
4. Use the 16-char password as `SMTP_PASSWORD`

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
cp .env.example .env          # fill in MONGODB_URI and JWT_SECRET
python -m app.seed            # load demo data
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
# .env.local already points to localhost:8000
npm run dev
```

Open **http://localhost:3000**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors in browser | Ensure `FRONTEND_URL` on Render matches your exact Vercel URL |
| 401 on all API calls | Check `NEXT_PUBLIC_API_URL` is set correctly on Vercel |
| AI insights not working | Verify `GEMINI_API_KEY` is set; fallback text will show if missing |
| Render cold start slow | First request after 15min sleep takes ~30s — expected on free tier |
| MongoDB connection refused | Check Atlas Network Access has `0.0.0.0/0` allowed |
| Seed fails | Ensure `MONGODB_URI` is correct and Atlas cluster is running |

---

*PerformX v1.0 · AtomQuest Hackathon 1.0*
