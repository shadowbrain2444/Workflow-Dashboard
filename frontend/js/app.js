/* Shared shell (sidebar/topbar), formatting helpers, badges, toasts and modal utilities. */

const NAV_ITEMS = [
  { page: "dashboard", label: "Dashboard", href: "index.html", icon: "bi-speedometer2" },
  { page: "weekly-progress", label: "Weekly Progress", href: "weekly-progress.html", icon: "bi-graph-up" },
  { page: "team", label: "Team", href: "team.html", icon: "bi-people" },
  { page: "work-items", label: "Work Items", href: "work-items.html", icon: "bi-list-task" },
  { page: "architecture", label: "Architecture", href: "architecture.html", icon: "bi-diagram-3" },
  { page: "api-progress", label: "API Progress", href: "api-progress.html", icon: "bi-hdd-network" },
  { page: "verification", label: "Verification & Evidence", href: "verification.html", icon: "bi-patch-check" },
  { page: "activity", label: "Activity", href: "activity.html", icon: "bi-activity" },
  { page: "day7-completion", label: "Day-7 Completion", href: "day7-completion.html", icon: "bi-flag" },
];

const DEVELOPER_COLORS = {
  Bharath: "#3b82f6",
  Dhanuja: "#a855f7",
  Anshif: "#06b6d4",
};

function developerColor(name) {
  return DEVELOPER_COLORS[name] || "#64748b";
}

function developerInitials(name) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

function renderShell() {
  const activePage = document.body.getAttribute("data-page");
  const root = document.getElementById("sidebar-root");
  if (!root) return;

  const navHtml = NAV_ITEMS.map((item) => `
    <a class="nav-link ${item.page === activePage ? "active" : ""}" href="${item.href}">
      <i class="bi ${item.icon}"></i><span>${item.label}</span>
    </a>
  `).join("");

  root.innerHTML = `
    <div class="sidebar" id="appSidebar">
      <div class="sidebar-brand">
        <div class="brand-title">AUTONOMOUS AI<br/>WORKFORCE</div>
        <div class="brand-sub">7-Day Development Progress Dashboard</div>
      </div>
      <nav class="sidebar-nav">
        ${navHtml}
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-accent w-100" id="sidebarUpdateWorkBtn">
          <i class="bi bi-plus-lg"></i> Update Work
        </button>
      </div>
    </div>
  `;

  const btn = document.getElementById("sidebarUpdateWorkBtn");
  if (btn) btn.addEventListener("click", () => openUpdateWorkModal());
}

function initMobileToggle() {
  const toggle = document.getElementById("mobileToggle");
  const sidebar = document.getElementById("appSidebar");
  if (!toggle || !sidebar) return;
  toggle.addEventListener("click", () => sidebar.classList.toggle("show"));
  document.addEventListener("click", (e) => {
    if (window.innerWidth > 991 && !sidebar.classList.contains("show")) return;
    if (!sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      sidebar.classList.remove("show");
    }
  });
}

/* ---------- Badges ---------- */
function statusBadgeClass(status) {
  return "badge-status badge-" + String(status).toLowerCase().replace(/[^a-z]/g, "");
}

function statusBadge(status) {
  return `<span class="${statusBadgeClass(status)}">${escapeHtml(status)}</span>`;
}

function verificationBadge(v) {
  const cls = v === "Passed" ? "badge-passed" : v === "Failed" ? "badge-failed" : "badge-pending";
  return `<span class="badge-status ${cls}">${escapeHtml(v)}</span>`;
}

function priorityBadge(p) {
  return `<span class="badge-status badge-${String(p).toLowerCase()}">${escapeHtml(p)}</span>`;
}

function issueStatusBadge(s) {
  const cls = s === "Resolved" ? "badge-resolved" : s === "In Progress" ? "badge-inprogress" : "badge-open";
  return `<span class="badge-status ${cls}">${escapeHtml(s)}</span>`;
}

function apiStatusBadge(s) {
  const map = {
    "Not Started": "badge-notstarted",
    "In Progress": "badge-inprogress",
    Implemented: "badge-implemented",
    Verified: "badge-verified",
  };
  return `<span class="badge-status ${map[s] || "badge-notstarted"}">${escapeHtml(s)}</span>`;
}

function dodStatusBadge(s) {
  const map = {
    "Not Started": "badge-notstarted",
    "In Progress": "badge-inprogress",
    Verified: "badge-verified",
    Blocked: "badge-blocked",
  };
  return `<span class="badge-status ${map[s] || "badge-notstarted"}">${escapeHtml(s)}</span>`;
}

/* ---------- Formatting ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  if (isNaN(d)) return iso;
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "-";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso);
}

function debounce(fn, delay = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Loading / empty / error states ---------- */
function renderLoading(container, rows = 3) {
  container.innerHTML = `<div class="loading-state">
    ${Array.from({ length: rows }).map(() => `<div class="skeleton mb-2" style="height:38px;border-radius:8px;"></div>`).join("")}
  </div>`;
}

function renderEmpty(container, message = "No data yet.", icon = "bi-inbox") {
  container.innerHTML = `<div class="empty-state"><i class="bi ${icon}"></i>${escapeHtml(message)}</div>`;
}

function renderError(container, message = "Something went wrong.") {
  container.innerHTML = `<div class="alert alert-danger mb-0" role="alert">
    <i class="bi bi-exclamation-triangle me-2"></i>${escapeHtml(message)}
  </div>`;
}

/* ---------- Toasts ---------- */
function showToast(message, type = "success") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(host);
  }
  const icon = type === "success" ? "bi-check-circle-fill" : type === "danger" ? "bi-x-circle-fill" : "bi-info-circle-fill";
  const bg = type === "success" ? "text-bg-success" : type === "danger" ? "text-bg-danger" : "text-bg-primary";
  const el = document.createElement("div");
  el.className = `toast align-items-center ${bg} border-0`;
  el.setAttribute("role", "alert");
  el.innerHTML = `<div class="d-flex">
    <div class="toast-body"><i class="bi ${icon} me-2"></i>${escapeHtml(message)}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
  </div>`;
  host.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 4000 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  initMobileToggle();
  if (typeof renderUpdateWorkModal === "function") {
    renderUpdateWorkModal();
    initUpdateWorkModal();
  }
});
