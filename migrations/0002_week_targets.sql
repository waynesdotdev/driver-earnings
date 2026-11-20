-- How much the driver wants to earn each week (Mon–Sun).
CREATE TABLE IF NOT EXISTS week_targets (
  monday       TEXT PRIMARY KEY,              -- YYYY-MM-DD of the week's Monday
  target_pence INTEGER NOT NULL,
  updated_at   TEXT NOT NULL
);
