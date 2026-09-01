/* Points the frontend at the backend API. Leave as "" (same-origin) for the
 * normal setup where PHP's built-in server serves this frontend itself
 * (`php -S 0.0.0.0:8000 backend/public/index.php`, then open
 * http://localhost:8000). Session-cookie auth relies on same-origin
 * requests, so this generally should not need to change.
 */
const DASHBOARD_API_BASE = "";
