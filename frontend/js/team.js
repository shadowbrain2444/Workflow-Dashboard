async function loadTeam() {
  const row = document.getElementById("teamRow");
  try {
    const devs = await Api.getDeveloperProgress();
    row.innerHTML = devs.map((d) => `
      <div class="col-lg-4">
        <div class="card h-100 developer-card">
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="developer-avatar" style="background-color:${developerColor(d.name)};">${developerInitials(d.name)}</div>
              <div>
                <div class="fs-5 fw-bold">${escapeHtml(d.name)}</div>
                <div class="text-muted-soft small">${escapeHtml(d.responsibility)}</div>
              </div>
            </div>

            <div class="d-flex justify-content-between small mb-1">
              <span class="text-muted-soft">Progress</span>
              <span class="fw-bold">${d.progress}%</span>
            </div>
            <div class="progress progress-lg mb-3">
              <div class="progress-bar" role="progressbar" style="width:${d.progress}%;background-color:${developerColor(d.name)};"></div>
            </div>

            <div class="row g-2 mb-3">
              <div class="col-4"><div class="metric-tile"><div class="metric-value text-success">${d.completed}</div><div class="metric-label">Completed</div></div></div>
              <div class="col-4"><div class="metric-tile"><div class="metric-value text-info">${d.in_progress}</div><div class="metric-label">In Progress</div></div></div>
              <div class="col-4"><div class="metric-tile"><div class="metric-value text-warning">${d.pending}</div><div class="metric-label">Pending</div></div></div>
              <div class="col-4"><div class="metric-tile"><div class="metric-value text-danger">${d.blocked}</div><div class="metric-label">Blocked</div></div></div>
              <div class="col-4"><div class="metric-tile"><div class="metric-value" style="color:var(--purple);">${d.verified}</div><div class="metric-label">Verified</div></div></div>
              <div class="col-4"><div class="metric-tile"><div class="metric-value">${d.completed + d.in_progress + d.pending + d.blocked}</div><div class="metric-label">Total</div></div></div>
            </div>

            <div class="mb-3">
              <div class="small fw-semibold text-muted-soft mb-1">TRACKED MODULES</div>
              <div>${d.focus_areas.map((f) => `<span class="module-chip">${escapeHtml(f)}</span>`).join("")}</div>
            </div>

            <div class="mb-2">
              <div class="small fw-semibold text-muted-soft mb-1">CURRENT WORK</div>
              <div class="small">${d.current_work ? escapeHtml(d.current_work) : '<span class="text-muted-soft fst-italic">No active work item.</span>'}</div>
            </div>

            <div>
              <div class="small fw-semibold text-muted-soft mb-1">LATEST UPDATE</div>
              <div class="small text-muted-soft">${d.latest_update ? timeAgo(d.latest_update) : "-"}</div>
            </div>
          </div>
          <div class="card-footer bg-transparent" style="border-color:var(--border-color);">
            <a class="btn btn-sm btn-outline-soft w-100" href="work-items.html?developer_id=${d.id}">
              <i class="bi bi-list-task me-1"></i>View Work Items
            </a>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    renderError(row, err.message);
  }
}

document.addEventListener("DOMContentLoaded", loadTeam);
document.addEventListener("workitem:saved", loadTeam);
