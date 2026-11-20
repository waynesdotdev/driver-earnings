import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { setNote } from "@/lib/db";
import { isDateStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Save (or clear, with "") the note for a day. */
export const PUT = withAuth(async (req: Request, { params }: { params: Promise<{ date: string }> }) => {
  const { date } = await params;
  if (!isDateStr(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { note?: unknown } | null;
  if (typeof body?.note !== "string" || body.note.length > 1000) {
    return NextResponse.json({ error: "Note must be under 1000 characters" }, { status: 400 });
  }
  return NextResponse.json({ day: await setNote(date, body.note) });
});
