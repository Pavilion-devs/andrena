import { syncCompetitionServiceState } from "@/lib/adrena-competition-service";
import { getCompetitionAdminSnapshot } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
  const serviceState = await syncCompetitionServiceState({
    force: Boolean(body?.force),
  });
  const admin = await getCompetitionAdminSnapshot();

  return NextResponse.json({
    admin,
    competitionService: admin.competitionService,
    serviceState,
  });
}
