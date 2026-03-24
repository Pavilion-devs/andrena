import type {
  CompetitionAdminSnapshot,
  CompetitionServiceCloseEventRecord,
  CompetitionParticipantDetail,
  CompetitionParticipantAdminDetail,
  CompetitionSnapshot,
  CompetitionRuntimeSnapshot,
  LedgerMetric,
  ReviewCategory,
  ReviewSeverity,
  RuntimeJobRunRecord,
} from "@/lib/types";

export interface CompetitionAdminRecomputeResponse {
  snapshot: CompetitionSnapshot;
  admin: CompetitionAdminSnapshot;
}

export interface CompetitionParticipantRefreshResponse {
  snapshot: CompetitionSnapshot;
  admin: CompetitionAdminSnapshot;
  participant: CompetitionParticipantAdminDetail | null;
}

export interface CompetitionRuntimeTickResponse {
  snapshot?: CompetitionSnapshot | null;
  admin: CompetitionAdminSnapshot;
  runtime: CompetitionRuntimeSnapshot;
  run: RuntimeJobRunRecord;
}

export interface CompetitionSchedulerResponse {
  admin: CompetitionAdminSnapshot;
  runtime: CompetitionRuntimeSnapshot;
}

export interface CompetitionCardPublishResponse {
  admin: CompetitionAdminSnapshot;
  snapshot: CompetitionSnapshot | null;
}

export interface CompetitionServiceSyncResponse {
  admin: CompetitionAdminSnapshot;
  competitionService: CompetitionAdminSnapshot["competitionService"];
}

export interface CompetitionServiceCloseEventIngestResponse {
  result: {
    stored: boolean;
    ignored: boolean;
    reason?: string;
    event?: CompetitionServiceCloseEventRecord;
  };
  snapshot: CompetitionSnapshot | null;
  admin: CompetitionAdminSnapshot;
  participant: CompetitionParticipantAdminDetail | null;
}

export interface CompetitionParticipantAdminMutationResponse {
  admin: CompetitionAdminSnapshot;
  participant: CompetitionParticipantAdminDetail | null;
  snapshot?: CompetitionSnapshot;
}

export interface CompetitionCardPublishInput {
  dayKey: string;
  cardIds: string[];
  fullSetBonus?: number;
  operatorNote?: string;
}

export interface CompetitionParticipantFlagInput {
  category: ReviewCategory;
  severity: ReviewSeverity;
  title: string;
  description: string;
}

export interface CompetitionParticipantAdjustmentInput {
  metric: LedgerMetric;
  amount: number;
  reason: string;
  note?: string;
  dayKey?: string;
}

export async function fetchCompetitionSnapshot() {
  const response = await fetch("/api/competition/state", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load competition state.");
  }

  return (await response.json()) as CompetitionSnapshot;
}

export async function refreshCompetitionSnapshot(wallet?: string) {
  const response = await fetch("/api/competition/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(wallet ? { wallet } : {})
  });

  if (!response.ok) {
    throw new Error("Failed to refresh live wallets.");
  }

  return (await response.json()) as CompetitionSnapshot;
}

export async function fetchCompetitionParticipantDetail(wallet: string) {
  const response = await fetch(`/api/competition/participants/${encodeURIComponent(wallet)}`, {
    cache: "no-store"
  });

  const payload = (await response.json()) as CompetitionParticipantDetail & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load participant detail.");
  }

  return payload;
}

export async function registerCompetitionWallet(wallet: string, label: string) {
  const response = await fetch("/api/competition/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      wallet,
      label
    })
  });

  const payload = (await response.json()) as CompetitionSnapshot & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to register wallet.");
  }

  return payload;
}

export async function fetchCompetitionAdminSnapshot() {
  const response = await fetch("/api/admin/competition/state", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load admin state.");
  }

  return (await response.json()) as CompetitionAdminSnapshot;
}

export async function recomputeCompetitionAdminSnapshot() {
  const response = await fetch("/api/admin/competition/recompute", {
    method: "POST"
  });

  const payload = (await response.json()) as CompetitionAdminRecomputeResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to recompute competition state.");
  }

  return payload;
}

export async function fetchCompetitionParticipantAdminDetail(wallet: string) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}`,
    {
      cache: "no-store"
    }
  );

  const payload = (await response.json()) as CompetitionParticipantAdminDetail & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to load participant detail.");
  }

  return payload;
}

export async function refreshCompetitionParticipant(wallet: string) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}/refresh`,
    {
      method: "POST"
    }
  );

  const payload = (await response.json()) as CompetitionParticipantRefreshResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to refresh participant.");
  }

  return payload;
}

export async function runCompetitionSchedulerTick(force = false) {
  const response = await fetch("/api/admin/competition/runtime/tick", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ force })
  });

  const payload = (await response.json()) as CompetitionRuntimeTickResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to run scheduler tick.");
  }

  return payload;
}

export async function setCompetitionScheduler(enabled: boolean) {
  const response = await fetch("/api/admin/competition/runtime/scheduler", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ enabled })
  });

  const payload = (await response.json()) as CompetitionSchedulerResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to update scheduler state.");
  }

  return payload;
}

export async function publishCompetitionCards(input: CompetitionCardPublishInput) {
  const response = await fetch("/api/admin/competition/cards/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = (await response.json()) as CompetitionCardPublishResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to publish daily battlecards.");
  }

  return payload;
}

export async function syncCompetitionService(force = false) {
  const response = await fetch("/api/admin/competition/service/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ force })
  });

  const payload = (await response.json()) as CompetitionServiceSyncResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to sync competition service state.");
  }

  return payload;
}

export async function ingestCompetitionServiceCloseEvent(
  payload: Record<string, unknown>
) {
  const response = await fetch("/api/admin/competition/service/close-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json()) as CompetitionServiceCloseEventIngestResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "Failed to ingest close-position event.");
  }

  return result;
}

export async function createCompetitionParticipantFlag(
  wallet: string,
  input: CompetitionParticipantFlagInput
) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}/flags`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );

  const payload = (await response.json()) as CompetitionParticipantAdminMutationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create review flag.");
  }

  return payload;
}

export async function resolveCompetitionParticipantFlag(
  wallet: string,
  flagId: string,
  resolutionNote?: string
) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}/flags/${encodeURIComponent(flagId)}/resolve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ resolutionNote })
    }
  );

  const payload = (await response.json()) as CompetitionParticipantAdminMutationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to resolve review flag.");
  }

  return payload;
}

export async function createCompetitionParticipantAdjustment(
  wallet: string,
  input: CompetitionParticipantAdjustmentInput
) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}/adjustments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );

  const payload = (await response.json()) as CompetitionParticipantAdminMutationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create manual adjustment.");
  }

  return payload;
}

export async function voidCompetitionParticipantAdjustment(
  wallet: string,
  adjustmentId: string,
  voidReason?: string
) {
  const response = await fetch(
    `/api/admin/competition/participants/${encodeURIComponent(wallet)}/adjustments/${encodeURIComponent(adjustmentId)}/void`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ voidReason })
    }
  );

  const payload = (await response.json()) as CompetitionParticipantAdminMutationResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to void manual adjustment.");
  }

  return payload;
}
