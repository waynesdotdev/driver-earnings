// The app sets up its own database tables, so nobody has to run migrations by
// hand after an update. Every statement is safe to run again and again
// ("IF NOT EXISTS"), and matches the files in /migrations, which still work
// with `npm run db:migrate:remote` if you prefer.
//
// Rule for future changes: only ever ADD statements here (new tables / indexes,
// each with IF NOT EXISTS), and add the same SQL as a new file in /migrations.

const STATEMENTS = [
  // 0001_init
  `CREATE TABLE IF NOT EXISTS days (
     date TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'open', started_at TEXT, closed_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS earnings (
     date TEXT NOT NULL, platform TEXT NOT NULL, amount_pence INTEGER NOT NULL, updated_at TEXT NOT NULL,
     PRIMARY KEY (date, platform))`,
  `CREATE INDEX IF NOT EXISTS idx_days_status ON days(status)`,
  // 0002_week_targets
  `CREATE TABLE IF NOT EXISTS week_targets (
     monday TEXT PRIMARY KEY, target_pence INTEGER NOT NULL, updated_at TEXT NOT NULL)`,
  // 0003_custom_platforms
  `CREATE TABLE IF NOT EXISTS platforms (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL)`,
];

// Once per running copy of the app (not per request).
let ready: Promise<void> | null = null;

export function ensureSchema(DB: D1Database): Promise<void> {
  if (!ready) {
    ready = DB.batch(STATEMENTS.map((s) => DB.prepare(s)))
      .then(() => undefined)
      .catch((err) => {
        ready = null; // try again on the next request
        throw err;
      });
  }
  return ready;
}
