-- One row per working day. Only one day should be 'open' at a time.
CREATE TABLE IF NOT EXISTS days (
  date        TEXT PRIMARY KEY,             -- YYYY-MM-DD (the day you are working FOR)
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  started_at  TEXT,
  closed_at   TEXT
);

-- Latest running figure per app per day (each update REPLACES the value).
CREATE TABLE IF NOT EXISTS earnings (
  date         TEXT NOT NULL,
  platform     TEXT NOT NULL,               -- deliveroo | justeat | ubereats | stuart | amazonflex
  amount_pence INTEGER NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (date, platform)
);

CREATE INDEX IF NOT EXISTS idx_days_status ON days(status);
