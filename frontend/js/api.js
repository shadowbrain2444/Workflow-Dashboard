/* Centralized API access layer for the Autonomous AI Workforce dashboard.
 * All backend communication flows through here - no page should call fetch() directly.
 */
const CONFIGURED_API_BASE = typeof DASHBOARD_API_BASE !== "undefined" ? DASHBOARD_API_BASE : "";

// Backend ports this app documents/defaults to (README "Running it"). Used only to
// auto-discover the backend when the frontend is served by a separate static server
// and DASHBOARD_API_BASE (frontend/js/config.js) was left at its default "" - so the
// common local-dev split-server setup works with zero manual configuration.
const AUTO_DISCOVER_PORTS = [8000, 8080, 5000, 3000];

let _apiBasePromise = null;

async function probeApiBase(base) {
  try {
    const res = await fetch(base + "/api/health", { cache: "no-store" });
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function resolveApiBase() {
  if (CONFIGURED_API_BASE) return CONFIGURED_API_BASE; // explicit override always wins

  if (await probeApiBase("")) return ""; // same-origin backend (the normal combined setup)

  for (const port of AUTO_DISCOVER_PORTS) {
    if (String(port) === window.location.port) continue; // that's the frontend's own port
    const candidate = `${window.location.protocol}//${window.location.hostname}:${port}`;
    if (await probeApiBase(candidate)) return candidate;
  }

  return ""; // couldn't find it; fall through to same-origin so errors are at least consistent
}

function getApiBase() {
  if (!_apiBasePromise) _apiBasePromise = resolveApiBase();
  return _apiBasePromise;
}

async function apiRequest(method, path, { params, body } = {}) {
  const base = await getApiBase();
  let url = base + path;
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
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Network error: unable to reach the backend API. Is the server running?");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        detail = typeof errJson.detail === "string"
          ? errJson.detail
          : errJson.detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
      }
    } catch (_) { /* no json body */ }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

const Api = {
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
  getVerification: (id) => apiRequest("GET", `/api/verification/${id}`),

  getIssues: (params) => apiRequest("GET", "/api/issues", { params }),
  updateIssue: (id, body) => apiRequest("PUT", `/api/issues/${id}`, { body }),

  getActivities: (params) => apiRequest("GET", "/api/activities", { params }),

  getDoD: () => apiRequest("GET", "/api/definition-of-done"),
  updateDoD: (id, body) => apiRequest("PUT", `/api/definition-of-done/${id}`, { body }),

  getWeeklyProgress: () => apiRequest("GET", "/api/weekly-progress"),

  getMeta: () => apiRequest("GET", "/api/meta"),
};
