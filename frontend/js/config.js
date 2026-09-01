/* Points the frontend at the backend API. Leave DASHBOARD_API_BASE as "" for
 * the normal setup where the PHP backend serves this frontend itself (either
 * `php -S 0.0.0.0:8000 backend/public/index.php`, or Apache/XAMPP pointed at
 * backend/public/ with its .htaccess enabled) - session-cookie auth relies
 * on same-origin requests, so this generally should not need to change.
 *
 * APP_BASE_PATH auto-detects how deep this app is nested under the current
 * origin (e.g. "" at http://localhost:8000/, or
 * "/Lordminds/Workflow-Dashboard/backend/public" under a typical XAMPP
 * htdocs layout) from the current page's own URL, and api.js prepends it to
 * every absolute /api/... call so those requests land on the same
 * subdirectory-nested backend instead of the domain root. No manual setup
 * needed - this only requires that pages be served BY the PHP backend
 * (never by pointing Apache straight at the frontend/ folder, which skips
 * PHP - and therefore the API - entirely).
 */
const DASHBOARD_API_BASE = "";

const APP_BASE_PATH = (() => {
  const path = window.location.pathname;
  const lastSlash = path.lastIndexOf("/");
  return lastSlash <= 0 ? "" : path.slice(0, lastSlash);
})();
