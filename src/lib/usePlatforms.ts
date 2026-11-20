"use client";

import { useEffect, useSyncExternalStore } from "react";
import { BUILTIN_PLATFORMS, customPlatform, type Platform } from "./platforms";
import type { CustomPlatformRow } from "./db";

// Built-in apps + the ones the driver added. Fetched once and shared by every
// screen; the last list is kept on the phone so it shows instantly next time.
const CACHE_KEY = "de_custom_apps";

let custom: CustomPlatformRow[] | null = null;
let all: Platform[] = BUILTIN_PLATFORMS;
let fetching: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(rows: CustomPlatformRow[]) {
  custom = rows;
  all = [...BUILTIN_PLATFORMS, ...rows.map(customPlatform)];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {}
  listeners.forEach((l) => l());
}

function load() {
  if (custom === null) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as CustomPlatformRow[] | null;
      if (Array.isArray(cached)) set(cached);
    } catch {}
  }
  if (!fetching) {
    fetching = fetch("/api/platforms", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ platforms: CustomPlatformRow[] }>) : null))
      .then((j) => {
        if (j) set(j.platforms);
      })
      .catch(() => {});
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Every app (built-in first, then the driver's own, oldest first). */
export function usePlatforms(): Platform[] {
  useEffect(load, []);
  return useSyncExternalStore(
    subscribe,
    () => all,
    () => BUILTIN_PLATFORMS
  );
}

/** Call with the list the server returns after adding / editing / deleting an app. */
export function setCustomPlatforms(rows: CustomPlatformRow[]) {
  set(rows);
}
