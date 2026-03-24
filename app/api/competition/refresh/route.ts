import { refreshCompetitionState } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let wallet: string | undefined;

  try {
    const body = (await request.json()) as { wallet?: string };
    wallet = body.wallet?.trim();
  } catch {
    wallet = undefined;
  }

  const snapshot = await refreshCompetitionState(wallet);
  return NextResponse.json(snapshot);
}
