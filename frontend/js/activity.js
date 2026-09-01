/* Real-time Event Contract (spec section 8). The backend currently emits the subset
 * produced by dashboard actions (task/agent/verification/issue lifecycle); the full
 * canonical list is offered here as a filter so the feed is ready to receive every
 * event type once a WebSocket producer (WS /api/v1/ws/tasks/{id}) is wired up. */
const CANONICAL_EVENTS = [
  "task.created", "plan.created", "plan.revised",
  "agent.spawned", "agent.assigned", "agent.running", "agent.completed", "agent.terminated",
  "tool.started", "tool.completed", "tool.failed",
  "verification.started", "verification.passed", "verification.failed",
  "reflection.created", "replan.approved", "replan.rejected",
  "memory.retrieved", "memory.written", "walkthrough.ready", "issue.updated",
];

const EVENT_ICON_MAP = {
  "task.created": ["bi-plus-circle", "var(--accent)"],
  "plan.created": ["bi-diagram-2", "var(--accent)"],
  "plan.revised": ["bi-diagram-2", "var(--warning)"],
  "agent.spawned": ["bi-person-plus", "var(--info)"],
  "agent.assigned": ["bi-person-check", "var(--info)"],
  "agent.running": ["bi-arrow-repeat", "var(--info)"],
  "agent.completed": ["bi-flag", "var(--success)"],
  "agent.terminated": ["bi-stop-circle", "var(--text-muted)"],
  "tool.started": ["bi-tools", "var(--info)"],
  "tool.completed": ["bi-check2-square", "var(--success)"],
  "tool.failed": ["bi-x-square", "var(--danger)"],
  "verification.started": ["bi-search", "var(--purple)"],
  "verification.passed": ["bi-check2-circle", "var(--success)"],
  "verification.failed": ["bi-x-circle", "var(--danger)"],
  "reflection.created": ["bi-lightbulb", "var(--warning)"],
  "replan.approved": ["bi-check-square", "var(--success)"],
  "replan.rejected": ["bi-slash-square", "var(--danger)"],
  "memory.retrieved": ["bi-archive", "var(--info)"],
  "memory.written": ["bi-archive-fill", "var(--purple)"],
  "walkthrough.ready": ["bi-flag-fill", "var(--success)"],
  "issue.updated": ["bi-bug", "var(--warning)"],
};

let _activityTimer = null;

async function initActivityFilters() {
  const meta = await loadMetaCache();
  const typeSel = document.getElementById("actFEventType");
  CANONICAL_EVENTS.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSel.appendChild(opt);
  });
  const devSel = document.getElementById("actFDeveloper");
  meta.developers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    devSel.appendChild(opt);
  });
  ["actFEventType", "actFDeveloper"].forEach((id) => document.getElementById(id).addEventListener("change", loadActivity));
}

async function loadActivity() {
  const container = document.getElementById("activityFeed");
  try {
    const params = {
      event_type: document.getElementById("actFEventType").value,
      developer_id: document.getElementById("actFDeveloper").value,
      limit: 150,
    };
    const events = await Api.getActivities(params);
    if (!events.length) {
      renderEmpty(container, "No matching events yet.");
      return;
    }
    container.innerHTML = events.map((e) => {
      const [icon, color] = EVENT_ICON_MAP[e.event_type] || ["bi-dot", "var(--text-muted)"];
      return `
      <div class="activity-item">
        <div class="activity-icon" style="background-color:${color}22;color:${color};"><i class="bi ${icon}"></i></div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between flex-wrap">
            <span class="activity-event">${escapeHtml(e.event_type)}</span>
            <span class="activity-meta">${formatDateTime(e.timestamp)}</span>
          </div>
          <div class="small mt-1">${escapeHtml(e.payload)}</div>
          <div class="activity-meta mt-1">
            ${e.developer_name ? `<i class="bi bi-person"></i> ${escapeHtml(e.developer_name)} - ` : ""}
            <i class="bi bi-broadcast-pin"></i> ${escapeHtml(e.source)}
            ${e.work_item_id ? ` - <a href="work-items.html">Work Item #${e.work_item_id}</a>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
  } catch (err) {
    renderError(container, err.message);
  }
}

document.addEventListener("auth:ready", async () => {
  await initActivityFilters();
  await loadActivity();
  _activityTimer = setInterval(loadActivity, 20000);
});
document.addEventListener("workitem:saved", loadActivity);
