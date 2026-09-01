let _selectedDay = null;
let _dailyProgressCache = null;

const KPI_DEFS = [
  { key: "overall_progress", label: "Overall Progress", icon: "bi-speedometer2", color: "var(--accent)", bg: "var(--accent-soft)", suffix: "%" },
  { key: "completed", label: "Completed", icon: "bi-check2-circle", color: "var(--success)", bg: "var(--success-soft)" },
  { key: "running", label: "In Progress", icon: "bi-arrow-repeat", color: "var(--info)", bg: "var(--info-soft)" },
  { key: "pending", label: "Pending", icon: "bi-hourglass-split", color: "var(--warning)", bg: "var(--warning-soft)" },
  { key: "failed", label: "Failed / Blocked", icon: "bi-exclamation-triangle", color: "var(--danger)", bg: "var(--danger-soft)" },
  { key: "verified", label: "Verified", icon: "bi-patch-check", color: "var(--purple)", bg: "var(--purple-soft)" },
];

async function loadDashboard() {
  await Promise.all([loadSummary(), loadDailyProgress(), loadBlockers(), loadRecentActivity()]);
}

async function loadSummary() {
  try {
    const summary = await Api.getSummary();
    document.getElementById("hdrDay").textContent = `Day ${summary.current_day} / 7`;
    document.getElementById("hdrDate").textContent = formatDate(summary.today);
    const statusEl = document.getElementById("hdrStatus");
    const statusCls = summary.project_status === "Completed" ? "badge-completed"
      : summary.project_status === "In Progress" ? "badge-running" : "badge-notstarted";
    statusEl.className = `badge-status ${statusCls}`;
    statusEl.textContent = summary.project_status;

    const kpiRow = document.getElementById("kpiRow");
    kpiRow.innerHTML = KPI_DEFS.map((def) => {
      const raw = summary[def.key];
      const value = def.suffix ? `${raw}${def.suffix}` : raw;
      return `
      <div class="col-6 col-md-4 col-xl-2">
        <div class="kpi-card">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="kpi-label">${def.label}</div>
              <div class="kpi-value">${value}</div>
            </div>
            <div class="kpi-icon" style="background-color:${def.bg};color:${def.color};">
              <i class="bi ${def.icon}"></i>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function loadDailyProgress() {
  const row = document.getElementById("dayPillRow");
  try {
    const daily = await Api.getDailyProgress();
    _dailyProgressCache = daily;
    if (_selectedDay === null) {
      const current = daily.find((d) => d.state === "current") || daily[0];
      _selectedDay = current.day;
    }
    row.innerHTML = daily.map((d) => {
      const dotClass = d.state === "completed" ? "dot-completed" : d.state === "current" ? "dot-current" : "dot-upcoming";
      return `
      <div class="col">
        <div class="day-pill ${d.day === _selectedDay ? "active" : ""}" onclick="selectDay(${d.day})">
          <div class="day-num">DAY ${d.day}</div>
          <div class="text-muted-soft small text-capitalize">${d.state}</div>
          <div class="day-status-dot ${dotClass}"></div>
        </div>
      </div>`;
    }).join("");
    renderDayPanel(_selectedDay);
  } catch (err) {
    renderError(row, err.message);
  }
}

function selectDay(day) {
  _selectedDay = day;
  document.querySelectorAll(".day-pill").forEach((el) => el.classList.remove("active"));
  loadDailyProgress();
}

function renderDayPanel(day) {
  const panel = document.getElementById("daySelectedPanel");
  if (!_dailyProgressCache) return;
  const dayData = _dailyProgressCache.find((d) => d.day === day);
  if (!dayData) {
    renderEmpty(panel, "No data for this day.");
    return;
  }

  const devNames = ["Bharath", "Dhanuja", "Anshif"];
  panel.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="fw-bold">Day ${day} Breakdown</div>
      <div class="text-muted-soft small">${dayData.completed}/${dayData.total} items completed - ${dayData.progress}%</div>
    </div>
    <div class="row g-3">
      ${devNames.map((name) => {
        const d = dayData.developers[name];
        if (!d) return "";
        const items = d.items || [];
        return `
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <div class="developer-avatar" style="width:32px;height:32px;font-size:0.8rem;background-color:${developerColor(name)};">${developerInitials(name)}</div>
                <div class="fw-bold">${name}</div>
              </div>
              <div class="d-flex gap-3 small text-muted-soft mb-2">
                <span><i class="bi bi-check2 text-success"></i> ${d.completed} done</span>
                <span><i class="bi bi-arrow-repeat text-info"></i> ${d.running} active</span>
                <span><i class="bi bi-hourglass text-warning"></i> ${d.pending} pending</span>
              </div>
              ${items.length ? items.map((i) => `
                <div class="border-top pt-2 mt-2" style="border-color:var(--border-color) !important;">
                  <div class="d-flex justify-content-between">
                    <span class="small fw-semibold">${escapeHtml(i.module)}</span>
                    ${statusBadge(i.status)}
                  </div>
                  <div class="small text-muted-soft">${escapeHtml(i.description)}</div>
                </div>
              `).join("") : `<div class="small text-muted-soft fst-italic">No work logged for this day yet.</div>`}
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}

async function loadBlockers() {
  const container = document.getElementById("blockersList");
  try {
    const issues = await Api.getIssues({ status: "Open" });
    if (!issues.length) {
      renderEmpty(container, "No open blockers. Everything is unblocked.", "bi-shield-check");
      return;
    }
    container.innerHTML = `<div class="table-responsive-wrapper"><table class="table table-sm table-hover mb-0">
      <thead><tr><th>Issue</th><th>Developer</th><th>Module</th><th>Priority</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${issues.slice(0, 8).map((i) => `
          <tr>
            <td>#${i.id} ${escapeHtml(i.description).slice(0, 40)}${i.description.length > 40 ? "..." : ""}</td>
            <td>${escapeHtml(i.developer_name || "-")}</td>
            <td>${escapeHtml(i.module)}</td>
            <td>${priorityBadge(i.priority)}</td>
            <td>${issueStatusBadge(i.status)}</td>
            <td>${ownsResource(i.developer_id) ? `<button class="btn btn-sm btn-outline-soft" onclick="resolveBlocker(${i.id})">Resolve</button>` : ""}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  } catch (err) {
    renderError(container, err.message);
  }
}

async function resolveBlocker(id) {
  try {
    await Api.updateIssue(id, { status: "Resolved", resolution: "Resolved from Dashboard." });
    showToast("Blocker marked resolved.", "success");
    loadBlockers();
    loadSummary();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

const EVENT_ICONS = {
  "task.created": ["bi-plus-circle", "var(--accent)"],
  "verification.passed": ["bi-check2-circle", "var(--success)"],
  "verification.failed": ["bi-x-circle", "var(--danger)"],
  "agent.completed": ["bi-flag", "var(--success)"],
  "agent.running": ["bi-arrow-repeat", "var(--info)"],
  "agent.terminated": ["bi-stop-circle", "var(--text-muted)"],
  "issue.updated": ["bi-bug", "var(--warning)"],
};

async function loadRecentActivity() {
  const container = document.getElementById("recentActivity");
  try {
    const activities = await Api.getActivities({ limit: 6 });
    if (!activities.length) {
      renderEmpty(container, "No activity yet.");
      return;
    }
    container.innerHTML = activities.map((a) => {
      const [icon, color] = EVENT_ICONS[a.event_type] || ["bi-dot", "var(--text-muted)"];
      return `
      <div class="activity-item">
        <div class="activity-icon" style="background-color:${color}22;color:${color};"><i class="bi ${icon}"></i></div>
        <div>
          <div class="activity-event">${escapeHtml(a.event_type)}</div>
          <div class="activity-meta">${escapeHtml(a.developer_name || "System")} - ${timeAgo(a.timestamp)}</div>
        </div>
      </div>`;
    }).join("");
  } catch (err) {
    renderError(container, err.message);
  }
}

document.addEventListener("auth:ready", loadDashboard);
document.addEventListener("workitem:saved", loadDashboard);
