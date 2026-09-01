/* Session guard shared by every protected page. Resolves the logged-in user
 * from the backend (the actual authority - never trust anything cached
 * client-side for authorization) and redirects to login.html if there isn't
 * one. Populates the global CURRENT_USER used by app.js and page scripts to
 * decide what to render - this is a UX convenience only; every real
 * permission check is enforced again server-side on each request.
 */
let CURRENT_USER = null;

async function guardAuth() {
  try {
    CURRENT_USER = await Api.me();
    return CURRENT_USER;
  } catch (e) {
    // Api.me() already redirects to login.html on a 401 response.
    return null;
  }
}

function isAdmin() {
  return !!CURRENT_USER && CURRENT_USER.role === "admin";
}

function ownsResource(developerId) {
  if (!CURRENT_USER) return false;
  if (CURRENT_USER.role === "admin") return true;
  return CURRENT_USER.developer_id === developerId;
}

async function handleLogout() {
  try {
    await Api.logout();
  } catch (_) { /* ignore - we're leaving anyway */ }
  window.location.href = "login.html";
}

/* ---------- login.html only ---------- */
async function initLoginPage() {
  // Already signed in? Skip the form.
  try {
    await Api.me();
    window.location.href = "index.html";
    return;
  } catch (_) { /* not authenticated - show the form */ }

  const form = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");
  const submitBtn = document.getElementById("loginSubmitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.classList.add("d-none");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Signing in...`;

    try {
      await Api.login(email, password);
      window.location.href = "index.html";
    } catch (err) {
      alertBox.textContent = err.message || "Login failed.";
      alertBox.classList.remove("d-none");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.getAttribute("data-page") === "login") {
    initLoginPage();
  }
});
