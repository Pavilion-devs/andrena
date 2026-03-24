import { createParticipantManualAdjustment } from "@/lib/admin-ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await context.params;
    const body = (await request.json()) as {
      metric?: "score" | "ticket";
      amount?: number;
      reason?: string;
      note?: string;
      dayKey?: string;
    };

    if (!body.metric || typeof body.amount !== "number" || !body.reason) {
      return NextResponse.json(
        { error: "metric, amount, and reason are required." },
        { status: 400 }
      );
    }

    const result = await createParticipantManualAdjustment(wallet, {
      metric: body.metric,
      amount: body.amount,
      reason: body.reason,
      note: body.note,
      dayKey: body.dayKey,
    });

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to create manual adjustment.",
      },
      { status: 400 }
    );
  }
}
