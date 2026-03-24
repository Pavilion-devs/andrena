import { publishCompetitionCardSet } from "@/lib/admin-ops";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      dayKey?: string;
      cardIds?: string[];
      fullSetBonus?: number;
      operatorNote?: string;
    };

    if (!body.dayKey || !Array.isArray(body.cardIds)) {
      return NextResponse.json(
        { error: "dayKey and cardIds are required." },
        { status: 400 }
      );
    }

    const result = await publishCompetitionCardSet({
      dayKey: body.dayKey,
      cardIds: body.cardIds,
      fullSetBonus: body.fullSetBonus,
      operatorNote: body.operatorNote,
    });

    return NextResponse.json(result);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error ? caughtError.message : "Failed to publish cards.",
      },
      { status: 400 }
    );
  }
}
