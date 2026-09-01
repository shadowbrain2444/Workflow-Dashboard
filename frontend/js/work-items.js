let _wiPage = 1;
const _wiPageSize = 15;
let _wiCache = {};

function getFilters() {
  const [sortBy, sortDir] = document.getElementById("fSort").value.split(":");
  return {
    search: document.getElementById("fSearch").value.trim(),
    developer_id: document.getElementById("fDeveloper").value,
    day: document.getElementById("fDay").value,
    status: document.getElementById("fStatus").value,
    module: document.getElementById("fModule").value,
    verification_status: document.getElementById("fVerification").value,
    date: document.getElementById("fDate").value,
    sort_by: sortBy,
    sort_dir: sortDir,
    page: _wiPage,
    page_size: _wiPageSize,
  };
}

async function initFilters() {
  const meta = await loadMetaCache();
  const devSel = document.getElementById("fDeveloper");
  meta.developers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    devSel.appendChild(opt);
  });

  const daySel = document.getElementById("fDay");
  for (let d = 1; d <= 7; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Day ${d}`;
    daySel.appendChild(opt);
  }

  const statusSel = document.getElementById("fStatus");
  meta.statuses.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    statusSel.appendChild(opt);
  });

  const verSel = document.getElementById("fVerification");
  meta.verification_statuses.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    verSel.appendChild(opt);
  });

  const modSel = document.getElementById("fModule");
  meta.modules.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modSel.appendChild(opt);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get("developer_id")) devSel.value = params.get("developer_id");

  ["fSearch", "fDay", "fStatus", "fModule", "fVerification", "fDate", "fSort"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => { _wiPage = 1; loadWorkItems(); });
  });
  document.getElementById("fDeveloper").addEventListener("change", () => { _wiPage = 1; loadWorkItems(); });
  document.getElementById("fSearch").addEventListener("input", debounce(() => { _wiPage = 1; loadWorkItems(); }));
  document.getElementById("fReset").addEventListener("click", () => {
    document.getElementById("fSearch").value = "";
    document.getElementById("fDeveloper").value = "";
    document.getElementById("fDay").value = "";
    document.getElementById("fStatus").value = "";
    document.getElementById("fModule").value = "";
    document.getElementById("fVerification").value = "";
    document.getElementById("fDate").value = "";
    document.getElementById("fSort").value = "updated_at:desc";
    _wiPage = 1;
    loadWorkItems();
  });
}

async function loadWorkItems() {
  const tbody = document.getElementById("workItemsBody");
  const resultCount = document.getElementById("resultCount");
  tbody.innerHTML = `<tr><td colspan="11" class="loading-state">Loading work items...</td></tr>`;
  try {
    const data = await Api.getWorkItems(getFilters());
    _wiCache = {};
    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><i class="bi bi-inbox"></i>No work items match these filters.</div></td></tr>`;
      resultCount.textContent = "0 results";
      renderPagination(0, 0);
      return;
    }
    resultCount.textContent = `${data.total} result${data.total === 1 ? "" : "s"} - page ${data.page} of ${Math.max(1, Math.ceil(data.total / data.page_size))}`;
    tbody.innerHTML = data.items.map((i) => {
      _wiCache[i.id] = i;
      return `
      <tr>
        <td>#${i.id}</td>
        <td><span class="d-inline-flex align-items-center gap-1"><span class="developer-avatar" style="width:22px;height:22px;font-size:0.6rem;background-color:${developerColor(i.developer_name)};">${developerInitials(i.developer_name)}</span>${escapeHtml(i.developer_name)}</span></td>
        <td>Day ${i.day}</td>
        <td>${formatDate(i.date)}</td>
        <td>${escapeHtml(i.module)}</td>
        <td style="max-width:220px;" class="text-truncate">${escapeHtml(i.description)}</td>
        <td>${statusBadge(i.status)}</td>
        <td>${i.apis.length ? `<span class="module-chip">${i.apis.length} API${i.apis.length > 1 ? "s" : ""}</span>` : '<span class="text-muted-soft small">-</span>'}</td>
        <td>${verificationBadge(i.verification_status)}</td>
        <td class="small text-muted-soft">${timeAgo(i.updated_at)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-soft" onclick="viewWorkItem(${i.id})"><i class="bi bi-eye"></i></button>
          ${ownsResource(i.developer_id) ? `<button class="btn btn-sm btn-outline-soft" onclick="editWorkItem(${i.id})"><i class="bi bi-pencil"></i></button>` : ""}
        </td>
      </tr>`;
    }).join("");
    renderPagination(data.total, data.page_size);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="alert alert-danger mb-0">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

function renderPagination(total, pageSize) {
  const pager = document.getElementById("pagination");
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || _wiPageSize)));
  if (totalPages <= 1) { pager.innerHTML = ""; return; }
  let html = "";
  const addItem = (label, page, disabled, active) => {
    html += `<li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
      <a class="page-link" href="#" onclick="event.preventDefault(); goToPage(${page});">${label}</a></li>`;
  };
  addItem("&laquo;", _wiPage - 1, _wiPage <= 1, false);
  const start = Math.max(1, _wiPage - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) addItem(p, p, false, p === _wiPage);
  addItem("&raquo;", _wiPage + 1, _wiPage >= totalPages, false);
  pager.innerHTML = html;
}

function goToPage(page) {
  _wiPage = page;
  loadWorkItems();
}

function viewWorkItem(id) {
  const i = _wiCache[id];
  if (!i) return;
  document.getElementById("viewWorkItemBody").innerHTML = `
    <div class="row g-3">
      <div class="col-md-6"><div class="small text-muted-soft">Developer</div><div class="fw-semibold">${escapeHtml(i.developer_name)}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Day / Date</div><div class="fw-semibold">Day ${i.day} - ${formatDate(i.date)}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Module</div><div class="fw-semibold">${escapeHtml(i.module)}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Status</div><div>${statusBadge(i.status)} ${verificationBadge(i.verification_status)}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Description</div><div>${escapeHtml(i.description) || "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Tasks Completed</div><div>${escapeHtml(i.tasks_completed) || "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">APIs Worked On</div><div>${i.apis.length ? i.apis.map((a) => `<span class="module-chip">${escapeHtml(a)}</span>`).join("") : "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Evidence</div><pre class="evidence-block">${escapeHtml(i.evidence) || "No evidence provided"}</pre></div>
      <div class="col-12"><div class="small text-muted-soft">Issues / Blockers</div><div>${escapeHtml(i.issues_blockers) || "None"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Next Planned Work</div><div>${escapeHtml(i.next_planned_work) || "-"}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Created</div><div class="small">${formatDateTime(i.created_at)}</div></div>
      <div class="col-md-6"><div class="small text-muted-soft">Updated</div><div class="small">${formatDateTime(i.updated_at)}</div></div>
    </div>
  `;
  const editBtn = document.getElementById("viewWorkItemEditBtn");
  if (ownsResource(i.developer_id)) {
    editBtn.classList.remove("d-none");
    editBtn.onclick = () => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("viewWorkItemModal")).hide();
      editWorkItem(id);
    };
  } else {
    editBtn.classList.add("d-none");
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById("viewWorkItemModal")).show();
}

function editWorkItem(id) {
  const i = _wiCache[id] || null;
  if (i) {
    openUpdateWorkModal(i);
  } else {
    Api.getWorkItem(id).then((full) => openUpdateWorkModal(full));
  }
}

document.addEventListener("auth:ready", async () => {
  await initFilters();
  await loadWorkItems();
});
document.addEventListener("workitem:saved", loadWorkItems);
