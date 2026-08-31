# Autonomous AI Workforce — 7-Day Development Progress Dashboard

A database-backed dashboard for tracking the work of the three-person team
(**Bharath**, **Dhanuja**, **Anshif**) building the Autonomous AI Workforce
system over its 7-day implementation, per
`Autonomous_AI_Workforce_7_Day_API_Architecture_3_Developers.pdf`.

- **Frontend:** HTML5 + CSS3 + Bootstrap 5 + vanilla JavaScript (no frameworks). Bootstrap,
  Bootstrap Icons and Chart.js are vendored locally under `frontend/vendor/` — no CDN
  dependency at runtime.
- **Backend:** FastAPI + Pydantic + SQLAlchemy, serving a REST API and the static frontend.
- **Database:** SQLite (`backend/workforce_dashboard.db`, created and seeded automatically
  on first run).

## Running it

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in a browser. The database is created and seeded
automatically on first startup (3 developers, their 7-day deliverables as Pending
work items, the full API ownership catalog, and the 14 Day-7 Definition of Done
requirements — all derived from the spec PDF, seeded as *not yet done* so nothing
is fabricated).

To reset all data, stop the server and delete `backend/workforce_dashboard.db`,
then restart — it will reseed automatically.

## Project layout

```
backend/
  app/
    main.py          FastAPI app, static frontend mount
    models.py         SQLAlchemy models
    schemas.py         Pydantic request/response schemas
    seed.py             Seed data derived from the spec PDF
    stats.py             Dashboard aggregation logic (KPIs, daily/weekly progress)
    routers/                One router per resource (dashboard, work-items, developers,
                             api-progress, verification, issues, activities,
                             definition-of-done, weekly-progress, meta)
frontend/
  index.html ... day7-completion.html   One HTML page per nav section
  css/          style.css, responsive.css
  js/           api.js (fetch layer), app.js (shell/badges/toasts),
                update-work.js (shared "Update Work" modal), one module per page
  vendor/       Locally vendored Bootstrap 5, Bootstrap Icons, Chart.js
```

## Dashboard pages

Dashboard · Weekly Progress · Team · Work Items · Architecture · API Progress ·
Verification & Evidence · Activity · Day-7 Completion — plus the global
**+ Update Work** action available from every page, which is the single write
path for logging or editing a developer's work (creates/updates the work item,
syncs linked API statuses, records a verification entry when work is marked
Passed/Failed, opens a blocker issue when Issues/Blockers is filled in, and logs
an activity event).

All figures (KPIs, day-by-day progress, developer stats, API progress, Day-7
completion %) are computed live from the database — nothing is hard-coded.
