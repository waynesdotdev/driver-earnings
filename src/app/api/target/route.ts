import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getTarget, setTarget } from "@/lib/db";
import { isDateStr, mondayOf } from "@/lib/dates";
import { MAX_TARGET_PENCE, isValidPence } from "@/lib/money";

export const dynamic = "force-dynamic";

const isMonday = (s: unknown): s is string => isDateStr(s) && mondayOf(s) === s;

export const GET = withAuth(async (req: Request) => {
  const monday = new URL(req.url).searchParams.get("monday");
  if (!isMonday(monday)) return NextResponse.json({ error: "bad monday" }, { status: 400 });
  return NextResponse.json(await getTarget(monday));
});

export const PUT = withAuth(async (req: Request) => {
  const body = (await req.json().catch(() => null)) as { monday?: unknown; target_pence?: unknown } | null;
  if (!body || !isMonday(body.monday)) return NextResponse.json({ error: "bad monday" }, { status: 400 });
  const t = body.target_pence;
  if (!isValidPence(t, MAX_TARGET_PENCE) || t === 0) {
    return NextResponse.json({ error: "Your target needs to be more than £0 (up to £1,000,000)" }, { status: 400 });
  }
  await setTarget(body.monday, t);
  return NextResponse.json(await getTarget(body.monday));
});
