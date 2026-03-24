import { reportCompetitionServiceStreamStatus } from "@/lib/adrena-competition-service";
import { getCompetitionAdminSnapshot } from "@/lib/competition";
import type { CompetitionServiceStreamConnectionStatus } from "@/lib/types";
import { NextResponse } from "next/server";

const allowedStatuses = new Set<CompetitionServiceStreamConnectionStatus>([
  "idle",
  "connecting",
  "connected",
  "disconnected",
  "error",
]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const isWorkerRequest = new URL(request.url).searchParams.get("worker") === "1";
  const body = (await request.json().catch(() => null)) as
    | {
        status?: CompetitionServiceStreamConnectionStatus;
        reconnectAttempts?: number;
        errorMessage?: string | null;
        lastSignature?: string | null;
        timestamp?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json(
      {
        error: "A JSON stream-status payload is required.",
      },
      { status: 400 }
    );
  }

  if (body.status && !allowedStatuses.has(body.status)) {
    return NextResponse.json(
      {
        error: "status must be one of idle, connecting, connected, disconnected, or error.",
      },
      { status: 400 }
    );
  }

  const stream = await reportCompetitionServiceStreamStatus(body);

  if (isWorkerRequest) {
    return NextResponse.json({
      stream,
    });
  }

  const admin = await getCompetitionAdminSnapshot({
    skipServiceSync: true,
  });

  return NextResponse.json({
    stream,
    admin,
  });
}
