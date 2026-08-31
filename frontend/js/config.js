/* Points the frontend at the backend API.
 *
 * Leave this as "" (the default) in almost every case:
 *   - If the FastAPI backend serves this frontend itself (the normal setup -
 *     `uvicorn app.main:app --port 8000`, then open http://localhost:8000),
 *     every /api/... call is same-origin and just works.
 *   - If the frontend is served by a SEPARATE static server (e.g. a dev
 *     server on :8080) while uvicorn runs elsewhere, js/api.js will
 *     automatically probe common backend ports (8000, 8080, 5000, 3000) on
 *     the current hostname and use whichever one answers - no edit needed.
 *
 * Only set this explicitly if your backend runs on a host/port the
 * auto-discovery above won't find (e.g. a remote host, or a nonstandard
 * port), or if you want to skip the discovery probes entirely:
 *   const DASHBOARD_API_BASE = "http://localhost:9001";
 * The backend already allows cross-origin requests (CORS is open), so no
 * other change is required.
 */
const DASHBOARD_API_BASE = "";
