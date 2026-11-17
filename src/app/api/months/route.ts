import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getMonths } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  return NextResponse.json({ months: await getMonths() });
});
