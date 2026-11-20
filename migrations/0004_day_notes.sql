-- A free-text note per day ("Rain, very busy", "Tips came in late"…).
CREATE TABLE IF NOT EXISTS day_notes (
  date        TEXT PRIMARY KEY,               -- YYYY-MM-DD
  note        TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
