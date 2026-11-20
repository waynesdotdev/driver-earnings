"use client";

import { useCallback, useSyncExternalStore } from "react";

// Remembers (per phone) which sections / figures the driver has closed.
// Everything is open until it's closed.
const KEY = "de_closed_sections";
const EVENT = "de-closed-change";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** [isOpen, toggle] for one section id. Open by default. */
export function useOpen(id: string): [boolean, () => void] {
  const closed = useSyncExternalStore(
    subscribe,
    () => read().includes(id),
    () => false // server render: everything open
  );
  const toggle = useCallback(() => {
    const ids = read();
    write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }, [id]);
  return [!closed, toggle];
}
