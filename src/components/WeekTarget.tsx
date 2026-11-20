"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { addDays, fmtDay, weekDates } from "@/lib/dates";
import { fmtMoney, parseMoney } from "@/lib/money";
import { Section } from "./Section";

// Example amounts that drift through the empty box. Never pre-filled.
const GHOSTS = [500, 600, 300, 750, 450, 650, 400, 800];
const SKIP_KEY = "de_target_skipped_week";
const CHANGED = "de-target-change"; // keeps the prompt and the panel in sync

/**
 * Weekly target: how much the driver wants to earn Mon–Sun, and how much is
 * still to make. `refDate` is the day being worked (for "days left").
 * show="prompt": only the big "how much this week?" card, when the week has no target.
 * show="panel":  only the collapsible Weekly target section.
 */
export default function WeekTarget({
  monday,
  earned,
  refDate,
  show,
  withPrompt = false,
}: {
  monday: string;
  earned: number;
  refDate: string;
  show: "prompt" | "panel";
  /** Panel only: a prompt card is also on this page, so stay hidden while it asks. */
  withPrompt?: boolean;
}) {
  const [target, setTarget] = useState<number | null | undefined>(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTarget(undefined);
    setEditing(false);
    const load = () => {
      try {
        setSkipped(localStorage.getItem(SKIP_KEY) === monday);
      } catch {}
      api
        .target(monday)
        .then((r) => !cancelled && setTarget(r.target_pence))
        .catch(() => !cancelled && setTarget(null));
    };
    load();
    window.addEventListener(CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(CHANGED, load);
    };
  }, [monday]);

  async function save(pence: number) {
    const r = await api.setTarget(monday, pence);
    setTarget(r.target_pence);
    setEditing(false);
    window.dispatchEvent(new Event(CHANGED));
  }

  if (target === undefined) return null;

  const weekLabel = `${fmtDay(monday)} – ${fmtDay(addDays(monday, 6))}`;

  const asking = target === null && !skipped;
  if (show === "prompt" && !asking) return null;
  if (show === "panel" && asking && withPrompt) return null; // the prompt card is showing instead

  // New week, no target yet: ask.
  if (show === "prompt") {
    return (
      <section className="panel target-prompt">
        <div className="small muted">New week · {weekLabel}</div>
        <h2 className="target-q">How much are you looking to earn this week?</h2>
        <TargetForm
          onSave={save}
          onCancel={() => {
            try {
              localStorage.setItem(SKIP_KEY, monday);
            } catch {}
            setSkipped(true);
            window.dispatchEvent(new Event(CHANGED));
          }}
          cancelLabel="Not now"
        />
      </section>
    );
  }

  if (target === null || editing) {
    return (
      <Section id="target" title="Weekly target">
        {editing || target !== null ? (
          <TargetForm onSave={save} onCancel={() => setEditing(false)} cancelLabel="Cancel" />
        ) : (
          <button className="btn" onClick={() => setEditing(true)}>
            Set a weekly target
          </button>
        )}
      </Section>
    );
  }

  const remaining = target - earned;
  const pct = target > 0 ? Math.min(100, (earned / target) * 100) : 100;
  const dates = weekDates(monday);
  const idx = dates.indexOf(refDate);
  const daysLeft = idx >= 0 ? 7 - idx : 0; // including the day being worked
  const weekOver = refDate > dates[6];

  return (
    <Section
      id="target"
      title="Weekly target"
      summary={
        <span className={`target-summary ${remaining <= 0 ? "good" : ""}`}>
          {remaining > 0 ? `${fmtMoney(remaining)} to go` : "Hit ✓"}
        </span>
      }
    >
      <div className="target-main">
        {remaining > 0 ? (
          <>
            <div className="small muted">{weekOver ? "Missed target by" : "Still to make"}</div>
            <div className="big">{fmtMoney(remaining)}</div>
          </>
        ) : (
          <>
            <div className="small muted">{remaining === 0 ? "Target hit exactly" : "Target hit · over by"}</div>
            <div className="big good">{remaining === 0 ? "🎉" : `+${fmtMoney(-remaining)}`}</div>
          </>
        )}
      </div>

      <div className="target-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div style={{ width: `${pct}%` }} className={remaining <= 0 ? "done" : ""} />
      </div>

      <div className="row small" style={{ marginTop: 8 }}>
        <span className="muted">
          Made <strong style={{ color: "var(--text)" }}>{fmtMoney(earned)}</strong> of {fmtMoney(target)}
        </span>
        <button className="small muted link" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>

      {remaining > 0 && daysLeft > 0 && (
        <div className="small muted" style={{ marginTop: 6 }}>
          About <strong style={{ color: "var(--text)" }}>{fmtMoney(Math.ceil(remaining / daysLeft))}</strong> a day over the{" "}
          {daysLeft === 1 ? "last day" : `${daysLeft} days left`} (incl. {fmtDay(refDate).split(" ")[0]})
        </div>
      )}
    </Section>
  );
}

function TargetForm({
  onSave,
  onCancel,
  cancelLabel,
}: {
  onSave: (pence: number) => Promise<void>;
  onCancel: () => void;
  cancelLabel: string;
}) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pence = parseMoney(value);
    if (pence === null || pence <= 0) {
      setErr("Enter an amount like 700");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave(pence);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save, try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="target-form">
      <FloatingAmountInput value={value} onChange={setValue} />
      {err && <div className="bad small" style={{ fontWeight: 700 }}>{err}</div>}
      <div className="target-actions">
        <button type="button" className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="submit" className="btn primary" disabled={saving || value.trim() === ""}>
          {saving ? "Saving…" : "Set target"}
        </button>
      </div>
    </form>
  );
}

/** Big £ box. While empty, example amounts float up through it and fade. */
function FloatingAmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const empty = value === "";

  useEffect(() => {
    if (!empty) return;
    const t = setInterval(() => setI((n) => (n + 1) % GHOSTS.length), 2200);
    return () => clearInterval(t);
  }, [empty]);

  return (
    <label className="float-input" onClick={() => ref.current?.focus()}>
      <span className="cur">£</span>
      <span className="float-field">
        <input
          ref={ref}
          inputMode="decimal"
          enterKeyHint="done"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Weekly target in pounds"
        />
        {empty && (
          <span className="ghosts" aria-hidden="true">
            <span className="ghost-zero">0</span>
            <span className="ghost" key={i}>
              {GHOSTS[i]}
            </span>
          </span>
        )}
      </span>
    </label>
  );
}
