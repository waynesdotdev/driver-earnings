import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getDay, setEarning } from "@/lib/db";
import { isDateStr } from "@/lib/dates";
import { isPlatform } from "@/lib/platforms";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export const GET = withAuth(async (_req: Request, { params }: Ctx) => {
  const { date } = await params;
  if (!isDateStr(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  return NextResponse.json({ day: await getDay(date) });
});

export const PUT = withAuth(async (req: Request, { params }: Ctx) => {
  const { date } = await params;
  if (!isDateStr(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { platform?: unknown; amount_pence?: unknown } | null;
  if (!body || !isPlatform(body.platform)) return NextResponse.json({ error: "bad platform" }, { status: 400 });
  const amt = body.amount_pence;
  if (amt !== null && (typeof amt !== "number" || !Number.isInteger(amt) || amt < 0 || amt > 10_000_000)) {
    return NextResponse.json({ error: "bad amount" }, { status: 400 });
  }
  return NextResponse.json({ day: await setEarning(date, body.platform, amt as number | null) });
});
