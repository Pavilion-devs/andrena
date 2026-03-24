import { createParticipantReviewFlag } from "@/lib/admin-ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await context.params;
    const body = (await request.json()) as {
      category?: "abuse" | "dispute" | "scoring" | "data_quality";
      severity?: "low" | "medium" | "high";
      title?: string;
      description?: string;
    };

    if (!body.category || !body.severity || !body.title || !body.description) {
      return NextResponse.json(
        { error: "category, severity, title, and description are required." },
        { status: 400 }
      );
    }

    const result = await createParticipantReviewFlag(wallet, {
      category: body.category,
      severity: body.severity,
      title: body.title,
      description: body.description,
    });

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "Failed to create review flag.",
      },
      { status: 400 }
    );
  }
}
