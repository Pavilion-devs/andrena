import { getCompetitionAdminSnapshot } from "@/lib/competition";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCompetitionAdminSnapshot();
  return NextResponse.json(snapshot);
}
