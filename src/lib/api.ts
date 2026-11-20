"use client";

import type { Day, MonthSummary, WeekTarget } from "./types";
import type { PlatformId } from "./platforms";
import type { CustomPlatformRow } from "./db";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorised");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  active: () => req<{ active: Day | null }>("/api/active"),
  day: (date: string) => req<{ day: Day }>(`/api/day/${date}`),
  start: (date: string) => req<{ day: Day }>(`/api/day/${date}/start`, { method: "POST" }),
  close: (date: string) => req<{ day: Day }>(`/api/day/${date}/close`, { method: "POST" }),
  set: (date: string, platform: PlatformId, amount_pence: number | null) =>
    req<{ day: Day }>(`/api/day/${date}`, { method: "PUT", body: JSON.stringify({ platform, amount_pence }) }),
  note: (date: string, note: string) =>
    req<{ day: Day }>(`/api/day/${date}/note`, { method: "PUT", body: JSON.stringify({ note }) }),
  range: (from: string, to: string) => req<{ days: Day[] }>(`/api/range?from=${from}&to=${to}`),
  target: (monday: string) => req<WeekTarget>(`/api/target?monday=${monday}`),
  setTarget: (monday: string, target_pence: number) =>
    req<WeekTarget>("/api/target", { method: "PUT", body: JSON.stringify({ monday, target_pence }) }),
  targets: (from: string, to: string) =>
    req<{ targets: { monday: string; target_pence: number }[] }>(`/api/targets?from=${from}&to=${to}`),
  months: () => req<{ months: MonthSummary[] }>("/api/months"),
  addPlatform: (name: string, color: string) =>
    req<{ platform: CustomPlatformRow; platforms: CustomPlatformRow[] }>("/api/platforms", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    }),
  editPlatform: (id: string, name: string, color: string) =>
    req<{ platforms: CustomPlatformRow[] }>(`/api/platforms/${id}`, { method: "PATCH", body: JSON.stringify({ name, color }) }),
  deletePlatform: (id: string) => req<{ platforms: CustomPlatformRow[] }>(`/api/platforms/${id}`, { method: "DELETE" }),
  verifyPin:(pin: string) => req<{ ok: true }>("/api/verify-pin", { method: "POST", body: JSON.stringify({ pin }) }),
  login: (pin: string) => req<{ ok: true }>("/api/login", { method: "POST", body: JSON.stringify({ pin }) }),
  logout: () => req<{ ok: true }>("/api/logout", { method: "POST" }),
};
