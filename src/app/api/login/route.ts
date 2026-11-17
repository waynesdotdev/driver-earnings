import { NextResponse } from "next/server";
import { AUTH_COOKIE, checkPin, expectedToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!(await checkPin(pin))) {
    // small delay to slow down guessing
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await expectedToken(), {
    httpOnly: true,
    secure: new URL(req.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // stay logged in for a year
  });
  return res;
}
