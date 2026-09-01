async function guardAdminPage() {
  if (isAdmin()) return true;
  document.getElementById("forbiddenNotice").classList.remove("d-none");
  document.getElementById("usersCard").classList.add("d-none");
  document.getElementById("addUserBtn").classList.add("d-none");
  showToast("Admin access required.", "danger");
  setTimeout(() => (window.location.href = "index.html"), 1500);
  return false;
}

async function loadUsers() {
  const tbody = document.getElementById("usersBody");
  try {
    const users = await Api.getUsers();
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge-status ${u.role === "admin" ? "badge-verified" : "badge-inprogress"}">${escapeHtml(u.role)}</span></td>
        <td>${escapeHtml(u.developer_name || "-")}</td>
        <td>${u.is_active ? '<span class="badge-status badge-completed">Active</span>' : '<span class="badge-status badge-cancelled">Inactive</span>'}</td>
        <td class="small text-muted-soft">${formatDateTime(u.created_at)}</td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-soft" onclick="openResetPassword(${u.id})"><i class="bi bi-key"></i></button>
          ${u.id === CURRENT_USER.id
            ? '<span class="small text-muted-soft ms-1">(you)</span>'
            : `<button class="btn btn-sm btn-outline-soft" onclick="toggleActive(${u.id}, ${u.is_active ? "false" : "true"})">
                 <i class="bi ${u.is_active ? "bi-slash-circle" : "bi-check-circle"}"></i>
               </button>`}
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="alert alert-danger mb-0">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

async function toggleActive(id, makeActive) {
  try {
    await Api.setUserActive(id, makeActive);
    showToast(`User ${makeActive ? "activated" : "deactivated"}.`, "success");
    loadUsers();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openResetPassword(id) {
  document.getElementById("rpUserId").value = id;
  document.getElementById("rpPassword").value = "";
  document.getElementById("resetPasswordAlert").classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("resetPasswordModal")).show();
}

async function initAddUserForm() {
  const meta = await loadMetaCache();
  const devSel = document.getElementById("auDeveloper");
  meta.developers.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    devSel.appendChild(opt);
  });

  document.getElementById("auRole").addEventListener("change", (e) => {
    document.getElementById("auDeveloperWrap").classList.toggle("d-none", e.target.value === "admin");
  });

  document.getElementById("addUserBtn").addEventListener("click", () => {
    document.getElementById("addUserForm").reset();
    document.getElementById("addUserAlert").classList.add("d-none");
    document.getElementById("auDeveloperWrap").classList.remove("d-none");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("addUserModal")).show();
  });

  document.getElementById("addUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("addUserAlert");
    alertBox.classList.add("d-none");

    const role = document.getElementById("auRole").value;
    const payload = {
      name: document.getElementById("auName").value.trim(),
      email: document.getElementById("auEmail").value.trim(),
      password: document.getElementById("auPassword").value,
      role,
      developer_id: role === "developer" ? document.getElementById("auDeveloper").value : null,
    };

    try {
      await Api.createUser(payload);
      bootstrap.Modal.getOrCreateInstance(document.getElementById("addUserModal")).hide();
      showToast("User created.", "success");
      loadUsers();
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove("d-none");
    }
  });

  document.getElementById("resetPasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("resetPasswordAlert");
    alertBox.classList.add("d-none");
    const id = document.getElementById("rpUserId").value;
    const password = document.getElementById("rpPassword").value;
    try {
      await Api.setUserPassword(id, password);
      bootstrap.Modal.getOrCreateInstance(document.getElementById("resetPasswordModal")).hide();
      showToast("Password updated.", "success");
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove("d-none");
    }
  });
}

document.addEventListener("auth:ready", async () => {
  if (!(await guardAdminPage())) return;
  await initAddUserForm();
  await loadUsers();
});
