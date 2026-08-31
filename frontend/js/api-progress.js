async function initApiFilters() {
  const meta = await loadMetaCache();
  const ownerSel = document.getElementById("apiFOwner");
  meta.developers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    ownerSel.appendChild(opt);
  });

  const statuses = ["Not Started", "In Progress", "Implemented", "Verified"];
  const statusSel = document.getElementById("apiFStatus");
  statuses.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSel.appendChild(opt);
  });

  ["apiFOwner", "apiFCategory", "apiFStatus"].forEach((id) => {
    document.getElementById(id).addEventListener("change", loadApiProgress);
  });
}

function renderApiKpis(items) {
  const counts = { "Not Started": 0, "In Progress": 0, Implemented: 0, Verified: 0 };
  let tested = 0;
  items.forEach((a) => {
    counts[a.status] = (counts[a.status] || 0) + 1;
    if (a.tested) tested++;
  });
  const defs = [
    { label: "Total APIs", value: items.length, color: "var(--accent)", bg: "var(--accent-soft)", icon: "bi-hdd-network" },
    { label: "Not Started", value: counts["Not Started"], color: "#94a3b8", bg: "rgba(148,163,184,0.15)", icon: "bi-dash-circle" },
    { label: "In Progress", value: counts["In Progress"], color: "var(--info)", bg: "var(--info-soft)", icon: "bi-arrow-repeat" },
    { label: "Implemented", value: counts["Implemented"], color: "var(--success)", bg: "var(--success-soft)", icon: "bi-check2-circle" },
    { label: "Verified", value: counts["Verified"], color: "var(--purple)", bg: "var(--purple-soft)", icon: "bi-patch-check" },
    { label: "Tested", value: tested, color: "var(--warning)", bg: "var(--warning-soft)", icon: "bi-clipboard-check" },
  ];
  document.getElementById("apiKpiRow").innerHTML = defs.map((d) => `
    <div class="col-6 col-md-4 col-xl-2">
      <div class="kpi-card">
        <div class="d-flex justify-content-between align-items-start">
          <div><div class="kpi-label">${d.label}</div><div class="kpi-value">${d.value}</div></div>
          <div class="kpi-icon" style="background-color:${d.bg};color:${d.color};"><i class="bi ${d.icon}"></i></div>
        </div>
      </div>
    </div>`).join("");
}

async function loadApiProgress() {
  const container = document.getElementById("apiProgressGroups");
  try {
    const params = {
      owner_id: document.getElementById("apiFOwner").value,
      category: document.getElementById("apiFCategory").value,
      status: document.getElementById("apiFStatus").value,
    };
    const items = await Api.getApiProgress(params);
    renderApiKpis(items);

    if (!items.length) {
      renderEmpty(container, "No APIs match these filters.");
      return;
    }

    const categorySel = document.getElementById("apiFCategory");
    if (!categorySel.dataset.filled) {
      const allItems = await Api.getApiProgress({});
      const cats = [...new Set(allItems.map((a) => a.category))].sort();
      cats.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        categorySel.appendChild(opt);
      });
      categorySel.dataset.filled = "true";
    }

    const byOwner = {};
    items.forEach((a) => {
      const key = a.owner_name || "Unassigned";
      byOwner[key] = byOwner[key] || [];
      byOwner[key].push(a);
    });

    container.innerHTML = Object.entries(byOwner).map(([owner, apis]) => `
      <div class="card mb-3">
        <div class="card-header d-flex align-items-center gap-2">
          <span class="developer-avatar" style="width:26px;height:26px;font-size:0.65rem;background-color:${developerColor(owner)};">${developerInitials(owner)}</span>
          ${escapeHtml(owner)} <span class="text-muted-soft small ms-1">(${apis.length} endpoints)</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive-wrapper">
            <table class="table table-hover mb-0">
              <thead><tr><th>Endpoint</th><th>Method</th><th>Category</th><th>Purpose</th><th>Status</th><th>Tested</th><th>Verification</th><th>Updated</th></tr></thead>
              <tbody>
                ${apis.map((a) => `
                  <tr>
                    <td><code>${escapeHtml(a.endpoint)}</code></td>
                    <td><span class="badge text-bg-secondary">${escapeHtml(a.method)}</span></td>
                    <td>${escapeHtml(a.category)}</td>
                    <td class="small text-muted-soft">${escapeHtml(a.purpose)}</td>
                    <td>${apiStatusBadge(a.status)}</td>
                    <td>${a.tested ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle text-muted-soft"></i>'}</td>
                    <td>${verificationBadge(a.verification_status)}</td>
                    <td class="small text-muted-soft">${timeAgo(a.updated_at)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    renderError(container, err.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initApiFilters();
  await loadApiProgress();
});
document.addEventListener("workitem:saved", loadApiProgress);
