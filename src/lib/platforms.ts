export type PlatformId = "ubereats" | "deliveroo" | "justeat" | "stuart" | "amazonflex";

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
}

// Brand-inspired colours so each app is instantly recognisable at a glance.
export const PLATFORMS: Platform[] = [
  { id: "ubereats", name: "Uber Eats", bg: "#06C167", fg: "#000000", accent: "#000000" },
  { id: "deliveroo", name: "Deliveroo", bg: "#00CCBC", fg: "#002B29", accent: "#ffffff" },
  { id: "justeat", name: "Just Eat", bg: "#FF8000", fg: "#241000", accent: "#ffffff" },
  { id: "stuart", name: "Stuart", bg: "#2F3CFF", fg: "#ffffff", accent: "#ffffff" },
  { id: "amazonflex", name: "Amazon Flex", bg: "#232F3E", fg: "#FF9900", accent: "#FF9900", chartEdge: "#FF9900" },
];

export const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as PlatformId[];

export function isPlatform(x: unknown): x is PlatformId {
  return typeof x === "string" && (PLATFORM_IDS as string[]).includes(x);
}
