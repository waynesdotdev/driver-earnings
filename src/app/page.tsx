"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import EarningsEditor from "@/components/EarningsEditor";
import { WeekBars } from "@/components/Summary";
import { api } from "@/lib/api";
import { addDays, fmtDay, fmtDayLong, mondayOf, todayLocal } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import { dayTotal, type Day } from "@/lib/types";

// Remembers (per phone) that the "which day are you working?" question has
// been answered for this calendar date, so it's only asked once per day.
const CONFIRM_KEY = "de_confirmed_for";

type Mode = "loading" | "prompt" | "active" | "finished" | "error";

export default function TodayPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [active, setActive] = useState<Day | null>(null);
  const [finished, setFinished] = useState<Day | null>(null);
  const [week, setWeek] = useState<Day[]>([]);
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState(todayLocal());

  const loadWeek = useCallback(async (date: string) => {
    const mon = mondayOf(date);
    const { days } = await api.range(mon, addDays(mon, 6));
    setWeek(days);
  }, []);

  const load = useCallback(async () => {
    const t = todayLocal();
    setToday(t);
    try {
      const { active } = await api.active();
      setActive(active);
      const confirmed = localStorage.getItem(CONFIRM_KEY) === t;
      if (active && (active.date === t || confirmed)) {
        setMode("active");
        loadWeek(active.date).catch(() => {});
      } else {
        setMode("prompt");
      }
    } catch {
      setMode("error");
    }
  }, [loadWeek]);

  useEffect(() => {
    load();
    // Re-check when the app comes back to the foreground (e.g. after midnight)
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  async function choose(date: string) {
    setBusy(true);
    try {
      const { day } = await api.start(date);
      localStorage.setItem(CONFIRM_KEY, todayLocal());
      setActive(day);
      setMode("active");
      loadWeek(day.date).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!active) return;
    if (!window.confirm(`Finish ${fmtDay(active.date)}?\n\nTotal ${fmtMoney(dayTotal(active))} will be saved to your history.`)) return;
    setBusy(true);
    try {
      const { day } = await api.close(active.date);
      setFinished(day);
      setActive(null);
      setMode("finished");
    } finally {
      setBusy(false);
    }
  }

  function onDayChange(day: Day) {
    setActive(day);
    setWeek((w) => [...w.filter((d) => d.date !== day.date), day]);
  }

  return (
    <main className="app">
      {mode === "loading" && <div className="loading">Loading…</div>}

      {mode === "error" && (
        <div className="center">
          <h1>Couldn&apos;t connect</h1>
          <p className="muted">Check your signal and try again.</p>
          <button className="btn primary" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {mode === "prompt" && <DayPrompt today={today} active={active} busy={busy} onChoose={choose} />}

      {mode === "finished" && finished && (
        <div className="center">
          <div className="muted small">Day finished &amp; saved</div>
          <h1>{fmtDayLong(finished.date)}</h1>
          <div className="big good">{fmtMoney(dayTotal(finished))}</div>
          <button className="btn primary" onClick={() => setMode("prompt")}>
            Start another day
          </button>
        </div>
      )}

      {mode === "active" && active && (
        <>
          <header className="head">
            <div>
              <div className="label">Working day</div>
              <div className="date">{fmtDay(active.date)}</div>
              {active.date !== today && <span className="chip night">🌙 Still on {fmtDay(active.date)} · calendar says {fmtDay(today)}</span>}
            </div>
            <div className="total">
              <div className="label">Today</div>
              <div className="num">{fmtMoney(dayTotal(active))}</div>
            </div>
          </header>

          <EarningsEditor day={active} onChange={onDayChange} />

          <section className="panel">
            <div className="row">
              <h2 style={{ margin: 0 }}>This week (Mon–Sun)</h2>
              <div style={{ fontWeight: 900, fontSize: 20 }}>{fmtMoney(week.reduce((s, d) => s + dayTotal(d), 0))}</div>
            </div>
            <WeekBars monday={mondayOf(active.date)} days={week} current={active.date} />
          </section>

          <div style={{ marginTop: 14 }}>
            <button className="btn danger" onClick={finish} disabled={busy}>
              Finish day
            </button>
          </div>
        </>
      )}

      <Nav />
    </main>
  );
}

function DayPrompt({
  today,
  active,
  busy,
  onChoose,
}: {
  today: string;
  active: Day | null;
  busy: boolean;
  onChoose: (date: string) => void;
}) {
  // "Still working" = the day that's currently open, or yesterday if nothing is open.
  const stillDate = active && active.date < today ? active.date : addDays(today, -1);
  return (
    <div className="center">
      <div className="muted small">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
      <h1>Which day are you working?</h1>
      <p className="muted" style={{ margin: 0 }}>
        Working through the night? Keep adding to yesterday until you finish.
      </p>

      <button className="choice new" disabled={busy} onClick={() => onChoose(today)}>
        <div className="t">Start a new day</div>
        <div className="d">{fmtDayLong(today)}</div>
        <div className="s">{active && active.date !== today ? `This will finish ${fmtDay(active.date)}` : "Fresh start, all apps at £0"}</div>
      </button>

      <button className="choice still" disabled={busy} onClick={() => onChoose(stillDate)}>
        <div className="t">🌙 Still working</div>
        <div className="d">{fmtDayLong(stillDate)}</div>
        <div className="s">
          {active && active.date === stillDate
            ? `Carry on · ${fmtMoney(dayTotal(active))} so far`
            : "Reopen and keep updating that day"}
        </div>
      </button>
    </div>
  );
}
