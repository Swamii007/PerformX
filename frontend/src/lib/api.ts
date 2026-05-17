import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("performx_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("performx_token");
      localStorage.removeItem("performx_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalsApi = {
  create: (data: Record<string, unknown>) => api.post("/goals/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  getMyGoals: (cycleId: string) => api.get(`/goals/my/${cycleId}`),
  getTeamGoals: (cycleId: string, params?: Record<string, string>) =>
    api.get(`/goals/team/${cycleId}`, { params }),
  getGoal: (id: string) => api.get(`/goals/${id}`),
  submit: (cycleId: string) => api.post(`/goals/submit/${cycleId}`),
  approve: (id: string, data?: Record<string, unknown>) =>
    api.post(`/goals/${id}/approve`, data || {}),
  return: (id: string, data: Record<string, unknown>) =>
    api.post(`/goals/${id}/return`, data),
  updateAchievement: (id: string, data: Record<string, unknown>) =>
    api.post(`/goals/${id}/achievement`, data),
  unlock: (id: string, reason: string) =>
    api.post(`/goals/${id}/unlock`, null, { params: { reason } }),
  createShared: (data: Record<string, unknown>) => api.post("/goals/shared", data),
};

// ── Check-ins ─────────────────────────────────────────────────────────────────
export const checkinsApi = {
  addComment: (data: Record<string, unknown>) => api.post("/checkins/comment", data),
  getGoalCheckins: (goalId: string, quarter?: string) =>
    api.get(`/checkins/goal/${goalId}`, { params: quarter ? { quarter } : {} }),
  getEmployeeCheckins: (employeeId: string, cycleId: string, quarter?: string) =>
    api.get(`/checkins/employee/${employeeId}`, { params: { cycle_id: cycleId, ...(quarter ? { quarter } : {}) } }),
  summarize: (data: Record<string, unknown>) => api.post("/checkins/summarize", data),
  getCompletion: (cycleId: string, quarter: string) =>
    api.get(`/checkins/completion/${cycleId}`, { params: { quarter } }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getOverview: (cycleId: string, department?: string) =>
    api.get(`/analytics/overview/${cycleId}`, { params: department ? { department } : {} }),
  getTeamPerformance: (cycleId: string, quarter?: string) =>
    api.get(`/analytics/team-performance/${cycleId}`, { params: quarter ? { quarter } : {} }),
  getDeptHeatmap: (cycleId: string) => api.get(`/analytics/department-heatmap/${cycleId}`),
  getQuarterlyTrend: (cycleId: string, employeeId?: string) =>
    api.get(`/analytics/quarterly-trend/${cycleId}`, { params: employeeId ? { employee_id: employeeId } : {} }),
  getAiInsights: (cycleId: string) => api.get(`/analytics/ai-insights/${cycleId}`),
  getAuditLog: (goalId: string) => api.get(`/analytics/audit-log/${goalId}`),
  exportReport: (cycleId: string) => api.get(`/analytics/export/${cycleId}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>) => api.get("/users/", { params }),
  getTeam: () => api.get("/users/team"),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post("/users/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/users/${id}`, data),
};

// ── Cycles ────────────────────────────────────────────────────────────────────
export const cyclesApi = {
  list: () => api.get("/cycles/"),
  getActive: () => api.get("/cycles/active"),
  create: (data: Record<string, unknown>) => api.post("/cycles/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/cycles/${id}`, data),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  suggestGoals: (data: Record<string, unknown>) => api.post("/ai/suggest-goals", data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: (limit = 20) => api.get(`/notifications/?limit=${limit}`),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/mark-all-read"),
};
