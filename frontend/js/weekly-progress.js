let _dailyChart = null;

async function loadWeeklyProgress() {
  try {
    const data = await Api.getWeeklyProgress();
    renderOverall(data.overall);
    renderTeam(data.team);
    renderDaily(data.daily);
    renderDodPanel(data);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderOverall(summary) {
  const defs = [
    { label: "Overall Progress", value: `${summary.overall_progress}%`, icon: "bi-speedometer2", color: "var(--accent)", bg: "var(--accent-soft)" },
    { label: "Completed", value: summary.completed, icon: "bi-check2-circle", color: "var(--success)", bg: "var(--success-soft)" },
    { label: "Running", value: summary.running, icon: "bi-arrow-repeat", color: "var(--info)", bg: "var(--info-soft)" },
    { label: "Pending", value: summary.pending, icon: "bi-hourglass-split", color: "var(--warning)", bg: "var(--warning-soft)" },
    { label: "Failed", value: summary.failed, icon: "bi-exclamation-triangle", color: "var(--danger)", bg: "var(--danger-soft)" },
    { label: "Verified", value: summary.verified, icon: "bi-patch-check", color: "var(--purple)", bg: "var(--purple-soft)" },
  ];
  document.getElementById("wpKpiRow").innerHTML = defs.map((d) => `
    <div class="col-6 col-md-4 col-xl-2">
      <div class="kpi-card">
        <div class="d-flex justify-content-between align-items-start">
          <div><div class="kpi-label">${d.label}</div><div class="kpi-value">${d.value}</div></div>
          <div class="kpi-icon" style="background-color:${d.bg};color:${d.color};"><i class="bi ${d.icon}"></i></div>
        </div>
      </div>
    </div>`).join("");
}

function renderTeam(team) {
  document.getElementById("wpTeam").innerHTML = team.map((d) => `
    <div class="col-md-4">
      <div class="border rounded-3 p-3" style="border-color:var(--border-color) !important;">
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="developer-avatar" style="width:32px;height:32px;font-size:0.8rem;background-color:${developerColor(d.name)};">${developerInitials(d.name)}</span>
          <div class="fw-bold">${escapeHtml(d.name)}</div>
          <div class="ms-auto fw-bold">${d.progress}%</div>
        </div>
        <div class="progress mb-2"><div class="progress-bar" style="width:${d.progress}%;background-color:${developerColor(d.name)};"></div></div>
        <div class="d-flex justify-content-between small text-muted-soft">
          <span>${d.completed} done</span><span>${d.in_progress} active</span><span>${d.pending} pending</span><span>${d.blocked} blocked</span>
        </div>
      </div>
    </div>`).join("");
}

function renderDaily(daily) {
  document.getElementById("wpDailyBody").innerHTML = daily.map((d) => `
    <tr>
      <td class="fw-semibold">${d.label}</td>
      <td><span class="badge-status ${d.state === "completed" ? "badge-completed" : d.state === "current" ? "badge-running" : "badge-notstarted"}">${d.state}</span></td>
      <td>${d.completed}/${d.total}</td>
      <td>${d.pending}</td>
      <td>${d.blockers ? `<span class="text-danger">${d.blockers}</span>` : "0"}</td>
      <td>${d.verified}</td>
      <td style="min-width:140px;">
        <div class="d-flex align-items-center gap-2">
          <div class="progress flex-grow-1"><div class="progress-bar bg-success" style="width:${d.progress}%;"></div></div>
          <span class="small text-muted-soft">${d.progress}%</span>
        </div>
      </td>
    </tr>`).join("");

  const ctx = document.getElementById("dailyChart");
  const chartData = {
    labels: daily.map((d) => d.label),
    datasets: [
      { label: "Completed", data: daily.map((d) => d.completed), backgroundColor: "#22c55e" },
      { label: "Remaining", data: daily.map((d) => d.total - d.completed), backgroundColor: "#2a3441" },
    ],
  };
  if (_dailyChart) {
    _dailyChart.data = chartData;
    _dailyChart.update();
    return;
  }
  _dailyChart = new Chart(ctx, {
    type: "bar",
    data: chartData,
    options: {
      responsive: true,
      scales: {
        x: { stacked: true, ticks: { color: "#9aa8b8" }, grid: { color: "#2a3441" } },
        y: { stacked: true, ticks: { color: "#9aa8b8", precision: 0 }, grid: { color: "#2a3441" } },
      },
      plugins: { legend: { labels: { color: "#e6edf3" } } },
    },
  });
}

function renderDodPanel(data) {
  document.getElementById("wpDodPct").textContent = `${data.day7_readiness}%`;
  document.getElementById("wpDodSub").textContent = `${data.dod_verified} of ${data.dod_total} requirements verified`;
  document.getElementById("wpDodBar").style.width = `${data.day7_readiness}%`;
}

document.addEventListener("auth:ready", loadWeeklyProgress);
document.addEventListener("workitem:saved", loadWeeklyProgress);
