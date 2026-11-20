import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { addCustomPlatform, listCustomPlatforms } from "@/lib/db";
import { checkPlatformInput } from "@/lib/platformInput";

export const dynamic = "force-dynamic";

/** Apps the driver has added (built-in ones aren't listed). */
export const GET = withAuth(async () => {
  return NextResponse.json({ platforms: await listCustomPlatforms() });
});

export const POST = withAuth(async (req: Request) => {
  const existing = await listCustomPlatforms();
  if (existing.length >= 30) return NextResponse.json({ error: "That's a lot of apps! Delete one first." }, { status: 400 });
  const input = checkPlatformInput(await req.json().catch(() => null), existing);
  if ("error" in input) return NextResponse.json(input, { status: 400 });
  const platform = await addCustomPlatform(input.name, input.color);
  return NextResponse.json({ platform, platforms: await listCustomPlatforms() });
});
