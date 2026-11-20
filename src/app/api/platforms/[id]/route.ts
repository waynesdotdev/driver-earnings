import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { deleteCustomPlatform, listCustomPlatforms, updateCustomPlatform } from "@/lib/db";
import { checkPlatformInput } from "@/lib/platformInput";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Rename / recolour an app the driver added. */
export const PATCH = withAuth(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const existing = await listCustomPlatforms();
  if (!existing.some((p) => p.id === id)) return NextResponse.json({ error: "App not found" }, { status: 404 });
  const input = checkPlatformInput(await req.json().catch(() => null), existing, id);
  if ("error" in input) return NextResponse.json(input, { status: 400 });
  await updateCustomPlatform(id, input.name, input.color);
  return NextResponse.json({ platforms: await listCustomPlatforms() });
});

/** Delete an app the driver added (only if no earnings are saved against it). */
export const DELETE = withAuth(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const r = await deleteCustomPlatform(id);
  if (!r.deleted) {
    const days = r.daysWithEarnings;
    return NextResponse.json(
      { error: `It has earnings saved on ${days} day${days === 1 ? "" : "s"}, so it can't be deleted. Turn it off to hide it.` },
      { status: 409 }
    );
  }
  return NextResponse.json({ platforms: await listCustomPlatforms() });
});
