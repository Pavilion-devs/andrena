import { runCompetitionRuntimeTick } from "@/lib/runtime";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  const result = await runCompetitionRuntimeTick({
    force: Boolean(body.force),
    trigger: "manual",
  });

  return NextResponse.json(result);
}
