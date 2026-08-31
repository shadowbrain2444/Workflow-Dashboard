const MAIN_PIPELINE = [
  { title: "USER", categories: [], staticNode: true },
  { title: "PERCEPTION", categories: ["Perception"] },
  { title: "MODE SELECTOR", categories: ["Task/Orchestrator"] },
  { title: "MASTER ORCHESTRATOR", categories: ["Task/Orchestrator"] },
  { title: "MEMORY + PLANNER", categories: ["Planner", "Memory"] },
  { title: "CAPABILITY MANAGER", categories: ["Capability Manager"] },
  { title: "GUARDRAIL", categories: ["Guardrail"] },
  { title: "TWIN / SPECIALIST", categories: ["Executive Twins", "Specialists"] },
  { title: "EXECUTION", categories: ["Execution", "Tool Executor", "Software Development", "Model Service"] },
  { title: "OBSERVATION / VERIFICATION", categories: ["Verification"] },
  { title: "OUTPUT / MEMORY", categories: ["Memory", "Project/Walkthrough"] },
];

const RECOVERY_PIPELINE = [
  { title: "VERIFICATION FAILURE", categories: ["Verification"] },
  { title: "REFLECTION", categories: ["Reflection/Re-plan"] },
  { title: "RE-PLAN GATE", categories: ["Reflection/Re-plan"] },
  { title: "SECURITY VALIDATION", categories: ["Guardrail"] },
  { title: "RETRY", categories: ["Reflection/Re-plan"] },
  { title: "EXECUTION", categories: ["Execution"] },
  { title: "VERIFICATION", categories: ["Verification"] },
];

let _allApis = [];

function nodeStats(categories) {
  if (!categories.length) return null;
  const apis = _allApis.filter((a) => categories.includes(a.category));
  if (!apis.length) return { total: 0, progress: 0, status: "Not Started", owners: [], apis: [] };
  const done = apis.filter((a) => a.status === "Implemented" || a.status === "Verified").length;
  const progress = Math.round((done / apis.length) * 100);
  const owners = [...new Set(apis.map((a) => a.owner_name).filter(Boolean))];
  let status = "Not Started";
  if (done === apis.length) status = "Verified";
  else if (apis.some((a) => a.status !== "Not Started")) status = "In Progress";
  return { total: apis.length, progress, status, owners, apis };
}

function nodeCard(node, extraClass = "") {
  if (node.staticNode) {
    return `<div class="arch-node ${extraClass}" style="cursor:default;">
      <div class="arch-module"><i class="bi bi-person-circle me-1"></i>${escapeHtml(node.title)}</div>
      <div class="arch-owner">Entry point</div>
    </div>`;
  }
  const stats = nodeStats(node.categories);
  const statusCls = stats.status === "Verified" ? "badge-verified" : stats.status === "In Progress" ? "badge-inprogress" : "badge-notstarted";
  return `<div class="arch-node ${extraClass}" onclick='showArchNode(${JSON.stringify(node.title)})'>
    <div class="arch-module">${escapeHtml(node.title)}</div>
    <div class="arch-owner">${stats.owners.length ? escapeHtml(stats.owners.join(" & ")) : "Unassigned"}</div>
    <div class="mt-2 d-flex justify-content-center gap-2 align-items-center">
      <span class="badge-status ${statusCls}">${stats.status}</span>
      <span class="small text-muted-soft">${stats.progress}%</span>
    </div>
  </div>`;
}

function renderPipeline(containerId, pipeline, extraClass = "") {
  const container = document.getElementById(containerId);
  container.innerHTML = pipeline.map((node, idx) => `
    ${nodeCard(node, extraClass)}
    ${idx < pipeline.length - 1 ? '<div class="arch-arrow"><i class="bi bi-arrow-down"></i></div>' : ""}
  `).join("");
}

function showArchNode(title) {
  const node = [...MAIN_PIPELINE, ...RECOVERY_PIPELINE].find((n) => n.title === title);
  if (!node || node.staticNode) return;
  const stats = nodeStats(node.categories);
  document.getElementById("archNodeTitle").textContent = title;
  document.getElementById("archNodeBody").innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-6"><div class="metric-tile"><div class="metric-value">${stats.total}</div><div class="metric-label">APIs</div></div></div>
      <div class="col-6"><div class="metric-tile"><div class="metric-value">${stats.progress}%</div><div class="metric-label">Progress</div></div></div>
    </div>
    <div class="mb-2"><span class="small text-muted-soft">Owner:</span> ${stats.owners.length ? escapeHtml(stats.owners.join(", ")) : "Unassigned"}</div>
    <div class="mb-2"><span class="small text-muted-soft">Status:</span> ${apiStatusBadge(stats.status)}</div>
    <div class="small text-muted-soft mb-1">Associated APIs</div>
    <div class="table-responsive-wrapper"><table class="table table-sm mb-0">
      <thead><tr><th>Endpoint</th><th>Status</th><th>Verification</th></tr></thead>
      <tbody>
        ${stats.apis.length ? stats.apis.map((a) => `
          <tr><td><code>${escapeHtml(a.endpoint)}</code></td><td>${apiStatusBadge(a.status)}</td><td>${verificationBadge(a.verification_status)}</td></tr>
        `).join("") : '<tr><td colspan="3" class="text-muted-soft small">No APIs mapped yet.</td></tr>'}
      </tbody>
    </table></div>
  `;
  bootstrap.Modal.getOrCreateInstance(document.getElementById("archNodeModal")).show();
}

async function loadArchitecture() {
  try {
    _allApis = await Api.getApiProgress({});
    renderPipeline("mainPipeline", MAIN_PIPELINE);
    renderPipeline("recoveryPipeline", RECOVERY_PIPELINE);
  } catch (err) {
    renderError(document.getElementById("mainPipeline"), err.message);
  }
}

document.addEventListener("DOMContentLoaded", loadArchitecture);
document.addEventListener("workitem:saved", loadArchitecture);
