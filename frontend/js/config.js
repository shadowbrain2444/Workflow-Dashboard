/* Points the frontend at the backend API.
 *
 * Default ("") assumes the FastAPI backend serves this frontend itself
 * (e.g. `uvicorn app.main:app --port 8000`, then open http://localhost:8000) -
 * in that case every /api/... call is same-origin and no change is needed.
 *
 * If you run the frontend and backend as two SEPARATE servers (e.g. a static
 * file server on :8080 for these files, and uvicorn on :8000 for the API),
 * set this to the backend's full origin instead, e.g.:
 *   const DASHBOARD_API_BASE = "http://localhost:8000";
 * The backend already allows cross-origin requests (CORS is open), so no
 * other change is required.
 */
const DASHBOARD_API_BASE = "";
