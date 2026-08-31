let _vCache = {};

async function initVerificationFilters() {
  const meta = await loadMetaCache();
  const sel = document.getElementById("vFDeveloper");
  meta.developers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
  ["vFDeveloper", "vFPassed"].forEach((id) => document.getElementById(id).addEventListener("change", loadVerifications));
}

async function loadVerifications() {
  const tbody = document.getElementById("verificationBody");
  try {
    const params = {
      developer_id: document.getElementById("vFDeveloper").value,
      passed: document.getElementById("vFPassed").value,
    };
    const data = await Api.getVerifications(params);
    document.getElementById("vPassed").textContent = data.summary.passed;
    document.getElementById("vFailed").textContent = data.summary.failed;
    document.getElementById("vPending").textContent = data.summary.pending;

    if (!data.items.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-patch-check"></i>No verification records yet. They are created automatically when work is marked Passed or Failed.</div></td></tr>`;
      return;
    }

    _vCache = {};
    tbody.innerHTML = data.items.map((v) => {
      _vCache[v.id] = v;
      return `
      <tr>
        <td>#${v.id}</td>
        <td>${escapeHtml(v.module || "-")} <span class="text-muted-soft small">(WI #${v.work_item_id})</span></td>
        <td>${escapeHtml(v.developer_name || "-")}</td>
        <td class="small text-muted-soft text-truncate" style="max-width:220px;">${escapeHtml(v.checks)}</td>
        <td>${v.passed ? '<span class="badge-status badge-passed">Passed</span>' : '<span class="badge-status badge-failed">Failed</span>'}</td>
        <td class="small text-muted-soft">${formatDateTime(v.timestamp)}</td>
        <td><button class="btn btn-sm btn-outline-soft" onclick="viewVerification(${v.id})"><i class="bi bi-eye"></i></button></td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger mb-0">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

function viewVerification(id) {
  const v = _vCache[id];
  if (!v) return;
  document.getElementById("verificationDetailBody").innerHTML = `
    <div class="row g-3">
      <div class="col-6"><div class="small text-muted-soft">Work Item</div><div>#${v.work_item_id} - ${escapeHtml(v.module || "-")}</div></div>
      <div class="col-6"><div class="small text-muted-soft">Developer</div><div>${escapeHtml(v.developer_name || "-")}</div></div>
      <div class="col-6"><div class="small text-muted-soft">Result</div><div>${v.passed ? '<span class="badge-status badge-passed">Passed</span>' : '<span class="badge-status badge-failed">Failed</span>'}</div></div>
      <div class="col-6"><div class="small text-muted-soft">Timestamp</div><div>${formatDateTime(v.timestamp)}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Checks</div><div>${escapeHtml(v.checks)}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Success Criteria</div><div>${escapeHtml(v.criteria) || "-"}</div></div>
      <div class="col-12"><div class="small text-muted-soft">Evidence</div><pre class="evidence-block">${escapeHtml(v.evidence) || "No evidence"}</pre></div>
      ${!v.passed ? `<div class="col-12"><div class="small text-muted-soft">Failures</div><div class="text-danger">${escapeHtml(v.failures) || "Unspecified"}</div></div>` : ""}
    </div>`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("verificationDetailModal")).show();
}

document.addEventListener("DOMContentLoaded", async () => {
  await initVerificationFilters();
  await loadVerifications();
});
document.addEventListener("workitem:saved", loadVerifications);
