import { getReferenceNow } from "@/lib/config";
import {
  getActiveCompetition,
  getCompetitionServiceState,
  readDatabase,
  updateDatabase,
} from "@/lib/storage";
import type {
  CompetitionServiceCloseEventRecord,
  CompetitionServicePositionSchemaSnapshot,
  CompetitionServiceSizeMultiplierCache,
  CompetitionServiceSizeMultiplierTier,
  CompetitionServiceStreamConnectionStatus,
} from "@/lib/types";

const fallbackMultiplierTiers: CompetitionServiceSizeMultiplierTier[] = [
  { minSize: 10, maxSize: 1000, multiplierMin: 0.00025, multiplierMax: 0.05 },
  { minSize: 1000, maxSize: 5000, multiplierMin: 0.05, multiplierMax: 1 },
  { minSize: 5000, maxSize: 50000, multiplierMin: 1, multiplierMax: 5 },
  { minSize: 50000, maxSize: 100000, multiplierMin: 5, multiplierMax: 9 },
  { minSize: 100000, maxSize: 250000, multiplierMin: 9, multiplierMax: 17.5 },
  { minSize: 250000, maxSize: 500000, multiplierMin: 17.5, multiplierMax: 25 },
  { minSize: 500000, maxSize: 1000000, multiplierMin: 25, multiplierMax: 30 },
  { minSize: 1000000, maxSize: 4500000, multiplierMin: 30, multiplierMax: 45 },
];

function getSystemTimestamp() {
  return new Date().toISOString();
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replaceAll(/[$,%\s,]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toOptionalNumber(value: unknown) {
  const parsed = toNumber(value);
  return parsed === 0 && value !== 0 && value !== "0" ? null : parsed;
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getBaseUrl() {
  const value = process.env.ADRENA_COMPETITION_SERVICE_BASE_URL?.trim();

  if (!value) {
    throw new Error("ADRENA_COMPETITION_SERVICE_BASE_URL is not configured.");
  }

  return value.replace(/\/+$/, "");
}

function getApiKey() {
  const value = process.env.ADRENA_COMPETITION_SERVICE_API_KEY?.trim();

  if (!value) {
    throw new Error("ADRENA_COMPETITION_SERVICE_API_KEY is not configured.");
  }

  return value;
}

function buildServiceUrl(pathname: string, searchParams?: Record<string, string>) {
  const url = new URL(`${getBaseUrl()}/${getApiKey()}${pathname}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

function applyStreamStateUpdate(
  streamState: ReturnType<typeof getCompetitionServiceState>["stream"],
  {
    status,
    enabled,
    reconnectAttempts,
    errorMessage,
    timestamp,
    lastSignature,
  }: {
    status?: CompetitionServiceStreamConnectionStatus;
    enabled?: boolean;
    reconnectAttempts?: number;
    errorMessage?: string | null;
    timestamp?: string;
    lastSignature?: string | null;
  }
) {
  const now = timestamp ?? getSystemTimestamp();

  if (typeof enabled === "boolean") {
    streamState.enabled = enabled;
  }

  if (status) {
    streamState.connectionStatus = status;

    if (status === "connected") {
      streamState.enabled = true;
      streamState.lastConnectedAt = now;
      streamState.lastErrorAt = null;
      streamState.lastErrorMessage = null;
    }

    if (status === "disconnected") {
      streamState.enabled = true;
      streamState.lastDisconnectedAt = now;
    }

    if (status === "error") {
      streamState.enabled = true;
      streamState.lastErrorAt = now;
      streamState.lastErrorMessage = errorMessage ?? streamState.lastErrorMessage;
    }

    if (status === "idle") {
      streamState.enabled = false;
    }
  }

  if (typeof reconnectAttempts === "number") {
    streamState.reconnectAttempts = reconnectAttempts;
  }

  if (errorMessage === null) {
    streamState.lastErrorAt = null;
    streamState.lastErrorMessage = null;
  } else if (typeof errorMessage === "string" && errorMessage.trim()) {
    streamState.lastErrorAt = now;
    streamState.lastErrorMessage = errorMessage.trim();
  }

  if (lastSignature) {
    streamState.lastSignature = lastSignature;
  }
}

async function readJson(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Competition service returned non-JSON content: ${text.slice(0, 120)}`);
  }
}

export function getFallbackSizeMultiplierCache(): CompetitionServiceSizeMultiplierCache {
  return {
    syncedAt: null,
    source: "fallback",
    interpolation: "linear",
    formula:
      "multiplierMin + ((sizeUsd - minSize) * (multiplierMax - multiplierMin)) / (maxSize - minSize)",
    notes: [
      "sizeUsd is the close size in USD",
      "Multiplier increases linearly within each tier",
      "Below $10 or above $4.5M returns 0",
      "This table is computed off-chain — the on-chain program does not use it",
    ],
    tiers: fallbackMultiplierTiers,
  };
}

export function getSizeMultiplierDetails(
  sizeUsd: number,
  cache?: CompetitionServiceSizeMultiplierCache | null
) {
  const multiplierCache =
    cache && cache.tiers.length > 0 ? cache : getFallbackSizeMultiplierCache();
  const tier =
    multiplierCache.tiers.find((entry) => sizeUsd >= entry.minSize && sizeUsd <= entry.maxSize) ??
    null;

  if (!tier) {
    return {
      multiplier: 0,
      tier: null,
      cache: multiplierCache,
    };
  }

  const range = tier.maxSize - tier.minSize;
  const ratio = range <= 0 ? 0 : (sizeUsd - tier.minSize) / range;
  const multiplier =
    tier.multiplierMin + ratio * (tier.multiplierMax - tier.multiplierMin);

  return {
    multiplier,
    tier,
    cache: multiplierCache,
  };
}

export async function fetchCompetitionServiceHealth() {
  const startedAt = Date.now();
  const response = await fetch(buildServiceUrl("/health"), {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Competition service health check failed with ${response.status}.`);
  }

  return {
    status: "healthy" as const,
    checkedAt: getSystemTimestamp(),
    responseTimeMs: Date.now() - startedAt,
    serviceTimestamp:
      typeof payload?.timestamp === "number" ? payload.timestamp : null,
    payload,
  };
}

export async function fetchCompetitionServiceSizeMultiplierTable() {
  const response = await fetch(buildServiceUrl("/size-multiplier"), {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Size multiplier lookup failed with ${response.status}.`);
  }

  const tiers = Array.isArray(payload?.tiers)
    ? payload.tiers
        .map((entry: unknown) => {
          const record = asObject(entry);

          if (!record) {
            return null;
          }

          return {
            minSize: toNumber(record.minSize),
            maxSize: toNumber(record.maxSize),
            multiplierMin: toNumber(record.multiplierMin),
            multiplierMax: toNumber(record.multiplierMax),
          };
        })
        .filter(
          (
            entry: CompetitionServiceSizeMultiplierTier | null
          ): entry is CompetitionServiceSizeMultiplierTier => Boolean(entry)
        )
    : [];

  return {
    syncedAt: getSystemTimestamp(),
    source: "live" as const,
    interpolation:
      typeof payload?.interpolation === "string" ? payload.interpolation : "linear",
    formula:
      typeof payload?.formula === "string"
        ? payload.formula
        : getFallbackSizeMultiplierCache().formula,
    notes: Array.isArray(payload?.notes)
      ? payload.notes.map((entry: unknown) => String(entry))
      : getFallbackSizeMultiplierCache().notes,
    tiers: tiers.length > 0 ? tiers : fallbackMultiplierTiers,
  };
}

export async function fetchCompetitionServicePositionSchema() {
  const response = await fetch(buildServiceUrl("/position-schema"), {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`Position schema lookup failed with ${response.status}.`);
  }

  const accountSizeBytes =
    typeof payload?.accountSize === "string"
      ? toOptionalNumber(payload.accountSize.match(/\d+\s*bytes/i)?.[0] ?? payload.accountSize)
      : null;
  const pdaSeeds = Array.isArray(payload?.pdaDerivation?.seeds)
    ? payload.pdaDerivation.seeds.map((seed: unknown) => {
        const record = asObject(seed);
        return record?.value ? String(record.value) : String(seed);
      })
    : [];

  const closeInstructions = Array.isArray(payload?.closeInstructions)
    ? payload.closeInstructions.map((entry: unknown) => String(entry))
    : ["closePositionLong", "closePositionShort"];

  return {
    syncedAt: getSystemTimestamp(),
    programId: typeof payload?.programId === "string" ? payload.programId : null,
    accountSizeBytes,
    closeInstructions,
    pdaSeeds,
    fieldCount: Array.isArray(payload?.positionFields) ? payload.positionFields.length : 0,
  } satisfies CompetitionServicePositionSchemaSnapshot;
}

export async function syncCompetitionServiceState({
  force = false,
  staleMinutes = 15,
}: {
  force?: boolean;
  staleMinutes?: number;
} = {}) {
  const database = await readDatabase();
  const competition = getActiveCompetition(database);
  const currentState = getCompetitionServiceState(database, competition.id);
  const lastCheckedAt = currentState.health.checkedAt;

  if (
    !force &&
    lastCheckedAt &&
    new Date(lastCheckedAt).getTime() + staleMinutes * 60_000 >
      Date.now() &&
    currentState.sizeMultiplier.tiers.length > 0 &&
    currentState.positionSchema.fieldCount > 0
  ) {
    return currentState;
  }

  const [healthResult, multiplierResult, schemaResult] = await Promise.allSettled([
    fetchCompetitionServiceHealth(),
    fetchCompetitionServiceSizeMultiplierTable(),
    fetchCompetitionServicePositionSchema(),
  ]);

  return updateDatabase((mutableDatabase) => {
    const mutableCompetition = getActiveCompetition(mutableDatabase);
    const serviceState = getCompetitionServiceState(
      mutableDatabase,
      mutableCompetition.id
    );
    const now = getSystemTimestamp();

    if (healthResult.status === "fulfilled") {
      serviceState.health = {
        checkedAt: healthResult.value.checkedAt,
        status: healthResult.value.status,
        responseTimeMs: healthResult.value.responseTimeMs,
        serviceTimestamp: healthResult.value.serviceTimestamp,
        errorMessage: null,
      };
    } else {
      serviceState.health = {
        checkedAt: now,
        status: "unreachable",
        responseTimeMs: null,
        serviceTimestamp: null,
        errorMessage:
          healthResult.reason instanceof Error
            ? healthResult.reason.message
            : "Health check failed.",
      };
    }

    if (multiplierResult.status === "fulfilled") {
      serviceState.sizeMultiplier = multiplierResult.value;
    } else if (serviceState.sizeMultiplier.tiers.length === 0) {
      serviceState.sizeMultiplier = getFallbackSizeMultiplierCache();
    }

    if (schemaResult.status === "fulfilled") {
      serviceState.positionSchema = schemaResult.value;
    }

    if (
      healthResult.status === "rejected" ||
      multiplierResult.status === "rejected" ||
      schemaResult.status === "rejected"
    ) {
      serviceState.stream.lastErrorAt = now;
      serviceState.stream.lastErrorMessage = [
        healthResult.status === "rejected"
          ? healthResult.reason instanceof Error
            ? healthResult.reason.message
            : "health failed"
          : null,
        multiplierResult.status === "rejected"
          ? multiplierResult.reason instanceof Error
            ? multiplierResult.reason.message
            : "multiplier failed"
          : null,
        schemaResult.status === "rejected"
          ? schemaResult.reason instanceof Error
            ? schemaResult.reason.message
            : "schema failed"
          : null,
      ]
        .filter(Boolean)
        .join(" | ");
    }

    return serviceState;
  });
}

export async function reportCompetitionServiceStreamStatus({
  status,
  reconnectAttempts,
  errorMessage,
  lastSignature,
  timestamp,
}: {
  status?: CompetitionServiceStreamConnectionStatus;
  reconnectAttempts?: number;
  errorMessage?: string | null;
  lastSignature?: string | null;
  timestamp?: string;
}) {
  return updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const serviceState = getCompetitionServiceState(database, competition.id);

    applyStreamStateUpdate(serviceState.stream, {
      status,
      reconnectAttempts,
      errorMessage,
      lastSignature,
      timestamp,
    });

    return serviceState.stream;
  });
}

export async function getCompetitionServiceStateSnapshot() {
  const database = await readDatabase();
  const competition = getActiveCompetition(database);
  return getCompetitionServiceState(database, competition.id);
}

function parseSide(value: unknown) {
  return String(value ?? "").toLowerCase() === "short" ? "short" : "long";
}

function parsePercentage(value: unknown) {
  return toNumber(value);
}

function buildCloseEventId(signature: string, positionId: number, percentageClosedPct: number) {
  return `close-event:${signature}:${positionId}:${percentageClosedPct}`;
}

export async function ingestCompetitionServiceCloseEvent(payload: Record<string, unknown>) {
  const type = String(payload.type ?? "");

  if (type !== "close_position") {
    throw new Error("Only close_position events are supported by this ingestor.");
  }

  const decoded = asObject(payload.decoded);
  const raw = asObject(payload.raw);

  if (!decoded || !raw) {
    throw new Error("Close-position event payload is missing raw or decoded data.");
  }

  const owner = String(decoded.owner ?? "").trim();
  const positionId = toNumber(decoded.positionId);
  const signature = String(raw.signature ?? "").trim();

  if (!owner || !positionId || !signature) {
    throw new Error("Close-position event is missing owner, positionId, or signature.");
  }

  return updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const participant = database.participants.find(
      (entry) => entry.competitionId === competition.id && entry.wallet === owner
    );
    const serviceState = getCompetitionServiceState(database, competition.id);
    const timestamp = new Date(
      typeof payload.timestamp === "number" ? payload.timestamp : Date.now()
    ).toISOString();

    applyStreamStateUpdate(serviceState.stream, {
      status: "connected",
      timestamp,
      lastSignature: signature,
      errorMessage: null,
    });
    serviceState.stream.lastEventAt = timestamp;
    serviceState.stream.lastCloseEventAt = timestamp;

    if (!participant) {
      return {
        stored: false,
        ignored: true,
        reason: "Wallet is not registered in the active competition.",
      };
    }

    const percentageClosedPct = parsePercentage(decoded.percentageClosed);
    const eventId = buildCloseEventId(signature, positionId, percentageClosedPct);
    const existing = database.closeEvents.find((entry) => entry.id === eventId);

    if (existing) {
      return {
        stored: false,
        ignored: true,
        reason: "Close event already ingested.",
        event: existing,
      };
    }

    const event: CompetitionServiceCloseEventRecord = {
      id: eventId,
      competitionId: competition.id,
      participantId: participant.id,
      wallet: participant.wallet,
      positionPda: String(decoded.position ?? "").trim(),
      positionId,
      signature,
      slot: String(raw.slot ?? ""),
      custodyMint: String(decoded.custodyMint ?? "").trim(),
      side: parseSide(decoded.side),
      sizeUsd: toNumber(decoded.sizeUsd),
      priceUsd: toNumber(decoded.price),
      collateralAmountUsd: toNumber(decoded.collateralAmountUsd),
      profitUsd: toNumber(decoded.profitUsd),
      lossUsd: toNumber(decoded.lossUsd),
      netPnlUsd: toNumber(decoded.netPnl),
      borrowFeeUsd: toNumber(decoded.borrowFeeUsd),
      exitFeeUsd: toNumber(decoded.exitFeeUsd),
      percentageClosedPct,
      timestamp,
      raw,
      decoded,
    };

    database.closeEvents.push(event);

    if (database.closeEvents.length > 500) {
      database.closeEvents = database.closeEvents
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, 500);
    }

    return {
      stored: true,
      ignored: false,
      event,
    };
  });
}

export function getCompetitionServiceMultiplierCacheForScoring(cache?: CompetitionServiceSizeMultiplierCache | null) {
  if (cache && cache.tiers.length > 0) {
    return cache;
  }

  return getFallbackSizeMultiplierCache();
}

export async function getCompetitionServiceScoringCache() {
  const database = await readDatabase();
  const competition = getActiveCompetition(database);
  const serviceState = getCompetitionServiceState(database, competition.id);

  return getCompetitionServiceMultiplierCacheForScoring(serviceState.sizeMultiplier);
}

export function getCompetitionServiceReferenceNow() {
  return getReferenceNow().toISOString();
}
