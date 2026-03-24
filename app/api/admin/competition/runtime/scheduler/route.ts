import { setCompetitionSchedulerEnabled } from "@/lib/runtime";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;

  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  const result = await setCompetitionSchedulerEnabled(body.enabled);
  return NextResponse.json(result);
}
