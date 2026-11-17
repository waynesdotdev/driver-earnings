import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getRange } from "@/lib/db";
import { isDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: Request) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isDateStr(from) || !isDateStr(to)) return NextResponse.json({ error: "bad range" }, { status: 400 });
  return NextResponse.json({ days: await getRange(from, to) });
});
