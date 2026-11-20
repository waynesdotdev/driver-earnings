"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_PINNED, SWATCHES, customPlatform, type Platform, type PlatformId } from "@/lib/platforms";
import { usePlatforms, setCustomPlatforms } from "@/lib/usePlatforms";
import { checkMoney, fmtMoney, penceToInput } from "@/lib/money";
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

// Which apps are Priority (always shown). Stored per phone. The rest are
// "As needed": they hide away as "+ App" buttons until used that day.
const PINNED_KEY = "de_pinned_apps";

function usePinned(): [PlatformId[], (ids: PlatformId[]) => void] {
  const [pinned, setPinned] = useState<PlatformId[]>(DEFAULT_PINNED);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      if (raw) setPinned((JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string"));
    } catch {}
  }, []);
  const save = (ids: PlatformId[]) => {
    setPinned(ids);
    try {
      localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
    } catch {}
  };
  return [pinned, save];
}

export default function EarningsEditor({ day, onChange, confirmLabel, locked = false }: Props) {
  const PLATFORMS = usePlatforms();
  const [editing, setEditing] = useState<PlatformId | null>(null);
  const [added, setAdded] = useState<PlatformId[]>([]);
  const [managing, setManaging] = useState(false);
  const [pinned, setPinned] = usePinned();
  // in the Apps panel: "new" = adding an app, or the id of the app being edited
  const [appForm, setAppForm] = useState<"new" | PlatformId | null>(null);

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

  // (cards are always drawn in app order, so the order of this list doesn't matter)
  function setPriority(id: PlatformId, on: boolean) {
    const rest = pinned.filter((x) => x !== id);
    setPinned(on ? [...rest, id] : rest);
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
            <h2 style={{ margin: 0 }}>Your apps</h2>
            <button
              className="small muted"
              onClick={() => {
                setManaging(false);
                setAppForm(null);
              }}
            >
              Done
            </button>
          </div>
          <p className="small muted" style={{ margin: "4px 0 6px" }}>
            <strong>On = Priority</strong>: always on screen. <strong>Off = As needed</strong>: hides away as a “+” button
            until you use it. Apps always show on days you&apos;ve entered a figure.
          </p>
          {PLATFORMS.map((p) =>
            appForm === p.id ? (
              <AppForm
                key={p.id}
                editing={p}
                taken={PLATFORMS.filter((x) => x.id !== p.id).map((x) => x.name)}
                onClose={() => setAppForm(null)}
                onSaved={() => setAppForm(null)}
              />
            ) : (
              <div key={p.id} className="toggle-row">
                <span className="dot" style={{ background: p.bg, color: p.fg }}>
                  {p.name}
                </span>
                <span className="row-actions">
                  {p.custom && (
                    <button className="small muted link" onClick={() => setAppForm(p.id)}>
                      Edit
                    </button>
                  )}
                  <input
                    type="checkbox"
                    className="switch"
                    aria-label={`${p.name}: Priority`}
                    checked={pinned.includes(p.id)}
                    onChange={(e) => setPriority(p.id, e.target.checked)}
                  />
                </span>
              </div>
            )
          )}

          {appForm === "new" ? (
            <AppForm
              taken={PLATFORMS.map((x) => x.name)}
              defaultColor={SWATCHES[(PLATFORMS.length - 5) % SWATCHES.length]}
              onClose={() => setAppForm(null)}
              onSaved={(id, priority) => {
                setAppForm(null);
                if (priority) setPriority(id, true);
              }}
            />
          ) : (
            <button className="btn add-app" onClick={() => setAppForm("new")}>
              + Add your own app
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Add an app (name, colour, Priority / As needed), or rename / recolour / delete one. */
function AppForm({
  editing,
  taken,
  defaultColor = SWATCHES[0],
  onClose,
  onSaved,
}: {
  editing?: Platform;
  taken: string[];
  defaultColor?: string;
  onClose: () => void;
  onSaved: (id: PlatformId, priority: boolean) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState((editing?.bg ?? defaultColor).toUpperCase());
  const [priority, setPriorityChoice] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clean = name.trim().replace(/\s+/g, " ");
  const preview = customPlatform({ id: "preview", name: clean || "Your app", color });
  const isCustomColor = !SWATCHES.includes(color);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clean) return setErr("Give it a name");
    if (taken.some((t) => t.toLowerCase() === clean.toLowerCase())) return setErr(`You already have an app called ${clean}`);
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        const r = await api.editPlatform(editing.id, clean, color);
        setCustomPlatforms(r.platforms);
        onSaved(editing.id, false);
      } else {
        const r = await api.addPlatform(clean, color);
        setCustomPlatforms(r.platforms);
        onSaved(r.platform.id, priority);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save, try again");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing || !window.confirm(`Delete ${editing.name}?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.deletePlatform(editing.id);
      setCustomPlatforms(r.platforms);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete, try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="app-form" onSubmit={save}>
      <div className="app-form-title">{editing ? `Edit ${editing.name}` : "Add your own app"}</div>

      <label className="field">
        <span>Name</span>
        <input
          autoFocus
          maxLength={30}
          placeholder="e.g. Bolt Food, Gophr, Beelivery"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr(null);
          }}
        />
      </label>

      <div className="field">
        <span>Colour</span>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${color === c ? "on" : ""}`}
              style={{ background: c }}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
            />
          ))}
          <label className={`swatch any ${isCustomColor ? "on" : ""}`} style={isCustomColor ? { background: color } : undefined}>
            <input type="color" value={color.toLowerCase()} onChange={(e) => setColor(e.target.value.toUpperCase())} aria-label="Any colour" />
          </label>
        </div>
      </div>

      {!editing && (
        <div className="field">
          <span>Show it</span>
          <div className="seg-choice">
            <button type="button" className={priority ? "on" : ""} onClick={() => setPriorityChoice(true)}>
              Priority
              <small>Always on screen</small>
            </button>
            <button type="button" className={!priority ? "on" : ""} onClick={() => setPriorityChoice(false)}>
              As needed
              <small>A “+” button</small>
            </button>
          </div>
        </div>
      )}

      <div className="pcard preview" style={{ background: preview.bg, color: preview.fg }} aria-hidden="true">
        <div>
          <div className="pname">{preview.name}</div>
          <div className="pmeta">Preview</div>
        </div>
        <div className="pamt">£0.00</div>
      </div>

      {err && <div className="bad small" style={{ fontWeight: 700 }}>{err}</div>}

      <div className="app-form-actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "Saving…" : editing ? "Save" : "Add app"}
        </button>
      </div>
      {editing && (
        <button type="button" className="small bad link" onClick={remove} disabled={busy} style={{ alignSelf: "center" }}>
          Delete this app
        </button>
      )}
    </form>
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
    // empty = clear this app for the day; otherwise it must be a valid amount
    let pence: number | null = null;
    if (value.trim() !== "") {
      const r = checkMoney(value);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      pence = r.pence;
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
