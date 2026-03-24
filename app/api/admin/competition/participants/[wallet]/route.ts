import { getCompetitionParticipantAdminDetail } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await context.params;
  const detail = await getCompetitionParticipantAdminDetail(wallet);

  if (!detail) {
    return NextResponse.json(
      {
        error: "Participant not found.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(detail);
}
