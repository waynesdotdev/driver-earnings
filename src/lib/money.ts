export function fmtMoney(pence: number): string {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Highest amount accepted for one app on one day: £100,000. */
export const MAX_EARNING_PENCE = 10_000_000;
/** Highest weekly target accepted: £1,000,000. */
export const MAX_TARGET_PENCE = 100_000_000;

export type MoneyCheck = { ok: true; pence: number } | { ok: false; error: string };

/**
 * Turns what was typed into whole pence, or a friendly reason it can't be used.
 * Accepts "110.22", "£110.22", "110", "110.5", ".50", "1,234.50", " 7.50 ".
 * Rejects minus amounts (apps never take money off you), letters, more than 2
 * decimal places, a comma used as the decimal point ("12,50" would otherwise
 * become £1,250) and anything above `max`.
 */
export function checkMoney(input: string, max = MAX_EARNING_PENCE): MoneyCheck {
  const raw = input.trim();
  if (raw === "") return { ok: false, error: "Enter an amount" };
  if (/[-−–]/.test(raw)) return { ok: false, error: "Amounts can't be negative" };

  let s = raw.replace(/£/g, "").replace(/\s+/g, "");
  if (s.includes(",")) {
    // commas are fine only as thousands separators: 1,234 or 12,345.67
    if (!/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) return { ok: false, error: "Use a full stop for pence, like 12.50" };
    s = s.replace(/,/g, "");
  }
  if (/^\d*\.\d{3,}$/.test(s)) return { ok: false, error: "Only 2 digits after the point, like 12.50" };
  const m = /^(\d*)(?:\.(\d{0,2}))?$/.exec(s);
  if (!m || (m[1] === "" && !m[2])) return { ok: false, error: "Numbers only, like 110.22" };

  // whole-number maths, so there's never a rounding error
  const pounds = m[1] === "" ? 0 : Number(m[1]);
  const pence = pounds * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(pence) || pence > max) return { ok: false, error: `That's over ${fmtMoney(max)}, check the amount` };
  return { ok: true, pence };
}

/** True for a whole number of pence from 0 up to `max` (used by the server). */
export function isValidPence(x: unknown, max = MAX_EARNING_PENCE): x is number {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= max;
}

export function penceToInput(pence: number | undefined): string {
  if (pence === undefined) return "";
  return (pence / 100).toFixed(2);
}
