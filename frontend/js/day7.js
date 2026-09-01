let _dodCache = {};

function canEditDod(item) {
  if (isAdmin()) return true;
  return item.owner_developer_id !== null && item.owner_developer_id === CURRENT_USER.developer_id;
}

async function loadDay7() {
  const list = document.getElementById("dodList");
  try {
    const items = await Api.getDoD();
    _dodCache = {};
    items.forEach((i) => (_dodCache[i.id] = i));

    const verified = items.filter((i) => i.status === "Verified").length;
    const pct = items.length ? Math.round((verified / items.length) * 100) : 0;
    document.getElementById("dodPercent").textContent = `${pct}%`;
    document.getElementById("dodProgressBar").style.width = `${pct}%`;
    document.getElementById("dodCounts").textContent =
      `${verified} of ${items.length} requirements verified - ` +
      `${items.filter((i) => i.status === "In Progress").length} in progress, ` +
      `${items.filter((i) => i.status === "Blocked").length} blocked, ` +
      `${items.filter((i) => i.status === "Not Started").length} not started`;

    list.innerHTML = items.map((item, idx) => {
      const editable = canEditDod(item);
      return `
      <div class="card mb-2">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div class="d-flex gap-2">
              <div class="fw-bold text-muted-soft">${idx + 1}.</div>
              <div>
                <div class="fw-semibold">${escapeHtml(item.requirement)}</div>
                <div class="small text-muted-soft mt-1">
                  <i class="bi bi-person"></i> ${escapeHtml(item.owner_label)}
                  <span class="ms-2"><i class="bi bi-clock-history"></i> ${timeAgo(item.updated_at)}</span>
                  ${!editable ? '<span class="ms-2"><i class="bi bi-lock"></i> read-only</span>' : ""}
                </div>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              ${editable
                ? `<select class="form-select form-select-sm status-select-inline" style="width:auto;" onchange="updateDodStatus(${item.id}, this.value)">
                     ${["Not Started", "In Progress", "Verified", "Blocked"].map((s) => `<option value="${s}" ${s === item.status ? "selected" : ""}>${s}</option>`).join("")}
                   </select>`
                : dodStatusBadge(item.status)}
            </div>
          </div>
          <div class="row g-2 mt-2">
            <div class="col-md-6">
              <label class="form-label mb-1 small">Evidence</label>
              <textarea class="form-control form-control-sm" rows="2" id="dodEvidence${item.id}" ${editable ? "" : "disabled"}>${escapeHtml(item.evidence)}</textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1 small">Notes</label>
              <textarea class="form-control form-control-sm" rows="2" id="dodNotes${item.id}" ${editable ? "" : "disabled"}>${escapeHtml(item.notes)}</textarea>
            </div>
          </div>
          ${editable ? `
          <div class="d-flex justify-content-end mt-2">
            <button class="btn btn-sm btn-outline-soft" onclick="saveDodDetails(${item.id})"><i class="bi bi-save me-1"></i>Save Evidence &amp; Notes</button>
          </div>` : ""}
        </div>
      </div>`;
    }).join("");
  } catch (err) {
    renderError(list, err.message);
  }
}

async function updateDodStatus(id, status) {
  try {
    await Api.updateDoD(id, { status });
    showToast(`Requirement #${id} marked ${status}.`, "success");
    loadDay7();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function saveDodDetails(id) {
  const evidence = document.getElementById(`dodEvidence${id}`).value;
  const notes = document.getElementById(`dodNotes${id}`).value;
  try {
    await Api.updateDoD(id, { evidence, notes });
    showToast("Evidence and notes saved.", "success");
    loadDay7();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

document.addEventListener("auth:ready", loadDay7);
document.addEventListener("workitem:saved", loadDay7);
