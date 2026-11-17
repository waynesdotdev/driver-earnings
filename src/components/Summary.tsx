"use client";

import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";
import { fmtMoney } from "@/lib/money";
import { fmtDay, fmtWeekday, weekDates } from "@/lib/dates";
import { dayTotal, type Day } from "@/lib/types";

/** Mini Mon→Sun bar chart. */
export function WeekBars({ monday, days, current }: { monday: string; days: Day[]; current?: string }) {
  const byDate = new Map(days.map((d) => [d.date, dayTotal(d)]));
  const dates = weekDates(monday);
  const max = Math.max(1, ...dates.map((d) => byDate.get(d) ?? 0));
  return (
    <div className="weekbar">
      {dates.map((d) => {
        const t = byDate.get(d) ?? 0;
        return (
          <Link href={`/day/${d}`} className="col" key={d}>
            <div
              className={`bar ${t > 0 ? "on" : ""} ${d === current ? "current" : ""}`}
              style={{ height: `${Math.max(6, (t / max) * 100)}%` }}
            />
            <div className="d">{fmtWeekday(d).slice(0, 2)}</div>
          </Link>
        );
      })}
    </div>
  );
}

/** Stacked colour bar + per-app totals. */
export function PlatformSplit({ days }: { days: Day[] }) {
  const totals = PLATFORMS.map((p) => ({
    p,
    t: days.reduce((s, d) => s + (d.earnings[p.id]?.amount_pence ?? 0), 0),
  }));
  const all = totals.reduce((s, x) => s + x.t, 0);
  return (
    <>
      <div className="split">
        {all > 0 &&
          totals.map(({ p, t }) =>
            t > 0 ? <div key={p.id} style={{ width: `${(t / all) * 100}%`, background: p.bg }} /> : null
          )}
      </div>
      <div className="list">
        {totals.map(({ p, t }) => (
          <div className="item" key={p.id}>
            <div className="row" style={{ justifyContent: "flex-start" }}>
              <span className="dot" style={{ background: p.bg, color: p.fg }}>
                {p.name}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
              {fmtMoney(t)}
              {all > 0 && <span className="muted small"> · {Math.round((t / all) * 100)}%</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** A tappable list of days with totals and per-app pills. */
export function DayList({ dates, days, activeDate }: { dates: string[]; days: Day[]; activeDate?: string }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return (
    <div className="list">
      {dates.map((date) => {
        const d = byDate.get(date);
        const t = dayTotal(d);
        return (
          <Link href={`/day/${date}`} className="item" key={date}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {fmtDay(date)}
                {date === activeDate && <span className="chip" style={{ marginLeft: 6 }}>working</span>}
              </div>
              <div className="dots">
                {PLATFORMS.filter((p) => d?.earnings[p.id]).map((p) => (
                  <span key={p.id} className="dot" style={{ background: p.bg, color: p.fg }}>
                    {fmtMoney(d!.earnings[p.id]!.amount_pence)}
                  </span>
                ))}
                {!d || t === 0 ? <span className="muted small">No earnings</span> : null}
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, fontVariantNumeric: "tabular-nums" }} className={t ? "good" : "muted"}>
              {fmtMoney(t)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
