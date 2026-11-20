import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getTarget, setTarget } from "@/lib/db";
import { isDateStr, mondayOf } from "@/lib/dates";

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
  if (typeof t !== "number" || !Number.isInteger(t) || t < 0 || t > 100_000_000) {
    return NextResponse.json({ error: "bad target" }, { status: 400 });
  }
  await setTarget(body.monday, t);
  return NextResponse.json(await getTarget(body.monday));
});
