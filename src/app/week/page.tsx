"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { DayList, PlatformSplit } from "@/components/Summary";
import { Section } from "@/components/Section";
import WeekTarget from "@/components/WeekTarget";
import { api } from "@/lib/api";
import { addDays, fmtDay, mondayOf, todayLocal, weekDates } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import { dayTotal, type Day } from "@/lib/types";

export default function WeekPage() {
  const [monday, setMonday] = useState(() => mondayOf(todayLocal()));
  const [days, setDays] = useState<Day[] | null>(null);
  const [prevTotal, setPrevTotal] = useState(0);
  const [activeDate, setActiveDate] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    // fetch this week + last week in one go for the comparison
    api.range(addDays(monday, -7), addDays(monday, 6)).then(({ days: all }) => {
      if (cancelled) return;
      setDays(all.filter((d) => d.date >= monday));
      setPrevTotal(all.filter((d) => d.date < monday).reduce((s, d) => s + dayTotal(d), 0));
    });
    api.active().then(({ active }) => !cancelled && setActiveDate(active?.date));
    return () => {
      cancelled = true;
    };
  }, [monday]);

  const total = (days ?? []).reduce((s, d) => s + dayTotal(d), 0);
  const worked = (days ?? []).filter((d) => dayTotal(d) > 0).length;
  const diff = total - prevTotal;
  const isCurrent = monday === mondayOf(todayLocal());

  return (
    <main className="app">
      <header className="head">
        <div className="pager" style={{ width: "100%" }}>
          <button onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week">
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <div className="label">{isCurrent ? "This week" : "Week"}</div>
            <div className="date" style={{ fontSize: 18 }}>
              {fmtDay(monday)} – {fmtDay(addDays(monday, 6))}
            </div>
          </div>
          <button onClick={() => setMonday(addDays(monday, 7))} disabled={isCurrent} aria-label="Next week">
            ›
          </button>
        </div>
      </header>

      {!days ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          <Section id="week-total" title="Week total">
            <div className="row">
              <div>
                <div className="big good">{fmtMoney(total)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="small muted">{worked} day{worked === 1 ? "" : "s"} worked</div>
                <div className="small muted">avg {fmtMoney(worked ? Math.round(total / worked) : 0)}/day</div>
                <div className={`small ${diff >= 0 ? "good" : "bad"}`} style={{ fontWeight: 800 }}>
                  {diff >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(diff))} vs last week
                </div>
              </div>
            </div>
          </Section>

          <WeekTarget
            show="panel"
            monday={monday}
            earned={total}
            earnedToday={dayTotal(days.find((d) => d.date === todayLocal()))}
            refDate={todayLocal()}
          />

          <Section id="week-by-app" title="By app">
            <PlatformSplit days={days} />
          </Section>

          <Section id="week-days" title="Days">
            <DayList dates={weekDates(monday)} days={days} activeDate={activeDate} />
          </Section>
        </>
      )}
      <Nav />
    </main>
  );
}
