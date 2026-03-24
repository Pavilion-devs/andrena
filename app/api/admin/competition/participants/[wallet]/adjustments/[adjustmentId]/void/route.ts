import { voidParticipantManualAdjustment } from "@/lib/admin-ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ wallet: string; adjustmentId: string }> }
) {
  try {
    const { wallet, adjustmentId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { voidReason?: string };
    const result = await voidParticipantManualAdjustment(
      wallet,
      adjustmentId,
      body.voidReason
    );

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to void manual adjustment.",
      },
      { status: 400 }
    );
  }
}
