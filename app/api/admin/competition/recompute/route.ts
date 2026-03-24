import { getCompetitionAdminSnapshot, recomputeCompetitionState } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const snapshot = await recomputeCompetitionState();
  const admin = await getCompetitionAdminSnapshot();

  return NextResponse.json({
    snapshot,
    admin,
  });
}
