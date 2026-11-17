"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import EarningsEditor from "@/components/EarningsEditor";
import { api } from "@/lib/api";
import { fmtDay, fmtDayLong, fmtTime, isDateStr, todayLocal } from "@/lib/dates";
import { fmtMoney } from "@/lib/money";
import { dayTotal, type Day } from "@/lib/types";

export default function DayPage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const [day, setDay] = useState<Day | null>(null);
  const [activeDate, setActiveDate] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isDateStr(date)) return;
    api.day(date).then(({ day }) => setDay(day));
    api.active().then(({ active }) => setActiveDate(active?.date ?? null));
  }, [date]);

  if (!isDateStr(date)) return <main className="app loading">Invalid date</main>;

  const isActive = activeDate === date;
  const isFuture = date > todayLocal();

  return (
    <main className="app">
      <header className="head">
        <div>
          <button className="label" onClick={() => router.back()} style={{ padding: 0 }}>
            ‹ Back
          </button>
          <div className="date">{fmtDay(date)}</div>
        </div>
        <div className="total">
          <div className="label">Day total</div>
          <div className="num">{fmtMoney(dayTotal(day ?? undefined))}</div>
        </div>
      </header>

      {!day || activeDate === undefined ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          {isActive ? (
            <div className="banner info">This is your current working day.</div>
          ) : (
            <div className="banner warn">
              <strong>⚠ You are editing a past day</strong>
              <br />
              {fmtDayLong(date)}
              {isFuture && " (this date is in the future)"}
              <br />
              Changes replace what was saved for this day.
              {day.closed_at && <> Finished at {fmtTime(day.closed_at)}.</>}
            </div>
          )}
          <EarningsEditor
            day={day}
            onChange={setDay}
            confirmLabel={isActive ? undefined : `You are changing a past day: ${fmtDayLong(date)}.`}
          />
        </>
      )}
      <Nav />
    </main>
  );
}
