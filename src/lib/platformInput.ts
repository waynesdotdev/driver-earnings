import { BUILTIN_PLATFORMS, COLOR_RE } from "./platforms";
import type { CustomPlatformRow } from "./db";

/** Checks a name + colour for a custom app. Returns an error message, or the cleaned values. */
export function checkPlatformInput(
  body: unknown,
  existing: CustomPlatformRow[],
  selfId?: string
): { error: string } | { name: string; color: string } {
  const b = (body ?? {}) as { name?: unknown; color?: unknown };
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  const color = typeof b.color === "string" ? b.color : "";
  if (name.length < 1 || name.length > 30) return { error: "Name must be 1–30 characters" };
  if (!COLOR_RE.test(color)) return { error: "Pick a colour" };
  const taken = [...BUILTIN_PLATFORMS, ...existing.filter((p) => p.id !== selfId)].some(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (taken) return { error: `You already have an app called ${name}` };
  return { name, color: color.toUpperCase() };
}
