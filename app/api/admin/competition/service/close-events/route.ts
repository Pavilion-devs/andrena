import { ingestCompetitionServiceCloseEvent } from "@/lib/adrena-competition-service";
import {
  getCompetitionAdminSnapshot,
  getCompetitionParticipantAdminDetail,
  recomputeCompetitionState,
} from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json(
      {
        error: "A JSON close-position payload is required.",
      },
      { status: 400 }
    );
  }

  const result = await ingestCompetitionServiceCloseEvent(body);
  const event = result.event ?? null;
  const snapshot = result.stored ? await recomputeCompetitionState() : null;
  const participant = event?.wallet
    ? await getCompetitionParticipantAdminDetail(event.wallet)
    : null;
  const admin = await getCompetitionAdminSnapshot();

  return NextResponse.json({
    result,
    snapshot,
    admin,
    participant,
  });
}
