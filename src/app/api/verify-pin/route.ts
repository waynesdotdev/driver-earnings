import { NextResponse } from "next/server";
import { checkPin, withAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Re-checks the PIN (used to unlock a finished day). Must already be logged in. */
export const POST = withAuth(async (req: Request) => {
  const body = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!(await checkPin(pin))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
});
