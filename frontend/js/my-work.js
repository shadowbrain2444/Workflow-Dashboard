let _mwCache = {};

async function loadMyWork() {
  if (isAdmin()) {
    document.getElementById("adminNotice").classList.remove("d-none");
    document.getElementById("myWorkContent").classList.add("d-none");
    document.getElementById("myWorkUpdateBtn").classList.add("d-none");
    document.getElementById("myWorkTitle").textContent = "My Work";
    document.getElementById("myWorkSubtitle").textContent = "Admin accounts manage the whole team's work";
    return;
  }

  document.getElementById("myWorkTitle").textContent = `Welcome, ${CURRENT_USER.developer_name || CURRENT_USER.name}`;
  document.getElementById("myWorkSubtitle").textContent = "Your progress and work log";

  await Promise.all([loadMyKpis(), loadMyWorkTable()]);
}

async function loadMyKpis() {
  const row = document.getElementById("myWorkKpiRow");
  try {
    const devs = await Api.getDeveloperProgress();
    const mine = devs.find((d) => d.id === CURRENT_USER.developer_id);
    if (!mine) {
      renderEmpty(row, "No progress data yet.");
      return;
    }
    const defs = [
      { label: "Your Progress", value: `${mine.progress}%`, icon: "bi-speedometer2", color: "var(--accent)", bg: "var(--accent-soft)" },
      { label: "Completed", value: mine.completed, icon: "bi-check2-circle", color: "var(--success)", bg: "var(--success-soft)" },
      { label: "Running", value: mine.in_progress, icon: "bi-arrow-repeat", color: "var(--info)", bg: "var(--info-soft)" },
      { label: "Pending", value: mine.pending, icon: "bi-hourglass-split", color: "var(--warning)", bg: "var(--warning-soft)" },
      { label: "Blocked", value: mine.blocked, icon: "bi-exclamation-triangle", color: "var(--danger)", bg: "var(--danger-soft)" },
      { label: "Verified", value: mine.verified, icon: "bi-patch-check", color: "var(--purple)", bg: "var(--purple-soft)" },
    ];
    row.innerHTML = defs.map((d) => `
      <div class="col-6 col-md-4 col-xl-2">
        <div class="kpi-card">
          <div class="d-flex justify-content-between align-items-start">
            <div><div class="kpi-label">${d.label}</div><div class="kpi-value">${d.value}</div></div>
            <div class="kpi-icon" style="background-color:${d.bg};color:${d.color};"><i class="bi ${d.icon}"></i></div>
          </div>
        </div>
      </div>`).join("");
  } catch (err) {
    renderError(row, err.message);
  }
}

async function loadMyWorkTable() {
  const tbody = document.getElementById("myWorkBody");
  try {
    const data = await Api.getWorkItems({ developer_id: CURRENT_USER.developer_id, page_size: 100, sort_by: "updated_at", sort_dir: "desc" });
    document.getElementById("myWorkCount").textContent = `${data.total} item${data.total === 1 ? "" : "s"}`;
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="bi bi-inbox"></i>No work logged yet. Click "Update Work" to log your first entry.</div></td></tr>`;
      return;
    }
    _mwCache = {};
    tbody.innerHTML = data.items.map((i) => {
      _mwCache[i.id] = i;
      return `
      <tr>
        <td>#${i.id}</td>
        <td>Day ${i.day}</td>
        <td>${formatDate(i.date)}</td>
        <td>${escapeHtml(i.module)}</td>
        <td style="max-width:260px;" class="text-truncate">${escapeHtml(i.description)}</td>
        <td>${statusBadge(i.status)}</td>
        <td>${verificationBadge(i.verification_status)}</td>
        <td class="small text-muted-soft">${timeAgo(i.updated_at)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-soft" onclick="viewMyWorkItem(${i.id})"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-soft" onclick="editMyWorkItem(${i.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-soft text-danger" onclick="deleteMyWorkItem(${i.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="alert alert-danger mb-0">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

function viewMyWorkItem(id) {
  const i = _mwCache[id];
  if (!i) return;
  document.getElementById("viewMyWorkBody").innerHTML = `
    <div class="row g-3">
      <div class="col-md-6"><div class="small text-muted-soft">Day / Date</div><div class="fw-semibold">Day ${i.day} - ${formatDate(i.date)}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Module</div><div class="fw-semibold">${escapeHtml(i.module)}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Status</div><div>${statusBadge(i.status)} ${verificationBadge(i.verification_status)}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Description</div><div>${escapeHtml(i.description) || "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Tasks Completed</div><div>${escapeHtml(i.tasks_completed) || "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">APIs Worked On</div><div>${i.apis.length ? i.apis.map((a) => `<span class="module-chip">${escapeHtml(a)}</span>`).join("") : "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Evidence</div><pre class="evidence-block">${escapeHtml(i.evidence) || "No evidence provided"}</pre></div>
      <div class="col-12"><div class="small text-muted-soft">Issues / Blockers</div><div>${escapeHtml(i.issues_blockers) || "None"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Next Planned Work</div><div>${escapeHtml(i.next_planned_work) || "-"}</div></div>
    </div>
  `;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("viewMyWorkModal")).show();
}

function editMyWorkItem(id) {
  const i = _mwCache[id];
  if (i) openUpdateWorkModal(i);
}

async function deleteMyWorkItem(id) {
  if (!confirm("Delete this work item? This cannot be undone.")) return;
  try {
    await Api.deleteWorkItem(id);
    showToast("Work item deleted.", "success");
    loadMyWork();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

document.addEventListener("auth:ready", loadMyWork);
document.addEventListener("workitem:saved", loadMyWork);
