import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Day, Entry, MonthSummary } from "./types";
import type { PlatformId } from "./platforms";

async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

const now = () => new Date().toISOString();

interface DayRow {
  date: string;
  status: "open" | "closed";
  started_at: string | null;
  closed_at: string | null;
}
interface EarnRow {
  date: string;
  platform: PlatformId;
  amount_pence: number;
  updated_at: string;
}

function assemble(days: DayRow[], earns: EarnRow[]): Day[] {
  const map = new Map<string, Day>();
  for (const d of days) map.set(d.date, { ...d, earnings: {} });
  for (const e of earns) {
    let day = map.get(e.date);
    if (!day) {
      day = { date: e.date, status: "closed", started_at: null, closed_at: null, earnings: {} };
      map.set(e.date, day);
    }
    day.earnings[e.platform] = { amount_pence: e.amount_pence, updated_at: e.updated_at } satisfies Entry;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDay(date: string): Promise<Day> {
  const DB = await db();
  const [d, e] = await DB.batch([
    DB.prepare("SELECT * FROM days WHERE date = ?").bind(date),
    DB.prepare("SELECT * FROM earnings WHERE date = ?").bind(date),
  ]);
  const days = (d.results ?? []) as unknown as DayRow[];
  const earns = (e.results ?? []) as unknown as EarnRow[];
  const out = assemble(days, earns)[0];
  return out ?? { date, status: "none", started_at: null, closed_at: null, earnings: {} };
}

export async function getActiveDay(): Promise<Day | null> {
  const DB = await db();
  const row = await DB.prepare("SELECT date FROM days WHERE status = 'open' ORDER BY date DESC LIMIT 1").first<{
    date: string;
  }>();
  return row ? getDay(row.date) : null;
}

/** Opens `date` as the working day and closes any other open day. */
export async function startDay(date: string): Promise<Day> {
  const DB = await db();
  const t = now();
  await DB.batch([
    DB.prepare("UPDATE days SET status = 'closed', closed_at = ? WHERE status = 'open' AND date <> ?").bind(t, date),
    DB.prepare(
      `INSERT INTO days (date, status, started_at) VALUES (?, 'open', ?)
       ON CONFLICT(date) DO UPDATE SET status = 'open', closed_at = NULL`
    ).bind(date, t),
  ]);
  return getDay(date);
}

export async function closeDay(date: string): Promise<Day> {
  const DB = await db();
  await DB.prepare("UPDATE days SET status = 'closed', closed_at = ? WHERE date = ?").bind(now(), date).run();
  return getDay(date);
}

/** Replaces (not adds to) the running figure for one app. null clears it. */
export async function setEarning(date: string, platform: PlatformId, pence: number | null): Promise<Day> {
  const DB = await db();
  const t = now();
  const ensureDay = DB.prepare(
    "INSERT INTO days (date, status, started_at, closed_at) VALUES (?, 'closed', ?, ?) ON CONFLICT(date) DO NOTHING"
  ).bind(date, t, t);
  const write =
    pence === null
      ? DB.prepare("DELETE FROM earnings WHERE date = ? AND platform = ?").bind(date, platform)
      : DB.prepare(
          `INSERT INTO earnings (date, platform, amount_pence, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(date, platform) DO UPDATE SET amount_pence = excluded.amount_pence, updated_at = excluded.updated_at`
        ).bind(date, platform, pence, t);
  await DB.batch([ensureDay, write]);
  return getDay(date);
}

export async function getRange(from: string, to: string): Promise<Day[]> {
  const DB = await db();
  const [d, e] = await DB.batch([
    DB.prepare("SELECT * FROM days WHERE date BETWEEN ? AND ?").bind(from, to),
    DB.prepare("SELECT * FROM earnings WHERE date BETWEEN ? AND ?").bind(from, to),
  ]);
  return assemble((d.results ?? []) as unknown as DayRow[], (e.results ?? []) as unknown as EarnRow[]);
}

/** The target for the week starting `monday` (null if not set yet). */
export async function getTarget(monday: string): Promise<{ target_pence: number | null }> {
  const DB = await db();
  const row = await DB.prepare("SELECT target_pence FROM week_targets WHERE monday = ?")
    .bind(monday)
    .first<{ target_pence: number }>();
  return { target_pence: row?.target_pence ?? null };
}

export async function setTarget(monday: string, pence: number): Promise<void> {
  const DB = await db();
  await DB.prepare(
    `INSERT INTO week_targets (monday, target_pence, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(monday) DO UPDATE SET target_pence = excluded.target_pence, updated_at = excluded.updated_at`
  )
    .bind(monday, pence, now())
    .run();
}

export async function getMonths(): Promise<MonthSummary[]> {
  const DB = await db();
  const { results } = await DB.prepare(
    `SELECT substr(date, 1, 7) AS month,
            SUM(amount_pence) AS total_pence,
            COUNT(DISTINCT date) AS days
       FROM earnings
      WHERE amount_pence > 0
      GROUP BY month
      ORDER BY month DESC`
  ).all<MonthSummary>();
  return results ?? [];
}
