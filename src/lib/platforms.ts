// An app's id. Built-in apps use fixed ids ("ubereats" …); apps people add
// themselves get "c_" + a random id and live in the `platforms` table.
export type PlatformId = string;

export interface Platform {
  id: PlatformId;
  name: string;
  /** Card background */
  bg: string;
  /** Text colour on the card */
  fg: string;
  /** Accent (border / highlight) */
  accent: string;
  /** Outline its layer in the week bar chart (for colours too dark to see on the dark background) */
  chartEdge?: string;
  /** Added by the user (can be edited / deleted) */
  custom?: boolean;
}

// Brand-inspired colours so each app is instantly recognisable at a glance.
export const BUILTIN_PLATFORMS: Platform[] = [
  { id: "ubereats", name: "Uber Eats", bg: "#06C167", fg: "#000000", accent: "#000000" },
  { id: "deliveroo", name: "Deliveroo", bg: "#00CCBC", fg: "#002B29", accent: "#ffffff" },
  { id: "justeat", name: "Just Eat", bg: "#FF8000", fg: "#241000", accent: "#ffffff" },
  { id: "stuart", name: "Stuart", bg: "#2F3CFF", fg: "#ffffff", accent: "#ffffff" },
  { id: "amazonflex", name: "Amazon Flex", bg: "#232F3E", fg: "#FF9900", accent: "#FF9900", chartEdge: "#FF9900" },
];

/** Shown on screen by default (Priority) until the driver changes it. */
export const DEFAULT_PINNED: PlatformId[] = ["ubereats", "deliveroo", "justeat"];

export function isBuiltin(id: unknown): boolean {
  return typeof id === "string" && BUILTIN_PLATFORMS.some((p) => p.id === id);
}

export const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Colours people can pick from when adding an app (they can also pick any colour). */
export const SWATCHES = [
  "#E53935", "#D81B60", "#8E24AA", "#5E35B1", "#1E88E5", "#00ACC1",
  "#43A047", "#C0CA33", "#FDD835", "#FB8C00", "#6D4C41", "#ECEFF1",
];

/** 0 (black) … 1 (white) */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A custom app's card colours from the one colour the driver picked. */
export function customPlatform(row: { id: string; name: string; color: string }): Platform {
  const lum = luminance(row.color);
  const fg = lum > 0.35 ? "#000000" : "#ffffff"; // readable text on any colour
  return {
    id: row.id,
    name: row.name,
    bg: row.color,
    fg,
    accent: fg,
    chartEdge: lum < 0.03 ? "#ffffff" : undefined, // very dark: outline it in the chart
    custom: true,
  };
}
