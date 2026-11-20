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
  // A finished day is locked until the PIN is re-entered (lasts until you leave the page).
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!isDateStr(date)) return;
    api.day(date).then(({ day }) => setDay(day));
    api.active().then(({ active }) => setActiveDate(active?.date ?? null));
  }, [date]);

  if (!isDateStr(date)) return <main className="app loading">Invalid date</main>;

  const isActive = activeDate === date;
  const isFuture = date > todayLocal();
  const finished = day?.status === "closed" && !isActive;
  const locked = finished && !unlocked;

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
          ) : locked ? (
            <UnlockBox date={date} closedAt={day.closed_at} activeDate={activeDate} onUnlock={() => setUnlocked(true)} />
          ) : finished ? (
            <div className="banner warn">
              <strong>🔓 Unlocked: {fmtDayLong(date)}</strong>
              <br />
              This is a finished day, not the one you&apos;re working. Changes replace what was saved. It locks again when you
              leave this page.
            </div>
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
            locked={locked}
            // a finished day already needed the PIN, so no extra pop-up on each save
            confirmLabel={isActive || finished ? undefined : `You are changing a past day: ${fmtDayLong(date)}.`}
          />
        </>
      )}
      <Nav />
    </main>
  );
}

/** The "are you sure?" box on a finished day, with a PIN to unlock editing. */
function UnlockBox({
  date,
  closedAt,
  activeDate,
  onUnlock,
}: {
  date: string;
  closedAt: string | null;
  activeDate: string | null;
  onUnlock: () => void;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.verifyPin(pin);
      onUnlock();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not check PIN");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lockbox" onSubmit={submit}>
      <div className="lock-ico" aria-hidden="true">
        🔒
      </div>
      <h2>This isn&apos;t the day you&apos;re working</h2>
      <p>
        <strong>{fmtDayLong(date)}</strong> is finished{closedAt ? ` (closed at ${fmtTime(closedAt)})` : ""}.
        {activeDate && activeDate !== date && <> You&apos;re currently working {fmtDay(activeDate)}.</>}
      </p>
      <p>Updating it because tips came in late, or an app adjusted your pay? Enter your PIN to unlock it.</p>
      <input
        className="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        placeholder="PIN"
        aria-label="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      {err && <div className="bad" style={{ fontWeight: 700 }}>{err}</div>}
      <button className="btn primary" disabled={busy || !pin}>
        {busy ? "Checking…" : "Unlock to edit"}
      </button>
      <button type="button" className="btn" onClick={() => router.back()}>
        Not this day, go back
      </button>
    </form>
  );
}
