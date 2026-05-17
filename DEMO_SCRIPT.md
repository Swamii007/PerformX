# PerformX — Demo Script
### AtomQuest Hackathon 1.0 · Presentation Guide

**Total demo time:** ~8–10 minutes  
**Live URL:** https://frontend-cyan-alpha-15.vercel.app  
**Quick login:** Use the role buttons on the login page — no typing needed

---

## Opening (30 seconds)

> "PerformX is an AI-powered Goal Setting & Tracking Portal built for Atomberg's internal performance management. It replaces spreadsheets and email chains with a structured, role-aware workflow — from goal creation through quarterly check-ins to final scoring."

---

## Act 1 — Employee Journey (2.5 minutes)

### Login as Employee (Ananya Patel)
1. Open the app → click **"Employee"** quick-login button
2. Land on the **Employee Dashboard**

**Point out:**
- Welcome banner with cycle name and department
- 4 stat cards: Total Goals, Approved, Pending Review, Avg Score
- Weightage progress bar showing 100% (submission-ready)
- Goals list with live scores

### My Goals Page
3. Click **My Goals** in sidebar

**Point out:**
- 5 approved goals across different Thrust Areas (color-coded badges)
- Each card shows: Thrust Area, Weightage, Target, Latest Score
- Progress bar with color: green = completed, blue = on_track, amber = at_risk
- Q1 + Q2 achievement data visible
- Lock icon on approved goals

4. Click **Details** on the Revenue Growth goal → show quarterly achievements

### Check-in Page
5. Click **Check-in** in sidebar

**Point out:**
- Quarter selector (Q1/Q2/Q3/Q4)
- Per-goal achievement log with scores
- Manager comments visible inline
- "Update Achievement" button (active during check-in phase)

### Progress Page
6. Click **Progress** in sidebar

**Point out:**
- Overall weighted score (86.1%)
- QoQ trend line chart
- Per-goal score bars with color coding
- Radar chart showing thrust area coverage

---

## Act 2 — Manager Journey (2.5 minutes)

### Login as Manager (Rahul Mehta)
7. Click user avatar → **Switch Role** or go back to login → click **"Manager"** button

### Manager Dashboard
**Point out:**
- Team stats: 4 employees, pending approvals alert
- Team overview table with per-employee scores

### Team Goals — Approval Workflow
8. Click **Team Goals** → filter by **"Submitted"**

9. Find Vikram's "Reduce travel expenses" goal → click **Approve**
   - Show the inline edit modal: can adjust target value and weightage
   - Click Approve → toast notification fires
   - Goal moves to Approved state

10. Find another goal → click **Return**
    - Type feedback: "Please add a measurable success metric"
    - Click Return → employee gets notified

**Point out:** "Every approval/return is logged in the audit trail"

### Check-ins
11. Click **Check-ins** → select **Ananya Patel** → expand Q1

**Point out:**
- Per-goal comment thread
- AI Summarize button → click it → Gemini generates a summary paragraph
- "This saves managers 30 minutes per review cycle"

### Manager Analytics
12. Click **Analytics**

**Point out:**
- Team performance table with scores
- QoQ trend chart
- AI Insights button → click → natural language org analysis

---

## Act 3 — Admin Journey (2 minutes)

### Login as Admin (Priya Sharma)
13. Go back to login → click **"Admin"** button

### Admin Dashboard
**Point out:**
- Org-wide KPIs: 7 users, submission rate, approval rate, avg score
- Department breakdown

### User Management
14. Click **Users**

**Point out:**
- Full user table with role badges, department, manager assignment
- Edit button (pencil icon) → show edit modal: update department/manager
- Deactivate button → show confirmation dialog

15. Click **Add User** → fill in a new employee → Create
    - Toast: "User created successfully"

### Cycle Management
16. Click **Cycles**

**Point out:**
- Active cycle card with all 5 phase date ranges
- Update Phase button → change to Q2 Check-in → save
- New Cycle button → show the full creation form with date validation

### Goals — Admin Powers
17. Click **Goals**

**Point out:**
- All goals across all employees
- Unlock button on approved goals → show unlock modal with reason field
- Push Shared Goal button → show the shared KPI form
  - Select thrust area, title, target
  - Check multiple employees
  - Push → all selected employees get the goal in their sheet

### Analytics
18. Click **Analytics**

**Point out:**
- Org-wide KPI cards
- Department heatmap (Sales vs Engineering performance)
- Thrust area pie chart
- Export Report → downloads XLSX with all data

19. Click **Audit** → select a goal → show full change history

---

## Act 4 — AI Features Highlight (1 minute)

> "Three AI integrations powered by Google Gemini:"

1. **Goal Suggestions** — when creating a goal, click "Get AI Suggestions" → Gemini returns 3 contextual goal ideas based on thrust area + department
2. **Check-in Summarization** — manager clicks "AI Summarize" on a goal's comments → instant paragraph summary
3. **Analytics Insights** — admin clicks "Generate Insights" → natural language analysis of org performance with actionable recommendations

> "All three have graceful fallbacks — if the API is unavailable, the system continues working with pre-built responses."

---

## Closing (30 seconds)

> "PerformX covers the full performance management lifecycle — goal creation, approval, quarterly tracking, and analytics — with enterprise features like audit trails, shared KPIs, and role-based access control. It's built on Next.js + FastAPI + MongoDB, deployed on Vercel and Render, and ready for production use."

**Key differentiators:**
- 4 UoM types with automatic score computation
- Phase-gated windows (can't update Q2 during Q1 phase)
- Shared departmental KPIs with achievement sync
- Full audit trail for governance
- AI-powered at every touchpoint

---

## Quick Reference — Demo Credentials

| Role | Email | Password | Character |
|------|-------|----------|-----------|
| Admin | admin@performx.com | Admin@123 | Priya Sharma — HR head |
| Manager | manager@performx.com | Manager@123 | Rahul Mehta — Sales manager |
| Manager | manager2@performx.com | Manager@123 | Deepa Nair — Engineering manager |
| Employee | employee1@performx.com | Employee@123 | Ananya Patel — top performer |
| Employee | employee2@performx.com | Employee@123 | Vikram Singh — at-risk goals |
| Employee | employee3@performx.com | Employee@123 | Rohan Desai — Engineering |
| Employee | employee4@performx.com | Employee@123 | Sneha Kulkarni — strong performer |

---

## Backup Plan (if live demo fails)

- Screenshots saved in `/demo-screenshots/` folder
- Local dev environment: `npm run dev` + `uvicorn main:app --reload`
- Seed data always reproducible: `python -m app.seed`

---

*PerformX v1.0 · Built for AtomQuest Hackathon 1.0*
