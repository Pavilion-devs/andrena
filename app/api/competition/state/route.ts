import { getCompetitionSnapshot } from "@/lib/competition";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getCompetitionSnapshot();
  return NextResponse.json(snapshot);
}
