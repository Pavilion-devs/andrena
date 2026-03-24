import { buildSimulatedTradeQuote, buildTradeQuote } from "@/lib/adrena";
import type { QuoteKind, QuoteRequestMode } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedKinds = new Set<QuoteKind>([
  "open-long",
  "open-short",
  "open-limit-long",
  "open-limit-short"
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  const { kind } = await context.params;

  if (!allowedKinds.has(kind as QuoteKind)) {
    return NextResponse.json(
      {
        error: "Unsupported quote type."
      },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const mode: QuoteRequestMode = body.mode === "simulated" ? "simulated" : "live";
    const payload =
      mode === "simulated"
        ? await buildSimulatedTradeQuote(kind as QuoteKind, body)
        : await buildTradeQuote(kind as QuoteKind, body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to build quote."
      },
      { status: 400 }
    );
  }
}
