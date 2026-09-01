# Autonomous AI Workforce — 7-Day Development Progress Dashboard

A role-based, database-backed dashboard for tracking the work of the three-person
team (**Bharath**, **Dhanuja**, **Anshif**) building the Autonomous AI Workforce
system over its 7-day implementation, per
`Autonomous_AI_Workforce_7_Day_API_Architecture_3_Developers.pdf`.

- **Frontend:** HTML5 + CSS3 + Bootstrap 5 + vanilla JavaScript (no frameworks).
  Bootstrap, Bootstrap Icons and Chart.js are vendored locally under
  `frontend/vendor/` — no CDN dependency at runtime.
- **Backend:** PHP (OOP) with a small hand-rolled router/controller/model/
  middleware structure, PDO prepared statements throughout.
- **Database:** PostgreSQL.
- **Auth:** PHP sessions, `password_hash()`/`password_verify()` — no plain-text
  passwords anywhere.

## Role-based access control

Two roles: **admin** (sees and can edit everything, manages user accounts) and
**developer** (tied to exactly one of Bharath/Dhanuja/Anshif via `developer_id`).
A developer can view the whole team's progress but can only create, edit, or
delete **their own** work items, verification-triggering fields, blockers, and
Day-7 requirements assigned to them. This is enforced **server-side on every
request** (`backend/middleware/OwnershipMiddleware.php`) — the frontend hiding
Edit buttons is a UX nicety, not the security boundary. A hand-crafted API call
from one developer trying to modify another's data gets a `403` regardless of
what the UI would have allowed.

## Running it

Requires PHP with the `pdo_pgsql` extension and a running PostgreSQL server.

The `DB_*` environment variables default to `127.0.0.1:5432 /
workforce_dashboard / workforce_app / workforce_dev_pw` if unset (see
`backend/config/database.php`) — **easiest path: create your local Postgres
role with that exact password** so you never need to set anything:

```bash
# 1. Create the database (using the documented default password)
createuser workforce_app --pwprompt   # enter workforce_dev_pw when prompted
createdb workforce_dashboard --owner workforce_app

# 2. Load the schema
psql -U workforce_app -d workforce_dashboard -f backend/database/schema.sql

# 3. Seed developers, user accounts, the API catalog and Day-7 requirements
php backend/database/seed.php

# 4. Run the app (serves both the API and the frontend on one port)
php -S 0.0.0.0:8000 backend/public/index.php
```

If you'd rather use your own password, override the defaults via environment
variables — but **the syntax is shell-specific**, so pick the block that
matches your terminal (mixing them up is a common source of a silent
fallback to the wrong default password, which surfaces as `password
authentication failed` from PostgreSQL):

<details>
<summary>macOS/Linux (bash/zsh)</summary>

```bash
DB_HOST=127.0.0.1 DB_NAME=workforce_dashboard DB_USER=workforce_app DB_PASSWORD=your_password \
  php backend/database/seed.php
DB_HOST=127.0.0.1 DB_NAME=workforce_dashboard DB_USER=workforce_app DB_PASSWORD=your_password \
  php -S 0.0.0.0:8000 backend/public/index.php
```
</details>

<details>
<summary>Windows cmd.exe (e.g. a plain XAMPP shell)</summary>

`VAR=value command` is **not valid syntax in cmd.exe** — it silently fails
to set the variable rather than erroring, so the app falls back to its
default password. Use `set` instead:

```bat
set DB_HOST=127.0.0.1
set DB_NAME=workforce_dashboard
set DB_USER=workforce_app
set DB_PASSWORD=your_password
php backend\database\seed.php
php -S 0.0.0.0:8000 backend/public/index.php
```
</details>

<details>
<summary>Windows PowerShell</summary>

```powershell
$env:DB_HOST="127.0.0.1"; $env:DB_NAME="workforce_dashboard"; $env:DB_USER="workforce_app"; $env:DB_PASSWORD="your_password"
php backend\database\seed.php
php -S 0.0.0.0:8000 backend/public/index.php
```
</details>

Open **http://localhost:8000** — you'll land on the login page.

### Seeded login credentials

The seed script prints these on first run; they're listed here for convenience
— **change them before any real deployment**:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@workforce.local` | `Admin@12345` |
| Bharath (developer) | `bharath@workforce.local` | `Bharath@123` |
| Dhanuja (developer) | `dhanuja@workforce.local` | `Dhanuja@123` |
| Anshif (developer) | `anshif@workforce.local` | `Anshif@123` |

To reset all data, re-run `schema.sql` against a fresh database (or `TRUNCATE`
every table) and re-run `seed.php`.

### Running under Apache (XAMPP/MAMP/WAMP)

**Never point Apache's docroot straight at `frontend/`** — that serves the
static files directly and skips PHP entirely, so `/api/...` calls have
nothing to answer them and every page hangs on "Loading...". `backend/public/`
is the front controller: it handles the API *and* serves `frontend/` itself,
so Apache must be pointed there instead.

1. Enable `mod_rewrite` (on by default in XAMPP) — `backend/public/.htaccess`
   uses it to route every request through `index.php`.
2. Point your docroot or vhost at `backend/public/`. If the project lives
   inside shared `htdocs` (e.g. `htdocs/Lordminds/Workflow-Dashboard/`), no
   extra config is needed — the app auto-detects how deeply it's nested and
   works from `http://localhost/Lordminds/Workflow-Dashboard/backend/public/`.
3. Set the `DB_*` environment variables for Apache's PHP process (e.g. in
   `php.ini`'s `[PHP]` section as `env[DB_HOST] = ...`, or an `.htaccess`
   `SetEnv` line), or just edit the defaults in `backend/config/database.php`.
4. XAMPP ships MySQL/MariaDB, not PostgreSQL — this app needs a real
   PostgreSQL server (`pdo_pgsql` extension) reachable from Apache's PHP;
   install/start PostgreSQL separately and run the schema/seed steps above
   against it.

## Project layout

```
backend/
  config/database.php     PDO connection factory (env-driven)
  models/                  One class per table - PDO prepared statements only
  services/                AuthService (login/session), ProgressService (KPI/progress aggregation)
  middleware/               AuthMiddleware (401), RoleMiddleware (admin-only 403),
                             OwnershipMiddleware (per-resource 403 + developer_id enforcement)
  controllers/                One per resource - Auth, Dashboard, Developer, WorkItem,
                               ApiProgress, Verification, Issue, Activity,
                               DefinitionOfDone, WeeklyProgress, Meta, UserManagement
  routes/api.php                Route table mapping method+path to a controller action
  public/index.php, .htaccess       Front controller: sessions, CORS, API dispatch,
                                     static frontend file serving. Auto-detects
                                     its own mount path so it works both at the
                                     domain root (php -S) and nested under a
                                     subdirectory (Apache/XAMPP htdocs).
  database/schema.sql, seed.php     PostgreSQL schema and seed data (from the spec PDF)
frontend/
  login.html, index.html, my-work.html, team-progress.html, work-items.html,
  architecture.html, api-progress.html, verification.html, activity.html,
  day7-completion.html, weekly-progress.html, user-management.html (admin only)
  css/          style.css, responsive.css
  js/           config.js (API base override), api.js (fetch layer, session cookies),
                auth.js (session guard + login page logic), app.js (RBAC-aware shell,
                badges, toasts), update-work.js (shared "Update Work" modal - Developer
                field is locked to your own name unless you're an admin), one module per page
  vendor/       Locally vendored Bootstrap 5, Bootstrap Icons, Chart.js
```

## Dashboard pages

Dashboard (team overview) · My Work (your own log, full CRUD) · Team Progress
(everyone's progress - only your own card is editable) · Weekly Progress ·
Work Items (full team table, Edit only on rows you own) · Architecture ·
API Progress · Verification & Evidence · Activity · Day-7 Completion (edit
only the 14 requirements assigned to you) · User Management (admin only) —
plus the global **+ Update Work** action, the single write path for logging
or editing work, with the Developer field locked to your own name unless
you're an admin.

All figures (KPIs, day-by-day progress, developer stats, API progress, Day-7
completion %) are computed live from PostgreSQL — nothing is hard-coded.
