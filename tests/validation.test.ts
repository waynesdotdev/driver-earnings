// Checks the rules for money and dates. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkMoney, isValidPence, MAX_TARGET_PENCE } from "../src/lib/money.ts";
import { isDateStr } from "../src/lib/dates.ts";

const ok = (input: string, pence: number, max?: number) =>
  assert.deepEqual(checkMoney(input, max), { ok: true, pence }, `"${input}" should be ${pence}p`);
const bad = (input: string, error: RegExp, max?: number) => {
  const r = checkMoney(input, max);
  assert.equal(r.ok, false, `"${input}" should be rejected`);
  if (!r.ok) assert.match(r.error, error, `"${input}" gave "${r.error}"`);
};

test("normal amounts are read correctly", () => {
  ok("110.22", 11022);
  ok("£110.22", 11022);
  ok("110", 11000);
  ok("110.5", 11050);
  ok("12.", 1200);
  ok(".50", 50);
  ok("0", 0);
  ok("0.29", 29); // no floating-point rounding errors
  ok("  7.50 ", 750);
  ok("£ 7.50", 750);
  ok("1,234.50", 123450);
  ok("12,345", 1234500);
});

test("minus amounts are never accepted", () => {
  for (const s of ["-5", "-0.01", "£-3", "−5", "–5", "5-", "-£12.50"]) bad(s, /can't be negative/);
});

test("non-numbers are rejected", () => {
  for (const s of ["abc", "12abc", "1e5", "£", ".", "12.3.4", "0x10", "NaN", "Infinity", "½"]) bad(s, /Numbers only|full stop/);
  bad("", /Enter an amount/);
  bad("   ", /Enter an amount/);
});

test("a comma used as the decimal point is caught, not read as thousands", () => {
  bad("12,50", /full stop/); // would otherwise be £1,250
  bad("1,5", /full stop/);
  bad("1,23,456", /full stop/);
});

test("more than 2 decimal places are rejected", () => {
  bad("12.345", /2 digits/);
  bad("0.001", /2 digits/);
});

test("silly-large amounts are rejected", () => {
  ok("100000", 10_000_000); // £100,000 is the limit per app per day
  bad("100000.01", /over £100,000/);
  bad("99999999", /over/);
  bad("9".repeat(30), /over/);
  ok("1000000", MAX_TARGET_PENCE, MAX_TARGET_PENCE); // targets can go to £1,000,000
});

test("the server only accepts whole, non-negative pence", () => {
  for (const x of [0, 1, 11022, 10_000_000]) assert.ok(isValidPence(x), String(x));
  for (const x of [-1, -0.5, 1.5, 10_000_001, NaN, Infinity, "100", null, undefined, true, {}])
    assert.ok(!isValidPence(x), String(x));
});

test("only real calendar dates are accepted", () => {
  for (const d of ["2026-11-20", "2024-02-29", "2026-12-31", "2000-01-01"]) assert.ok(isDateStr(d), d);
  for (const d of ["2026-13-01", "2026-02-30", "2026-11-31", "2025-02-29", "2026-00-10", "2026-1-5", "20261120", "1999-12-31", "abc", null])
    assert.ok(!isDateStr(d), String(d));
});
