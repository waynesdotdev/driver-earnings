"use client";

import { api } from "./api";
import { addDays, mondayOf } from "./dates";
import type { Platform } from "./platforms";
import { dayTotal, type Day } from "./types";

// Builds a spreadsheet of earnings for a date range, on the phone, and
// downloads it. Excel gets two sheets (Days, Weeks); CSV gets the Days table.

export type ExportFormat = "xlsx" | "csv";

const MONEY = '"£"#,##0.00';
const SHOW_EVERY_DAY_UP_TO = 62; // short ranges list every date; long ones only days with data

const WEEKDAY = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

interface Prepared {
  apps: Platform[];
  rows: { date: string; day?: Day; amounts: (number | null)[]; total: number }[];
  weeks: { monday: string; target: number | null; earned: number }[];
}

async function prepare(from: string, to: string, platforms: Platform[]): Promise<Prepared> {
  const [{ days }, { targets }] = await Promise.all([
    api.range(from, to),
    api.targets(mondayOf(from), to),
  ]);
  const byDate = new Map(days.map((d) => [d.date, d]));

  // only apps that earned something in this range, in the usual order
  const apps = platforms.filter((p) => days.some((d) => (d.earnings[p.id]?.amount_pence ?? 0) > 0));

  const allDates = datesBetween(from, to);
  const dates =
    allDates.length <= SHOW_EVERY_DAY_UP_TO
      ? allDates
      : allDates.filter((d) => {
          const day = byDate.get(d);
          return day && (dayTotal(day) > 0 || day.note);
        });

  const rows = dates.map((date) => {
    const day = byDate.get(date);
    const amounts = apps.map((p) => {
      const a = day?.earnings[p.id]?.amount_pence;
      return a === undefined ? null : a / 100;
    });
    return { date, day, amounts, total: dayTotal(day) / 100 };
  });

  // one row per week that had earnings or a target
  const targetBy = new Map(targets.map((t) => [t.monday, t.target_pence]));
  const weekMap = new Map<string, number>();
  for (const d of days) weekMap.set(mondayOf(d.date), (weekMap.get(mondayOf(d.date)) ?? 0) + dayTotal(d));
  for (const t of targets) if (!weekMap.has(t.monday)) weekMap.set(t.monday, 0);
  const weeks = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, earned]) => ({
      monday,
      target: targetBy.has(monday) ? targetBy.get(monday)! / 100 : null,
      earned: earned / 100,
    }));

  return { apps, rows, weeks };
}

function fileName(from: string, to: string, ext: string) {
  return from === to ? `driver-earnings_${from}.${ext}` : `driver-earnings_${from}_to_${to}.${ext}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const sum = (xs: (number | null)[]) => Math.round(xs.reduce<number>((s, x) => s + (x ?? 0), 0) * 100) / 100;

const csvCell = (v: string | number | null) => {
  if (v === null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Returns how many day rows were exported. */
export async function exportEarnings(from: string, to: string, format: ExportFormat, platforms: Platform[]): Promise<number> {
  const { apps, rows, weeks } = await prepare(from, to, platforms);

  if (format === "csv") {
    const lines = [
      ["Date", "Day", ...apps.map((p) => p.name), "Total", "Note"],
      ...rows.map((r) => [r.date, WEEKDAY(r.date), ...r.amounts.map((a) => (a === null ? null : a.toFixed(2))), r.total.toFixed(2), r.day?.note ?? ""]),
      [
        "Total",
        "",
        ...apps.map((_, i) => sum(rows.map((r) => r.amounts[i])).toFixed(2)),
        sum(rows.map((r) => r.total)).toFixed(2),
        "",
      ],
    ];
    const csv = "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n"); // BOM so Excel reads £ etc.
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName(from, to, "csv"));
    return rows.length;
  }

  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  type Cell = Record<string, unknown> | null;

  const head = (value: string): Cell => ({ value, fontWeight: "bold", backgroundColor: "#E8F5E9" });
  const money = (value: number | null, bold = false): Cell =>
    value === null ? null : { value, type: Number, format: MONEY, ...(bold ? { fontWeight: "bold" } : {}) };
  // Days sheet: Date | Day | apps… | Total | Note, then a totals row.
  // (Totals are plain numbers, not formulas, so every phone viewer shows them.)
  const daysSheet = [
    [head("Date"), head("Day"), ...apps.map((p) => head(p.name)), head("Total"), head("Note")],
    ...rows.map((r) => [
      { value: new Date(`${r.date}T00:00:00Z`), type: Date, format: "dd/mm/yyyy" },
      { value: WEEKDAY(r.date) },
      ...r.amounts.map((a) => money(a)),
      money(r.total, true),
      r.day?.note ? { value: r.day.note } : null,
    ]),
    [
      { value: "Total", fontWeight: "bold" },
      null,
      ...apps.map((_, i) => money(sum(rows.map((r) => r.amounts[i])), true)),
      money(sum(rows.map((r) => r.total)), true),
      null,
    ],
  ];

  // Weeks sheet: target − earned, like a running "still to make" spreadsheet
  const weeksSheet = [
    [head("Week starting"), head("Week ending"), head("Target"), head("Earned"), head("Still to make"), head("Hit target?")],
    ...weeks.map((w) => [
      { value: new Date(`${w.monday}T00:00:00Z`), type: Date, format: "dd/mm/yyyy" },
      { value: new Date(`${addDays(w.monday, 6)}T00:00:00Z`), type: Date, format: "dd/mm/yyyy" },
      money(w.target),
      money(w.earned),
      w.target === null ? null : money(Math.max(0, Math.round((w.target - w.earned) * 100) / 100)),
      w.target === null ? null : { value: w.earned >= w.target ? "Yes" : "No" },
    ]),
  ];

  await writeXlsxFile(
    [
      {
        sheet: "Days",
        data: daysSheet as never,
        columns: [{ width: 12 }, { width: 6 }, ...apps.map(() => ({ width: 13 })), { width: 12 }, { width: 40 }],
        stickyRowsCount: 1,
      },
      {
        sheet: "Weeks",
        data: weeksSheet as never,
        columns: [{ width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }],
        stickyRowsCount: 1,
      },
    ] as never
  ).toFile(fileName(from, to, "xlsx"));
  return rows.length;
}
