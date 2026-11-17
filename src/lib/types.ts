import type { PlatformId } from "./platforms";

export interface Entry {
  amount_pence: number;
  updated_at: string;
}

export interface Day {
  date: string;
  status: "open" | "closed" | "none";
  started_at: string | null;
  closed_at: string | null;
  earnings: Partial<Record<PlatformId, Entry>>;
}

export interface MonthSummary {
  month: string;
  total_pence: number;
  days: number;
}

export function dayTotal(day: Pick<Day, "earnings"> | undefined): number {
  if (!day) return 0;
  return Object.values(day.earnings).reduce((s, e) => s + (e?.amount_pence ?? 0), 0);
}
