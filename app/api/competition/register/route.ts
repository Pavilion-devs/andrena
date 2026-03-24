import { registerParticipant } from "@/lib/competition";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(request: Request) {
  const body = (await request.json()) as { wallet?: string; label?: string };
  const wallet = body.wallet?.trim();

  if (!wallet || !walletPattern.test(wallet)) {
    return NextResponse.json(
      {
        error: "Provide a valid Solana wallet address."
      },
      { status: 400 }
    );
  }

  const snapshot = await registerParticipant(wallet, body.label);
  return NextResponse.json(snapshot);
}
