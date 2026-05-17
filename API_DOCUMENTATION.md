# PerformX — API Documentation
**Base URL:** `https://your-backend.onrender.com/api/v1`  
**Interactive Docs:** `{BASE_URL}/docs` (Swagger UI)  
**Auth:** Bearer JWT token in `Authorization` header

---

## Authentication

### POST `/auth/login`
Login and receive a JWT token.

**Request:**
```json
{ "email": "user@company.com", "password": "Password@123" }
```
**Response:**
```json
{ "access_token": "eyJ...", "token_type": "bearer", "user": { "id": "...", "name": "...", "role": "employee", "department": "Sales" } }
```

### GET `/auth/me`
Get current authenticated user profile.

### POST `/auth/logout`
Stateless logout (client clears token).

---

## Goals

### POST `/goals/`
Create a new goal (employee only, during goal-setting phase).

**Request:**
```json
{
  "thrust_area": "Revenue Growth",
  "title": "Achieve ₹50L quarterly sales target",
  "description": "Optional description",
  "uom_type": "numeric_min",
  "target_value": 5000000,
  "weightage": 30,
  "cycle_id": "2025-2026"
}
```

**UoM Types:** `numeric_min` | `numeric_max` | `timeline` | `zero`  
**Thrust Areas:** `Revenue Growth` | `Cost Optimization` | `Customer Satisfaction` | `Operational Excellence` | `People Development` | `Innovation` | `Compliance & Risk` | `Quality`

### PATCH `/goals/{id}`
Update a draft or returned goal.

### DELETE `/goals/{id}`
Delete a draft goal.

### GET `/goals/my/{cycle_id}`
Get current employee's goals for a cycle.

### GET `/goals/team/{cycle_id}`
Get team goals (manager/admin). Query params: `status`, `employee_id`, `thrust_area`.

### POST `/goals/submit/{cycle_id}`
Submit all draft goals for approval. Validates total weightage = 100%.

### POST `/goals/{id}/approve`
Manager approves a goal (optionally edits target/weightage).

**Request:**
```json
{ "target_value": 5500000, "weightage": 35 }
```

### POST `/goals/{id}/return`
Manager returns a goal for rework.

**Request:**
```json
{ "rework_comment": "Please clarify the success metric." }
```

### POST `/goals/{id}/achievement`
Update quarterly achievement (employee, during check-in phase).

**Request:**
```json
{
  "quarter": "Q1",
  "actual_value": 4200000,
  "progress_status": "on_track",
  "notes": "Strong pipeline"
}
```

**Progress Status:** `not_started` | `on_track` | `completed` | `at_risk`

### POST `/goals/{id}/unlock`
Admin unlocks an approved goal for editing.

**Query param:** `reason=string`

### POST `/goals/shared`
Admin/Manager pushes a shared departmental KPI to multiple employees.

**Request:**
```json
{
  "thrust_area": "Customer Satisfaction",
  "title": "Achieve department NPS of 80",
  "uom_type": "numeric_min",
  "target_value": 80,
  "cycle_id": "2025-2026",
  "employee_ids": ["emp_id_1", "emp_id_2"],
  "default_weightage": 15
}
```

---

## Progress Score Formulas

| UoM Type | Formula |
|----------|---------|
| `numeric_min` (higher is better) | `(actual / target) × 100`, capped at 150 |
| `numeric_max` (lower is better) | `(target / actual) × 100`, capped at 150 |
| `timeline` | `100` if on/before target date, `-2%` per day late |
| `zero` | `100` if actual = 0, else `0` |

---

## Check-ins

### POST `/checkins/comment`
Manager adds a check-in comment for a goal.

**Request:**
```json
{
  "goal_id": "...",
  "quarter": "Q1",
  "comment": "Good progress, keep it up.",
  "employee_id": "..."
}
```

### GET `/checkins/goal/{goal_id}`
Get all comments for a specific goal. Query param: `quarter`.

### GET `/checkins/employee/{employee_id}`
Get all comments for an employee. Query params: `cycle_id`, `quarter`.

### POST `/checkins/summarize`
AI-powered summarization of check-in comments.

**Request:**
```json
{ "goal_id": "...", "quarter": "Q1", "employee_id": "..." }
```

### GET `/checkins/completion/{cycle_id}`
Check-in completion dashboard. Query param: `quarter`.

---

## Analytics

### GET `/analytics/overview/{cycle_id}`
High-level KPIs: total employees, submission rate, approval rate, avg progress score, thrust area breakdown.

### GET `/analytics/team-performance/{cycle_id}`
Per-employee performance scores. Query param: `quarter`.

### GET `/analytics/department-heatmap/{cycle_id}`
Average scores by department (admin only).

### GET `/analytics/quarterly-trend/{cycle_id}`
Quarter-on-quarter trend. Query param: `employee_id` (optional, for individual trend).

### GET `/analytics/ai-insights/{cycle_id}`
Gemini AI-generated natural language insights about org performance.

### GET `/analytics/audit-log/{goal_id}`
Full audit trail for a specific goal.

### GET `/analytics/export/{cycle_id}`
Export all goal data as JSON (use frontend to convert to XLSX).

---

## Users

### POST `/users/`
Create a new user (admin only).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "Password@123",
  "role": "employee",
  "department": "Sales",
  "manager_id": "optional_manager_id"
}
```

### GET `/users/`
List all users (admin) or team members (manager).

### GET `/users/team`
Get direct reports for the current manager.

### GET `/users/{id}`
Get a specific user.

### PATCH `/users/{id}`
Update user details (admin only). Supports: `name`, `department`, `manager_id`, `is_active`.

---

## Cycles

### POST `/cycles/`
Create a new performance cycle (admin only).

**Request:**
```json
{
  "id": "2026-2027",
  "name": "FY 2026-2027",
  "goal_setting_start": "2026-04-01T00:00:00",
  "goal_setting_end": "2026-05-31T00:00:00",
  "q1_start": "2026-06-01T00:00:00",
  "q1_end": "2026-08-31T00:00:00",
  "q2_start": "2026-09-01T00:00:00",
  "q2_end": "2026-11-30T00:00:00",
  "q3_start": "2026-12-01T00:00:00",
  "q3_end": "2027-02-28T00:00:00",
  "q4_start": "2027-03-01T00:00:00",
  "q4_end": "2027-03-31T00:00:00"
}
```

### GET `/cycles/`
List all cycles.

### GET `/cycles/active`
Get the currently active cycle.

### PATCH `/cycles/{id}`
Update cycle phase or active status.

**Request:**
```json
{ "current_phase": "q1_checkin", "is_active": true }
```

**Phases:** `goal_setting` | `q1_checkin` | `q2_checkin` | `q3_checkin` | `q4_annual` | `closed`

---

## AI

### POST `/ai/suggest-goals`
Get AI-generated goal suggestions.

**Request:**
```json
{
  "thrust_area": "Revenue Growth",
  "department": "Sales",
  "role": "employee",
  "existing_goals": ["Existing goal title 1"]
}
```

---

## Notifications

### GET `/notifications/`
Get latest notifications. Query param: `limit` (default 20).

### GET `/notifications/unread-count`
Get count of unread notifications.

### PATCH `/notifications/{id}/read`
Mark a notification as read.

### PATCH `/notifications/mark-all-read`
Mark all notifications as read.

---

## Error Responses

All errors follow this format:
```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized — invalid or expired token |
| 403 | Forbidden — insufficient role permissions |
| 404 | Resource not found |
| 422 | Unprocessable entity — request body validation failed |
| 500 | Internal server error |

---

*PerformX API v1.0 · Built with FastAPI + MongoDB Atlas*
