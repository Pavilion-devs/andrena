import {
  getCompetitionAdminSnapshot,
  getCompetitionParticipantAdminDetail,
  refreshCompetitionState,
} from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await context.params;
  const snapshot = await refreshCompetitionState(wallet);
  const admin = await getCompetitionAdminSnapshot();
  const participant = await getCompetitionParticipantAdminDetail(wallet);

  return NextResponse.json({
    snapshot,
    admin,
    participant,
  });
}
