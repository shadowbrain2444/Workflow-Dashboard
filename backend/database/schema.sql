-- Autonomous AI Workforce Dashboard — PostgreSQL schema

CREATE TABLE IF NOT EXISTS developers (
    id             SERIAL PRIMARY KEY,
    code           VARCHAR(32) UNIQUE NOT NULL,
    name           VARCHAR(64) NOT NULL,
    responsibility VARCHAR(255) NOT NULL,
    focus_areas    TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'developer')),
    developer_id  INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT developer_role_has_developer CHECK (
        (role = 'developer' AND developer_id IS NOT NULL) OR
        (role = 'admin')
    )
);

CREATE TABLE IF NOT EXISTS work_items (
    id                 SERIAL PRIMARY KEY,
    developer_id       INTEGER NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
    day                INTEGER NOT NULL CHECK (day BETWEEN 1 AND 7),
    work_date          DATE NOT NULL,
    module             VARCHAR(128) NOT NULL,
    description        TEXT NOT NULL DEFAULT '',
    tasks_completed    TEXT NOT NULL DEFAULT '',
    status             VARCHAR(16) NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Running','Verifying','Completed','Failed','Cancelled')),
    evidence           TEXT NOT NULL DEFAULT '',
    verification_status VARCHAR(16) NOT NULL DEFAULT 'Pending'
                          CHECK (verification_status IN ('Pending','Passed','Failed')),
    issues_blockers    TEXT NOT NULL DEFAULT '',
    next_planned_work  TEXT NOT NULL DEFAULT '',
    is_seed            BOOLEAN NOT NULL DEFAULT FALSE,
    created_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_items_developer ON work_items(developer_id);
CREATE INDEX IF NOT EXISTS idx_work_items_day ON work_items(day);

CREATE TABLE IF NOT EXISTS api_items (
    id                  SERIAL PRIMARY KEY,
    endpoint            VARCHAR(160) UNIQUE NOT NULL,
    method              VARCHAR(16) NOT NULL DEFAULT 'POST',
    owner_developer_id  INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    purpose             VARCHAR(255) NOT NULL DEFAULT '',
    category            VARCHAR(64) NOT NULL DEFAULT '',
    status              VARCHAR(16) NOT NULL DEFAULT 'Not Started'
                           CHECK (status IN ('Not Started','In Progress','Implemented','Verified')),
    tested              BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(16) NOT NULL DEFAULT 'Pending'
                           CHECK (verification_status IN ('Pending','Passed','Failed')),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_item_apis (
    id           SERIAL PRIMARY KEY,
    work_item_id INTEGER NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    api_id       INTEGER NOT NULL REFERENCES api_items(id) ON DELETE CASCADE,
    UNIQUE (work_item_id, api_id)
);

CREATE TABLE IF NOT EXISTS verifications (
    id           SERIAL PRIMARY KEY,
    work_item_id INTEGER NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    checks       TEXT NOT NULL DEFAULT '',
    evidence     TEXT NOT NULL DEFAULT '',
    passed       BOOLEAN NOT NULL DEFAULT FALSE,
    failures     TEXT NOT NULL DEFAULT '',
    criteria     TEXT NOT NULL DEFAULT '',
    verified_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verifications_work_item ON verifications(work_item_id);

CREATE TABLE IF NOT EXISTS issues (
    id           SERIAL PRIMARY KEY,
    developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    work_item_id INTEGER REFERENCES work_items(id) ON DELETE CASCADE,
    module       VARCHAR(128) NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    priority     VARCHAR(16) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
    status       VARCHAR(16) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Resolved')),
    resolution   TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
    id           SERIAL PRIMARY KEY,
    event_type   VARCHAR(64) NOT NULL,
    developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    work_item_id INTEGER REFERENCES work_items(id) ON DELETE SET NULL,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source       VARCHAR(64) NOT NULL DEFAULT 'dashboard',
    status       VARCHAR(32) NOT NULL DEFAULT 'info',
    payload      TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

CREATE TABLE IF NOT EXISTS definition_of_done (
    id                 SERIAL PRIMARY KEY,
    requirement        TEXT NOT NULL,
    owner_developer_id INTEGER REFERENCES developers(id) ON DELETE SET NULL,
    owner_label        VARCHAR(120) NOT NULL DEFAULT '',
    status             VARCHAR(16) NOT NULL DEFAULT 'Not Started'
                          CHECK (status IN ('Not Started','In Progress','Verified','Blocked')),
    evidence           TEXT NOT NULL DEFAULT '',
    verification       VARCHAR(16) NOT NULL DEFAULT 'Pending',
    notes              TEXT NOT NULL DEFAULT '',
    order_index        INTEGER NOT NULL DEFAULT 0,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log for accountability (section 40)
CREATE TABLE IF NOT EXISTS audit_log (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(64) NOT NULL,
    entity_type  VARCHAR(64) NOT NULL,
    entity_id    INTEGER,
    details      TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
