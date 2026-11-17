"use client";

import { useEffect, useRef, useState } from "react";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { fmtMoney, parseMoney, penceToInput } from "@/lib/money";
import { fmtTime } from "@/lib/dates";
import { api } from "@/lib/api";
import type { Day, Entry } from "@/lib/types";

interface Props {
  day: Day;
  onChange: (day: Day) => void;
  /** Ask for confirmation before saving (used when editing past days). */
  confirmLabel?: string;
}

export default function EarningsEditor({ day, onChange, confirmLabel }: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="cards">
      {PLATFORMS.map((p) => (
        <PlatformCard
          key={p.id}
          platform={p}
          entry={day.earnings[p.id]}
          editing={editing === p.id}
          onEdit={() => setEditing(p.id)}
          onDone={() => setEditing(null)}
          onSave={async (pence) => {
            if (confirmLabel && !window.confirm(`${confirmLabel}\n\nSave ${p.name} as ${pence === null ? "empty" : fmtMoney(pence)}?`)) {
              return false;
            }
            const res = await api.set(day.date, p.id, pence);
            onChange(res.day);
            return true;
          }}
        />
      ))}
    </div>
  );
}

function PlatformCard({
  platform: p,
  entry,
  editing,
  onEdit,
  onDone,
  onSave,
}: {
  platform: Platform;
  entry?: Entry;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSave: (pence: number | null) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(penceToInput(entry?.amount_pence));
      setErr(null);
      // select so typing replaces the old number straight away
      setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = { background: p.bg, color: p.fg };

  if (!editing) {
    return (
      <button className="pcard" style={style} onClick={onEdit}>
        <div>
          <div className="pname">{p.name}</div>
          <div className="pmeta">{entry ? `Updated ${fmtTime(entry.updated_at)}` : "Tap to enter"}</div>
        </div>
        <div className={entry ? "pamt" : "pamt empty"}>{entry ? fmtMoney(entry.amount_pence) : "£ —"}</div>
      </button>
    );
  }

  async function save() {
    const trimmed = value.trim();
    const pence = trimmed === "" ? null : parseMoney(trimmed);
    if (trimmed !== "" && pence === null) {
      setErr("Enter an amount like 110.22");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const ok = await onSave(pence);
      if (ok) onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save, try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pcard editing" style={style}>
      <div className="row">
        <div className="pname">{p.name}</div>
        <div className="edit-hint">Current total in the {p.name} app</div>
      </div>
      <form
        className="edit-row"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="money">
          <span>£</span>
          <input
            ref={inputRef}
            autoFocus
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`${p.name} amount`}
          />
        </label>
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? "…" : "Save"}
        </button>
        <button type="button" className="btn-cancel" onClick={onDone} aria-label="Cancel">
          ✕
        </button>
      </form>
      {err && <div className="edit-err">{err}</div>}
    </div>
  );
}
