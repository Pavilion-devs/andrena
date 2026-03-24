import { syncCompetitionServiceState } from "@/lib/adrena-competition-service";
import { getCompetitionAdminSnapshot } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const isWorkerRequest = new URL(request.url).searchParams.get("worker") === "1";
  const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
  const serviceState = await syncCompetitionServiceState({
    force: Boolean(body?.force),
  });

  if (isWorkerRequest) {
    return NextResponse.json({
      competitionService: serviceState,
      serviceState,
    });
  }

  const admin = await getCompetitionAdminSnapshot({
    skipServiceSync: true,
  });

  return NextResponse.json({
    admin,
    competitionService: admin.competitionService,
    serviceState,
  });
}
