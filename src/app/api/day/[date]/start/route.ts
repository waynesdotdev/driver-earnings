import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { startDay } from "@/lib/db";
import { isDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req: Request, { params }: { params: Promise<{ date: string }> }) => {
  const { date } = await params;
  if (!isDateStr(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  return NextResponse.json({ day: await startDay(date) });
});
