import { getCompetitionParticipantDetail } from "@/lib/competition";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await context.params;
  const participant = await getCompetitionParticipantDetail(wallet);

  if (!participant) {
    return NextResponse.json(
      {
        error: "Participant not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json(participant);
}
