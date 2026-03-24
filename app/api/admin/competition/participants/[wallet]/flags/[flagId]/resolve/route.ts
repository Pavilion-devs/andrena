import { resolveParticipantReviewFlag } from "@/lib/admin-ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ wallet: string; flagId: string }> }
) {
  try {
    const { wallet, flagId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { resolutionNote?: string };
    const result = await resolveParticipantReviewFlag(wallet, flagId, body.resolutionNote);

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "Failed to resolve review flag.",
      },
      { status: 400 }
    );
  }
}
