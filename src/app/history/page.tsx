"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { DayList, PlatformSplit } from "@/components/Summary";
import { api } from "@/lib/api";
import { fmtMonth, monthRange } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import type { Day, MonthSummary } from "@/lib/types";

export default function HistoryPage() {
  const [months, setMonths] = useState<MonthSummary[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    api.months().then(({ months }) => setMonths(months));
  }, []);

  useEffect(() => {
    if (!open) return;
    setDays(null);
    const { from, to } = monthRange(open);
    api.range(from, to).then(({ days }) => setDays(days));
  }, [open]);

  const allTime = (months ?? []).reduce((s, m) => s + m.total_pence, 0);
  const allDays = (months ?? []).reduce((s, m) => s + m.days, 0);

  return (
    <main className="app">
      <header className="head">
        <div>
          <div className="label">History</div>
          <div className="date">All earnings</div>
        </div>
        <div className="total">
          <div className="label">All time · {allDays} days</div>
          <div className="num">{fmtMoney(allTime)}</div>
        </div>
      </header>

      {!months ? (
        <div className="loading">Loading…</div>
      ) : months.length === 0 ? (
        <div className="panel muted">No earnings saved yet. Start a day on the Today tab.</div>
      ) : (
        months.map((m) => (
          <section className="panel" key={m.month}>
            <button className="row" style={{ width: "100%" }} onClick={() => setOpen(open === m.month ? null : m.month)}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtMonth(m.month)}</div>
                <div className="small muted">
                  {m.days} day{m.days === 1 ? "" : "s"} · avg {fmtMoney(Math.round(m.total_pence / Math.max(1, m.days)))}/day
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: 20 }} className="good">
                {fmtMoney(m.total_pence)} <span className="muted">{open === m.month ? "▴" : "▾"}</span>
              </div>
            </button>

            {open === m.month &&
              (!days ? (
                <div className="loading">Loading…</div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <PlatformSplit days={days} />
                  <div style={{ height: 10 }} />
                  <DayList
                    dates={days.map((d) => d.date).sort().reverse()}
                    days={days}
                  />
                </div>
              ))}
          </section>
        ))
      )}
      <Nav />
    </main>
  );
}
