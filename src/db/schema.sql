CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,

    company TEXT,
    title TEXT,
    location TEXT,
    remote INTEGER DEFAULT 0,

    salary TEXT,
    description TEXT,

    url TEXT,
    application_url TEXT,

    posted_at TEXT,
    updated_at TEXT,

    departments TEXT,
    offices TEXT,

    match_score REAL,
    status TEXT DEFAULT 'NEW',

    discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_source
ON jobs(source);

CREATE INDEX IF NOT EXISTS idx_jobs_company
ON jobs(company);

CREATE INDEX IF NOT EXISTS idx_jobs_title
ON jobs(title);

CREATE INDEX IF NOT EXISTS idx_jobs_status
ON jobs(status);