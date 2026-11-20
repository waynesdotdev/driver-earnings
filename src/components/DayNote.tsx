"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Day } from "@/lib/types";
import { Section } from "./Section";

/** A free-text note for the day ("Rain, very busy", "Tips came in late"…). */
export default function DayNote({ day, onChange, locked = false }: { day: Day; onChange: (day: Day) => void; locked?: boolean }) {
  const saved = day.note ?? "";
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // follow the saved note when it changes (e.g. after saving or reloading)…
  useEffect(() => setText(day.note ?? ""), [day.note]);
  // …and start fresh when switching to another day
  useEffect(() => setMsg(null), [day.date]);

  const dirty = text.trim() !== saved.trim();

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.note(day.date, text);
      onChange(r.day);
      setMsg({ ok: true, text: text.trim() ? "Saved ✓" : "Note cleared" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save, try again" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section id="notes" title="Notes" summary={saved ? <span className="small muted">📝</span> : undefined}>
      {locked ? (
        <p className={`note-text ${saved ? "" : "muted"}`}>{saved || "No note for this day."}</p>
      ) : (
        <div className="note-form">
          <textarea
            className="note-input"
            rows={3}
            maxLength={1000}
            placeholder="e.g. Rain all evening, very busy. Tips came in late."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setMsg(null);
            }}
          />
          <div className="row">
            <span className={`small ${msg ? (msg.ok ? "good" : "bad") : "muted"}`} style={{ fontWeight: msg ? 700 : 400 }}>
              {msg?.text ?? (dirty ? "Not saved yet" : "")}
            </span>
            <button className="btn primary note-save" onClick={save} disabled={busy || !dirty}>
              {busy ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
