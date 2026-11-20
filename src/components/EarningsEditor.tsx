"use client";

import { useEffect, useRef, useState } from "react";
import { PLATFORMS, PLATFORM_IDS, isPlatform, type Platform, type PlatformId } from "@/lib/platforms";
import { fmtMoney, parseMoney, penceToInput } from "@/lib/money";
import { fmtTime } from "@/lib/dates";
import { api } from "@/lib/api";
import type { Day, Entry } from "@/lib/types";

interface Props {
  day: Day;
  onChange: (day: Day) => void;
  /** Ask for confirmation before saving (used when editing past days). */
  confirmLabel?: string;
  /** Show the figures only: no editing, no adding apps. */
  locked?: boolean;
}

// Which apps are always shown. Stored per phone. Apps that aren't pinned
// can still be added for a day with the "+ App" buttons.
const PINNED_KEY = "de_pinned_apps";
const DEFAULT_PINNED: PlatformId[] = ["ubereats", "deliveroo", "justeat"];

function usePinned(): [PlatformId[], (ids: PlatformId[]) => void] {
  const [pinned, setPinned] = useState<PlatformId[]>(DEFAULT_PINNED);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      if (raw) setPinned((JSON.parse(raw) as unknown[]).filter(isPlatform));
    } catch {}
  }, []);
  const save = (ids: PlatformId[]) => {
    setPinned(ids);
    localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  };
  return [pinned, save];
}

export default function EarningsEditor({ day, onChange, confirmLabel, locked = false }: Props) {
  const [editing, setEditing] = useState<PlatformId | null>(null);
  const [added, setAdded] = useState<PlatformId[]>([]);
  const [managing, setManaging] = useState(false);
  const [pinned, setPinned] = usePinned();

  // reset temporary add-ons when switching day
  useEffect(() => setAdded([]), [day.date]);

  // An app is shown if it's pinned, already has a figure today, or was just added.
  // Locked: only apps that have a figure.
  const visible = PLATFORMS.filter((p) =>
    locked ? day.earnings[p.id] : pinned.includes(p.id) || day.earnings[p.id] || added.includes(p.id)
  );
  const hidden = PLATFORMS.filter((p) => !visible.includes(p));

  function done(id: PlatformId) {
    setEditing(null);
    // drop a temporary add-on again if nothing was saved for it
    if (!day.earnings[id]) setAdded((a) => a.filter((x) => x !== id));
  }

  return (
    <div className="cards">
      {visible.map((p) => (
        <PlatformCard
          key={p.id}
          platform={p}
          entry={day.earnings[p.id]}
          locked={locked}
          editing={!locked && editing === p.id}
          onEdit={() => setEditing(p.id)}
          onDone={() => done(p.id)}
          onSave={async (pence) => {
            if (confirmLabel && !window.confirm(`${confirmLabel}\n\nSave ${p.name} as ${pence === null ? "empty" : fmtMoney(pence)}?`)) {
              return false;
            }
            const res = await api.set(day.date, p.id, pence);
            onChange(res.day);
            if (pence === null) setAdded((a) => a.filter((x) => x !== p.id));
            return true;
          }}
        />
      ))}

      {locked && visible.length === 0 && <div className="panel muted">No earnings saved for this day.</div>}

      {!locked && (
        <div className="addons">
          {hidden.map((p) => (
            <button
              key={p.id}
              className="addon"
              style={{ background: p.bg, color: p.fg }}
              onClick={() => {
                setAdded((a) => [...a, p.id]);
                setEditing(p.id);
              }}
            >
              + {p.name}
            </button>
          ))}
          <button className="addon manage" onClick={() => setManaging((m) => !m)} aria-expanded={managing}>
            ⚙ Apps
          </button>
        </div>
      )}

      {!locked && managing && (
        <div className="panel manage-panel">
          <div className="row">
            <h2 style={{ margin: 0 }}>Always show</h2>
            <button className="small muted" onClick={() => setManaging(false)}>
              Done
            </button>
          </div>
          <p className="small muted" style={{ margin: "4px 0 6px" }}>
            Turned-off apps hide away as “+” buttons. They still show on days you&apos;ve entered a figure.
          </p>
          {PLATFORMS.map((p) => {
            const on = pinned.includes(p.id);
            return (
              <label key={p.id} className="toggle-row">
                <span className="dot" style={{ background: p.bg, color: p.fg }}>
                  {p.name}
                </span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={on}
                  onChange={() => setPinned(on ? pinned.filter((x) => x !== p.id) : PLATFORM_IDS.filter((x) => x === p.id || pinned.includes(x)))}
                />
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformCard({
  platform: p,
  entry,
  locked,
  editing,
  onEdit,
  onDone,
  onSave,
}: {
  platform: Platform;
  entry?: Entry;
  locked: boolean;
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

  if (locked) {
    return (
      <div className="pcard locked" style={style}>
        <div>
          <div className="pname">{p.name}</div>
          <div className="pmeta">{entry ? `Updated ${fmtTime(entry.updated_at)}` : ""}</div>
        </div>
        <div className="pamt">{entry ? fmtMoney(entry.amount_pence) : "£ —"}</div>
      </div>
    );
  }

  // A saved £0 gets its own Remove button, which clears the entry (and puts a
  // non-pinned app back behind its "+" button).
  if (!editing && entry && entry.amount_pence === 0) {
    return (
      <div className="pcard zero" style={style}>
        <button className="pcard-main" onClick={onEdit}>
          <div>
            <div className="pname">{p.name}</div>
            <div className="pmeta">Updated {fmtTime(entry.updated_at)}</div>
          </div>
          <div className="pamt">{fmtMoney(0)}</div>
        </button>
        <button
          className="pcard-remove"
          style={{ color: p.fg, borderColor: p.fg }}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(null);
            } catch {
              window.alert(`Couldn't remove ${p.name}, try again`);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "…" : "Remove"}
        </button>
      </div>
    );
  }

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
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
      </form>
      {err && <div className="edit-err">{err}</div>}
    </div>
  );
}
