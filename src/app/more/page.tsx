"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import { Section } from "@/components/Section";
import { api } from "@/lib/api";
import { addDays, addMonths, fmtDay, monthOf, monthRange, mondayOf, todayLocal } from "@/lib/dates";
import { exportEarnings, type ExportFormat } from "@/lib/exporter";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";
import { usePlatforms } from "@/lib/usePlatforms";

type RangeId = "this-week" | "last-week" | "this-month" | "last-month" | "this-year" | "all" | "custom";

function rangeFor(id: RangeId, custom: { from: string; to: string }): { from: string; to: string } {
  const today = todayLocal();
  const mon = mondayOf(today);
  switch (id) {
    case "this-week":
      return { from: mon, to: addDays(mon, 6) };
    case "last-week":
      return { from: addDays(mon, -7), to: addDays(mon, -1) };
    case "this-month":
      return monthRange(monthOf(today));
    case "last-month":
      return monthRange(addMonths(monthOf(today), -1));
    case "this-year":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case "all":
      return { from: "2000-01-01", to: today };
    case "custom":
      return custom;
  }
}

const RANGES: { id: RangeId; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "this-year", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Pick dates" },
];

export default function MorePage() {
  const platforms = usePlatforms();
  const [range, setRange] = useState<RangeId>("this-week");
  const [custom, setCustom] = useState(() => ({ from: mondayOf(todayLocal()), to: todayLocal() }));
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [theme, setTheme] = useState<ThemePref>("dark");

  useEffect(() => setTheme(getThemePref()), []);

  const { from, to } = rangeFor(range, custom);
  const badCustom = range === "custom" && (!from || !to || from > to);

  async function doExport(format: ExportFormat) {
    setBusy(format);
    setMsg(null);
    try {
      const n = await exportEarnings(from, to, format, platforms);
      setMsg({ ok: true, text: n ? `Downloaded ${n} day${n === 1 ? "" : "s"} ✓ Check your Downloads.` : "Downloaded, but there were no earnings in that range." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Export failed, try again" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="app">
      <header className="head">
        <div>
          <div className="label">More</div>
          <div className="date">Settings &amp; export</div>
        </div>
      </header>

      <Section id="more-export" title="Export to Excel / CSV">
        <div className="chips">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`chip-btn ${range === r.id ? "on" : ""}`}
              onClick={() => {
                setRange(r.id);
                setMsg(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="date-pair">
            <label className="field">
              <span>From</span>
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </label>
          </div>
        )}

        <p className="small muted" style={{ margin: "10px 0" }}>
          {badCustom
            ? "Pick a start date before the end date."
            : range === "all"
              ? "Every day you've saved, plus weekly targets."
              : `${fmtDay(from)} – ${fmtDay(to)}. One row per day, a column per app, totals and notes. Excel also gets a Weeks sheet with your target and how much was left to make.`}
        </p>

        <div className="export-btns">
          <button className="btn primary" disabled={!!busy || badCustom} onClick={() => doExport("xlsx")}>
            {busy === "xlsx" ? "Making file…" : "⬇ Excel (.xlsx)"}
          </button>
          <button className="btn" disabled={!!busy || badCustom} onClick={() => doExport("csv")}>
            {busy === "csv" ? "Making file…" : "⬇ CSV"}
          </button>
        </div>
        {msg && (
          <div className={`small ${msg.ok ? "good" : "bad"}`} style={{ fontWeight: 700, marginTop: 8 }}>
            {msg.text}
          </div>
        )}
      </Section>

      <Section id="more-theme" title="Appearance">
        <div className="seg-choice three">
          {(
            [
              ["dark", "🌙 Dark", "Easy on the eyes at night"],
              ["light", "☀️ Light", "Clearer in bright sun"],
              ["auto", "🌓 Auto", "Follows your phone"],
            ] as const
          ).map(([id, label, hint]) => (
            <button
              key={id}
              className={theme === id ? "on" : ""}
              aria-pressed={theme === id}
              onClick={() => {
                setTheme(id);
                setThemePref(id);
              }}
            >
              {label}
              <small>{hint}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section id="more-account" title="Account">
        <p className="small muted" style={{ margin: "0 0 10px" }}>
          You stay logged in on this phone for a year. Log out if it&apos;s not your phone.
        </p>
        <button
          className="btn danger"
          onClick={async () => {
            if (!window.confirm("Log out on this phone?")) return;
            await api.logout().catch(() => {});
            window.location.href = "/login";
          }}
        >
          Log out
        </button>
      </Section>

      <Nav />
    </main>
  );
}
