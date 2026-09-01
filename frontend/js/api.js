/* Centralized API access layer for the Autonomous AI Workforce dashboard.
 * All backend communication flows through here - no page should call fetch() directly.
 * Every request carries the PHP session cookie (credentials: "include") so the
 * backend can authenticate and authorize it.
 */
const API_BASE = typeof DASHBOARD_API_BASE !== "undefined" ? DASHBOARD_API_BASE : "";
const BASE_PATH_PREFIX = API_BASE ? "" : (typeof APP_BASE_PATH !== "undefined" ? APP_BASE_PATH : "");

async function apiRequest(method, path, { params, body } = {}) {
  let url = API_BASE + BASE_PATH_PREFIX + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Network error: unable to reach the backend API. Is the server running?");
  }

  if (res.status === 401) {
    if (!location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        detail = Array.isArray(errJson.detail) ? errJson.detail.join("; ") : errJson.detail;
      }
    } catch (_) { /* no json body */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

const Api = {
  login: (email, password) => apiRequest("POST", "/api/auth/login", { body: { email, password } }),
  logout: () => apiRequest("POST", "/api/auth/logout"),
  me: () => apiRequest("GET", "/api/auth/me"),

  getSummary: () => apiRequest("GET", "/api/dashboard/summary"),
  getDailyProgress: () => apiRequest("GET", "/api/dashboard/daily-progress"),
  getDeveloperProgress: () => apiRequest("GET", "/api/dashboard/developer-progress"),

  getDevelopers: () => apiRequest("GET", "/api/developers"),
  getDeveloper: (id) => apiRequest("GET", `/api/developers/${id}`),

  getWorkItems: (params) => apiRequest("GET", "/api/work-items", { params }),
  getWorkItem: (id) => apiRequest("GET", `/api/work-items/${id}`),
  createWorkItem: (body) => apiRequest("POST", "/api/work-items", { body }),
  updateWorkItem: (id, body) => apiRequest("PUT", `/api/work-items/${id}`, { body }),
  deleteWorkItem: (id) => apiRequest("DELETE", `/api/work-items/${id}`),

  getApiProgress: (params) => apiRequest("GET", "/api/api-progress", { params }),

  getVerifications: (params) => apiRequest("GET", "/api/verification", { params }),

  getIssues: (params) => apiRequest("GET", "/api/issues", { params }),
  updateIssue: (id, body) => apiRequest("PUT", `/api/issues/${id}`, { body }),

  getActivities: (params) => apiRequest("GET", "/api/activities", { params }),

  getDoD: () => apiRequest("GET", "/api/definition-of-done"),
  updateDoD: (id, body) => apiRequest("PUT", `/api/definition-of-done/${id}`, { body }),

  getWeeklyProgress: () => apiRequest("GET", "/api/weekly-progress"),

  getMeta: () => apiRequest("GET", "/api/meta"),

  getUsers: () => apiRequest("GET", "/api/users"),
  createUser: (body) => apiRequest("POST", "/api/users", { body }),
  setUserActive: (id, isActive) => apiRequest("PUT", `/api/users/${id}/active`, { body: { is_active: isActive } }),
  setUserPassword: (id, password) => apiRequest("PUT", `/api/users/${id}/password`, { body: { password } }),
};
