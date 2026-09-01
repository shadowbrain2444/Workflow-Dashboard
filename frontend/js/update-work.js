/* Shared "Update Work" modal - the primary write path for the whole dashboard.
 * Injected once per page by app.js. Dispatches a `workitem:saved` event on
 * document so every page can refresh its own view after a save.
 */
let _metaCache = null;
let _editingId = null;

function renderUpdateWorkModal() {
  if (document.getElementById("updateWorkModal")) return;
  const host = document.createElement("div");
  host.innerHTML = `
  <div class="modal fade" id="updateWorkModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <form id="updateWorkForm" novalidate>
          <div class="modal-header">
            <h5 class="modal-title" id="updateWorkModalTitle"><i class="bi bi-pencil-square me-2"></i>Update Work</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div id="updateWorkAlert" class="alert alert-danger d-none" role="alert"></div>
            <input type="hidden" id="uwId" />
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">Developer *</label>
                <select class="form-select" id="uwDeveloper" required>
                  <option value="">Select developer...</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Date *</label>
                <input type="date" class="form-control" id="uwDate" required />
              </div>
              <div class="col-md-4">
                <label class="form-label">Day *</label>
                <select class="form-select" id="uwDay" required>
                  <option value="">Select day...</option>
                  ${[1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}">Day ${d}</option>`).join("")}
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">Module *</label>
                <input class="form-control" id="uwModule" list="uwModuleList" required maxlength="128" />
                <datalist id="uwModuleList"></datalist>
              </div>
              <div class="col-md-3">
                <label class="form-label">Work Status *</label>
                <select class="form-select" id="uwStatus" required></select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Verification Status *</label>
                <select class="form-select" id="uwVerification" required></select>
              </div>

              <div class="col-12">
                <label class="form-label">Work Description *</label>
                <textarea class="form-control" id="uwDescription" rows="2" required></textarea>
              </div>
              <div class="col-12">
                <label class="form-label">Tasks Completed</label>
                <textarea class="form-control" id="uwTasksCompleted" rows="2"></textarea>
              </div>

              <div class="col-12">
                <label class="form-label">API(s) Worked On</label>
                <select class="form-select" id="uwApis" multiple size="4"></select>
                <div class="form-text text-muted-soft">Hold Ctrl / Cmd to select multiple.</div>
              </div>

              <div class="col-12">
                <label class="form-label">Evidence</label>
                <textarea class="form-control" id="uwEvidence" rows="2" placeholder="Test results, logs, diffs, screenshots reference..."></textarea>
              </div>
              <div class="col-12">
                <label class="form-label">Issues / Blockers</label>
                <textarea class="form-control" id="uwIssues" rows="2"></textarea>
              </div>
              <div class="col-12">
                <label class="form-label">Next Planned Work</label>
                <textarea class="form-control" id="uwNextWork" rows="2"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-soft" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-accent" id="uwSaveBtn"><i class="bi bi-save me-1"></i>Save Work</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
  document.body.appendChild(host.firstElementChild);
}

async function loadMetaCache() {
  if (_metaCache) return _metaCache;
  _metaCache = await Api.getMeta();
  return _metaCache;
}

function initUpdateWorkModal() {
  const form = document.getElementById("updateWorkForm");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "true";

  loadMetaCache().then((meta) => {
    const devSel = document.getElementById("uwDeveloper");
    meta.developers.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      devSel.appendChild(opt);
    });

    const statusSel = document.getElementById("uwStatus");
    meta.statuses.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      statusSel.appendChild(opt);
    });

    const verSel = document.getElementById("uwVerification");
    meta.verification_statuses.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      verSel.appendChild(opt);
    });

    const apiSel = document.getElementById("uwApis");
    meta.apis.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.endpoint;
      opt.dataset.owner = a.owner_id;
      apiSel.appendChild(opt);
    });

    const moduleList = document.getElementById("uwModuleList");
    meta.modules.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      moduleList.appendChild(opt);
    });
  });

  form.addEventListener("submit", handleUpdateWorkSubmit);
}

function resetUpdateWorkForm() {
  const form = document.getElementById("updateWorkForm");
  form.reset();
  document.getElementById("uwId").value = "";
  document.getElementById("uwDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("updateWorkAlert").classList.add("d-none");
  Array.from(document.getElementById("uwApis").options).forEach((o) => (o.selected = false));
  _editingId = null;
  applyDeveloperFieldLock();
}

/* A developer account can only ever log/edit their own work - the Developer
 * field is locked to their own name so there's no illusion of choice, even
 * though the backend is the real enforcement (it ignores/rejects any other
 * developer_id from a non-admin request regardless of what the UI sends). */
function applyDeveloperFieldLock() {
  const devSel = document.getElementById("uwDeveloper");
  if (isAdmin()) {
    devSel.disabled = false;
    return;
  }
  if (CURRENT_USER && CURRENT_USER.developer_id) {
    devSel.value = String(CURRENT_USER.developer_id);
  }
  devSel.disabled = true;
}

function openUpdateWorkModal(workItem) {
  loadMetaCache().then(() => {
    resetUpdateWorkForm();
    const titleEl = document.getElementById("updateWorkModalTitle");

    if (workItem) {
      _editingId = workItem.id;
      titleEl.innerHTML = `<i class="bi bi-pencil-square me-2"></i>Update Work - Entry #${workItem.id}`;
      document.getElementById("uwId").value = workItem.id;
      document.getElementById("uwDeveloper").value = workItem.developer_id;
      document.getElementById("uwDate").value = workItem.date;
      document.getElementById("uwDay").value = workItem.day;
      document.getElementById("uwModule").value = workItem.module;
      document.getElementById("uwStatus").value = workItem.status;
      document.getElementById("uwVerification").value = workItem.verification_status;
      document.getElementById("uwDescription").value = workItem.description;
      document.getElementById("uwTasksCompleted").value = workItem.tasks_completed;
      document.getElementById("uwEvidence").value = workItem.evidence;
      document.getElementById("uwIssues").value = workItem.issues_blockers;
      document.getElementById("uwNextWork").value = workItem.next_planned_work;

      const apiSel = document.getElementById("uwApis");
      const wanted = new Set(workItem.apis || []);
      Array.from(apiSel.options).forEach((o) => {
        o.selected = wanted.has(o.textContent);
      });
    } else {
      titleEl.innerHTML = `<i class="bi bi-pencil-square me-2"></i>Update Work`;
    }

    const modalEl = document.getElementById("updateWorkModal");
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  });
}

async function handleUpdateWorkSubmit(e) {
  e.preventDefault();
  const alertBox = document.getElementById("updateWorkAlert");
  alertBox.classList.add("d-none");

  const form = document.getElementById("updateWorkForm");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const apiIds = Array.from(document.getElementById("uwApis").selectedOptions).map((o) => parseInt(o.value, 10));

  const payload = {
    developer_id: parseInt(document.getElementById("uwDeveloper").value, 10),
    day: parseInt(document.getElementById("uwDay").value, 10),
    date: document.getElementById("uwDate").value,
    module: document.getElementById("uwModule").value.trim(),
    description: document.getElementById("uwDescription").value.trim(),
    tasks_completed: document.getElementById("uwTasksCompleted").value.trim(),
    status: document.getElementById("uwStatus").value,
    evidence: document.getElementById("uwEvidence").value.trim(),
    verification_status: document.getElementById("uwVerification").value,
    issues_blockers: document.getElementById("uwIssues").value.trim(),
    next_planned_work: document.getElementById("uwNextWork").value.trim(),
    api_ids: apiIds,
  };

  const saveBtn = document.getElementById("uwSaveBtn");
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

  try {
    if (_editingId) {
      await Api.updateWorkItem(_editingId, payload);
    } else {
      await Api.createWorkItem(payload);
    }
    const modalEl = document.getElementById("updateWorkModal");
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    showToast(_editingId ? "Work item updated successfully." : "Work logged successfully.", "success");
    document.dispatchEvent(new CustomEvent("workitem:saved"));
  } catch (err) {
    alertBox.textContent = err.message || "Failed to save work item.";
    alertBox.classList.remove("d-none");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}
