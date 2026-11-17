export function fmtMoney(pence: number): string {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "110.22" | "£110.22" | "110" -> 11022 pence. Returns null if invalid. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[£,\s]/g, "");
  if (clean === "") return null;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

export function penceToInput(pence: number | undefined): string {
  if (pence === undefined) return "";
  return (pence / 100).toFixed(2);
}
