import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { customPlatformExists, getDay, setEarning } from "@/lib/db";
import { isDateStr } from "@/lib/dates";
import { isBuiltin } from "@/lib/platforms";
import { isValidPence } from "@/lib/money";

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
  const platform = body?.platform;
  if (typeof platform !== "string" || !(isBuiltin(platform) || (await customPlatformExists(platform)))) {
    return NextResponse.json({ error: "bad platform" }, { status: 400 });
  }
  const amt = body?.amount_pence;
  // null clears the app for the day; otherwise whole pence, never negative
  if (amt !== null && !isValidPence(amt)) {
    return NextResponse.json({ error: "Amounts must be £0 or more (up to £100,000)" }, { status: 400 });
  }
  return NextResponse.json({ day: await setEarning(date, platform, amt as number | null) });
});
