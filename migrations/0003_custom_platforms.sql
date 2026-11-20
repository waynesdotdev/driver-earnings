-- Delivery apps the driver adds themselves (on top of the built-in ones).
CREATE TABLE IF NOT EXISTS platforms (
  id          TEXT PRIMARY KEY,               -- "c_" + random
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,                  -- "#RRGGBB" picked by the driver
  created_at  TEXT NOT NULL
);
