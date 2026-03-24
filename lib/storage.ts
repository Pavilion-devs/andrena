import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  competitionConfig,
  competitionRuntimeConfig,
  getCardsForDay,
  getDayRange,
  getReferenceNow,
} from "@/lib/config";
import type {
  AdrenaPosition,
  CompetitionServiceStateRecord,
  CompetitionRecord,
  CompetitionRuntimeState,
  PilotDatabase,
  ParticipantRecord,
  PositionRecord,
  PublishedDailyCardSet,
} from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const databaseFilePath = path.join(dataDirectory, "pilot-db.json");
const currentDatabaseVersion = 6;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const supabaseRestBaseUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`
  : "";

function getSystemTimestamp() {
  return new Date().toISOString();
}

function createCompetitionRecord(lastRefreshedAt: string | null): CompetitionRecord {
  const now = getReferenceNow().toISOString();

  return {
    id: competitionConfig.id,
    name: competitionConfig.name,
    tagline: competitionConfig.tagline,
    description: competitionConfig.description,
    startAt: competitionConfig.startAt,
    endAt: competitionConfig.endAt,
    referenceNow: now,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastRefreshedAt,
    lastRecomputedAt: null,
    configSnapshot: competitionConfig,
  };
}

function createPositionId(participantId: string, positionId: number) {
  return `position:${participantId}:${positionId}`;
}

function createPublishedCardSets(competitionId: string) {
  return getDayRange(competitionConfig.startAt, competitionConfig.endAt).map(
    (dayKey): PublishedDailyCardSet => ({
      id: `daily-card-set:${competitionId}:${dayKey}`,
      competitionId,
      dayKey,
      publishedAt: `${dayKey}T00:00:00.000Z`,
      updatedAt: `${dayKey}T00:00:00.000Z`,
      origin: "generated",
      operatorNote: null,
      fullSetBonus: getCardsForDay(dayKey).fullSetBonus,
      cards: getCardsForDay(dayKey).cards,
    })
  );
}

function createRuntimeState(competitionId: string): CompetitionRuntimeState {
  return {
    competitionId,
    schedulerEnabled: competitionRuntimeConfig.schedulerEnabled,
    refreshIntervalMinutes: competitionRuntimeConfig.refreshIntervalMinutes,
    recomputeIntervalMinutes: competitionRuntimeConfig.recomputeIntervalMinutes,
    lockTtlSeconds: competitionRuntimeConfig.lockTtlSeconds,
    maxJobRuns: competitionRuntimeConfig.maxJobRuns,
    activeLock: null,
    lastTickAt: null,
    lastSuccessfulTickAt: null,
    updatedAt: getReferenceNow().toISOString(),
  };
}

function createCompetitionServiceState(
  competitionId: string
): CompetitionServiceStateRecord {
  return {
    competitionId,
    health: {
      checkedAt: null,
      status: "unknown",
      responseTimeMs: null,
      serviceTimestamp: null,
      errorMessage: null,
    },
    sizeMultiplier: {
      syncedAt: null,
      source: "fallback",
      interpolation: "linear",
      formula:
        "multiplierMin + ((sizeUsd - minSize) * (multiplierMax - multiplierMin)) / (maxSize - minSize)",
      notes: [],
      tiers: [],
    },
    positionSchema: {
      syncedAt: null,
      programId: null,
      accountSizeBytes: null,
      closeInstructions: [],
      pdaSeeds: [],
      fieldCount: 0,
    },
    stream: {
      enabled: false,
      connectionStatus: "idle",
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      reconnectAttempts: 0,
      lastEventAt: null,
      lastCloseEventAt: null,
      lastSignature: null,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  };
}

function buildEmptyDatabase(): PilotDatabase {
  const competition = createCompetitionRecord(null);

  return {
    version: currentDatabaseVersion,
    competitions: [competition],
    participants: [],
    positions: [],
    dailyCardSets: createPublishedCardSets(competition.id),
    participantCards: [],
    scoreLedger: [],
    manualAdjustments: [],
    reviewFlags: [],
    leaderboardSnapshots: [],
    refreshRuns: [],
    runtimeStates: [createRuntimeState(competition.id)],
    runtimeJobRuns: [],
    competitionServiceStates: [createCompetitionServiceState(competition.id)],
    closeEvents: [],
  };
}

async function readJsonFile<T>(filePath: string) {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

function isSupabaseConfigured() {
  return Boolean(supabaseRestBaseUrl && supabaseServiceRoleKey);
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toText(value: unknown) {
  return value == null ? "" : String(value);
}

function toOptionalText(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  return String(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toOptionalNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value: unknown) {
  return value === true;
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function toNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry))
    : [];
}

function toJsonObject(value: unknown) {
  return asObject(value) ?? {};
}

function buildSupabaseHeaders(prefer?: string) {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readSupabaseResponse<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Supabase returned non-JSON content: ${text.slice(0, 160)}`);
  }
}

async function supabaseRequest<T>({
  table,
  method = "GET",
  query,
  body,
  prefer,
}: {
  table: string;
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string>;
  body?: unknown;
  prefer?: string;
}) {
  const url = new URL(`${supabaseRestBaseUrl}/${table}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: buildSupabaseHeaders(prefer),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await readSupabaseResponse<T>(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in (payload as object)
        ? String((payload as { message?: unknown }).message)
        : `Supabase request failed for ${table} with ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

function buildNotInFilter(values: string[]) {
  const quoted = values.map((value) =>
    `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
  );
  return `not.in.(${quoted.join(",")})`;
}

async function fetchSupabaseRows(table: string) {
  return (await supabaseRequest<Record<string, unknown>[] | null>({
    table,
    query: {
      select: "*",
    },
  })) ?? [];
}

async function upsertSupabaseRows(
  table: string,
  keyColumn: string,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) {
    return;
  }

  await supabaseRequest({
    table,
    method: "POST",
    query: {
      on_conflict: keyColumn,
    },
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

async function deleteMissingSupabaseRows(
  table: string,
  keyColumn: string,
  keys: string[]
) {
  await supabaseRequest({
    table,
    method: "DELETE",
    query: {
      [keyColumn]: keys.length > 0 ? buildNotInFilter(keys) : "not.is.null",
    },
    prefer: "return=minimal",
  });
}

async function ensureLocalDatabaseFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(databaseFilePath, "utf8");
  } catch {
    await writeDatabaseToFile(buildEmptyDatabase());
  }
}

async function readDatabaseFromFile() {
  await ensureLocalDatabaseFile();
  return readJsonFile<PilotDatabase>(databaseFilePath);
}

async function writeDatabaseToFile(database: PilotDatabase) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(databaseFilePath, JSON.stringify(normalizeDatabase(database), null, 2));
}

function normalizePublishedCardSets(database: PilotDatabase) {
  const activeCompetition = database.competitions[0];

  if (!activeCompetition) {
    return database.dailyCardSets;
  }

  const desiredByDay = new Map(
    createPublishedCardSets(activeCompetition.id).map((cardSet) => [cardSet.dayKey, cardSet])
  );
  const existing = database.dailyCardSets.filter(
    (cardSet) => cardSet.competitionId !== activeCompetition.id
  );

  for (const cardSet of database.dailyCardSets.filter(
    (entry) => entry.competitionId === activeCompetition.id
  )) {
    desiredByDay.set(cardSet.dayKey, {
      ...cardSet,
      publishedAt: cardSet.publishedAt || `${cardSet.dayKey}T00:00:00.000Z`,
      updatedAt: cardSet.updatedAt || cardSet.publishedAt || `${cardSet.dayKey}T00:00:00.000Z`,
      origin: cardSet.origin ?? "generated",
      operatorNote: cardSet.operatorNote ?? null,
    });
  }

  return [...existing, ...Array.from(desiredByDay.values()).sort((left, right) => left.dayKey.localeCompare(right.dayKey))];
}

function normalizeRuntimeStates(database: PilotDatabase) {
  const activeCompetition = database.competitions[0];
  const runtimeStates = database.runtimeStates ?? [];

  if (!activeCompetition) {
    return runtimeStates;
  }

  const desired = createRuntimeState(activeCompetition.id);
  const current = runtimeStates.find((entry) => entry.competitionId === activeCompetition.id);
  const rest = runtimeStates.filter((entry) => entry.competitionId !== activeCompetition.id);

  return [
    ...rest,
    current
      ? {
          ...desired,
          ...current,
          competitionId: activeCompetition.id,
        }
      : desired,
  ];
}

function normalizeCompetitionServiceStates(database: PilotDatabase) {
  const activeCompetition = database.competitions[0];
  const serviceStates = database.competitionServiceStates ?? [];

  if (!activeCompetition) {
    return serviceStates;
  }

  const desired = createCompetitionServiceState(activeCompetition.id);
  const current = serviceStates.find(
    (entry) => entry.competitionId === activeCompetition.id
  );
  const rest = serviceStates.filter(
    (entry) => entry.competitionId !== activeCompetition.id
  );

  return [
    ...rest,
    current
      ? {
          ...desired,
          ...current,
          competitionId: activeCompetition.id,
          health: {
            ...desired.health,
            ...(current.health ?? {}),
          },
          sizeMultiplier: {
            ...desired.sizeMultiplier,
            ...(current.sizeMultiplier ?? {}),
            tiers: current.sizeMultiplier?.tiers ?? desired.sizeMultiplier.tiers,
            notes: current.sizeMultiplier?.notes ?? desired.sizeMultiplier.notes,
          },
          positionSchema: {
            ...desired.positionSchema,
            ...(current.positionSchema ?? {}),
            closeInstructions:
              current.positionSchema?.closeInstructions ??
              desired.positionSchema.closeInstructions,
            pdaSeeds:
              current.positionSchema?.pdaSeeds ?? desired.positionSchema.pdaSeeds,
          },
          stream: {
            ...desired.stream,
            ...(current.stream ?? {}),
          },
        }
      : desired,
  ];
}

function normalizeDatabase(database: PilotDatabase): PilotDatabase {
  const competitions =
    database.competitions.length > 0
      ? database.competitions.map((competition) => ({
          ...competition,
          name: competitionConfig.name,
          tagline: competitionConfig.tagline,
          description: competitionConfig.description,
          startAt: competitionConfig.startAt,
          endAt: competitionConfig.endAt,
          configSnapshot: competitionConfig,
        }))
      : [createCompetitionRecord(null)];
  const competitionIds = new Set(competitions.map((competition) => competition.id));
  const participants = (database.participants ?? []).filter(
    (participant) =>
      participant.source !== "synthetic" && competitionIds.has(participant.competitionId)
  );
  const participantIds = new Set(participants.map((participant) => participant.id));
  const participantWallets = new Set(participants.map((participant) => participant.wallet));
  const positions = (database.positions ?? []).filter(
    (position) =>
      competitionIds.has(position.competitionId) &&
      participantIds.has(position.participantId) &&
      participantWallets.has(position.wallet)
  );

  return {
    version: currentDatabaseVersion,
    competitions,
    participants,
    positions,
    dailyCardSets: normalizePublishedCardSets({
      ...database,
      competitions,
    }),
    participantCards: (database.participantCards ?? []).filter(
      (entry) =>
        competitionIds.has(entry.competitionId) && participantIds.has(entry.participantId)
    ),
    scoreLedger: (database.scoreLedger ?? []).filter(
      (entry) =>
        competitionIds.has(entry.competitionId) && participantIds.has(entry.participantId)
    ),
    manualAdjustments: (database.manualAdjustments ?? []).filter(
      (entry) =>
        competitionIds.has(entry.competitionId) && participantIds.has(entry.participantId)
    ),
    reviewFlags: (database.reviewFlags ?? []).filter(
      (entry) =>
        competitionIds.has(entry.competitionId) && participantIds.has(entry.participantId)
    ),
    leaderboardSnapshots: (database.leaderboardSnapshots ?? []).filter(
      (snapshot) =>
        competitionIds.has(snapshot.competitionId) &&
        snapshot.rankings.every((participant) => participantWallets.has(participant.wallet))
    ),
    refreshRuns: (database.refreshRuns ?? []).filter((entry) =>
      competitionIds.has(entry.competitionId)
    ),
    runtimeStates: normalizeRuntimeStates({
      ...database,
      competitions,
    }),
    competitionServiceStates: normalizeCompetitionServiceStates({
      ...database,
      competitions,
    }),
    runtimeJobRuns: database.runtimeJobRuns ?? [],
    closeEvents: (database.closeEvents ?? []).filter(
      (entry) =>
        competitionIds.has(entry.competitionId) &&
        participantIds.has(entry.participantId) &&
        participantWallets.has(entry.wallet)
    ),
  };
}

function competitionRowToRecord(row: Record<string, unknown>): CompetitionRecord {
  return {
    id: toText(row.id),
    name: toText(row.name),
    tagline: toText(row.tagline),
    description: toText(row.description),
    startAt: toText(row.start_at),
    endAt: toText(row.end_at),
    referenceNow: toText(row.reference_now),
    status: (row.status as CompetitionRecord["status"]) ?? "draft",
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
    lastRefreshedAt: toOptionalText(row.last_refreshed_at),
    lastRecomputedAt: toOptionalText(row.last_recomputed_at),
    configSnapshot:
      ((asObject(row.config_snapshot) as unknown as CompetitionRecord["configSnapshot"] | null) ??
        competitionConfig),
  };
}

function participantRowToRecord(row: Record<string, unknown>): ParticipantRecord {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    wallet: toText(row.wallet),
    label: toText(row.label),
    source: (row.source as ParticipantRecord["source"]) ?? "live",
    status: (row.status as ParticipantRecord["status"]) ?? "active",
    joinedAt: toText(row.joined_at),
    lastSyncedAt: toOptionalText(row.last_synced_at),
  };
}

function positionRowToRecord(row: Record<string, unknown>): PositionRecord {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    position_id: toNumber(row.position_id),
    symbol: toText(row.symbol),
    side: (row.side as PositionRecord["side"]) ?? "long",
    status: toText(row.status),
    entry_price: toOptionalNumber(row.entry_price),
    exit_price: toOptionalNumber(row.exit_price),
    pnl: toOptionalNumber(row.pnl),
    entry_leverage: toOptionalNumber(row.entry_leverage),
    entry_date: toText(row.entry_date),
    exit_date: toOptionalText(row.exit_date),
    fees: toOptionalNumber(row.fees),
    borrow_fees: toOptionalNumber(row.borrow_fees),
    closed_by_sl_tp: toBoolean(row.closed_by_sl_tp),
    volume: toNumber(row.volume),
    duration: toNumber(row.duration),
    pnl_volume_ratio: toNumber(row.pnl_volume_ratio),
    source: (row.source as PositionRecord["source"]) ?? "live",
    ingestedAt: toText(row.ingested_at),
    updatedAt: toText(row.updated_at),
    rawPayload: asObject(row.raw_payload),
  };
}

function dailyCardSetRowToRecord(row: Record<string, unknown>): PublishedDailyCardSet {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    dayKey: toText(row.day_key),
    publishedAt: toText(row.published_at),
    updatedAt: toText(row.updated_at),
    origin: (row.origin as PublishedDailyCardSet["origin"]) ?? "generated",
    operatorNote: toOptionalText(row.operator_note),
    fullSetBonus: toNumber(row.full_set_bonus),
    cards: Array.isArray(row.cards) ? (row.cards as PublishedDailyCardSet["cards"]) : [],
  };
}

function participantCardRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    dayKey: toText(row.day_key),
    cardId: toText(row.card_id),
    title: toText(row.title),
    description: toText(row.description),
    category: toText(row.category) as PilotDatabase["participantCards"][number]["category"],
    difficulty: toText(row.difficulty) as PilotDatabase["participantCards"][number]["difficulty"],
    points: toNumber(row.points),
    status: (row.status as PilotDatabase["participantCards"][number]["status"]) ?? "pending",
    completedAt: toOptionalText(row.completed_at),
    evidencePositionIds: toNumberArray(row.evidence_position_ids),
  };
}

function scoreLedgerRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    metric: (row.metric as PilotDatabase["scoreLedger"][number]["metric"]) ?? "score",
    sourceType: toText(row.source_type) as PilotDatabase["scoreLedger"][number]["sourceType"],
    sourceRef: toText(row.source_ref),
    dayKey: toText(row.day_key),
    amount: toNumber(row.amount),
    createdAt: toText(row.created_at),
    metadata: toJsonObject(row.metadata),
  };
}

function manualAdjustmentRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    metric: (row.metric as PilotDatabase["manualAdjustments"][number]["metric"]) ?? "score",
    amount: toNumber(row.amount),
    reason: toText(row.reason),
    note: toOptionalText(row.note),
    dayKey: toText(row.day_key),
    status: (row.status as PilotDatabase["manualAdjustments"][number]["status"]) ?? "active",
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
    voidedAt: toOptionalText(row.voided_at),
    voidReason: toOptionalText(row.void_reason),
  };
}

function reviewFlagRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    category: (row.category as PilotDatabase["reviewFlags"][number]["category"]) ?? "abuse",
    severity: (row.severity as PilotDatabase["reviewFlags"][number]["severity"]) ?? "medium",
    status: (row.status as PilotDatabase["reviewFlags"][number]["status"]) ?? "open",
    title: toText(row.title),
    description: toText(row.description),
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
    resolvedAt: toOptionalText(row.resolved_at),
    resolutionNote: toOptionalText(row.resolution_note),
  };
}

function leaderboardSnapshotRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    capturedAt: toText(row.captured_at),
    referenceNow: toText(row.reference_now),
    rankings: Array.isArray(row.rankings)
      ? (row.rankings as PilotDatabase["leaderboardSnapshots"][number]["rankings"])
      : [],
    summary:
      ((asObject(row.summary) as unknown as
        | PilotDatabase["leaderboardSnapshots"][number]["summary"]
        | null) ?? {
        totalScore: 0,
        totalEligibleVolume: 0,
        totalTrades: 0,
        totalTickets: 0,
      }),
  };
}

function refreshRunRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    targetWallet: toOptionalText(row.target_wallet),
    startedAt: toText(row.started_at),
    finishedAt: toText(row.finished_at),
    status: (row.status as PilotDatabase["refreshRuns"][number]["status"]) ?? "success",
    participantsSynced: toNumber(row.participants_synced),
    positionsUpserted: toNumber(row.positions_upserted),
    errorMessages: toStringArray(row.error_messages),
  };
}

function runtimeStateRowToRecord(row: Record<string, unknown>): CompetitionRuntimeState {
  return {
    competitionId: toText(row.competition_id),
    schedulerEnabled: toBoolean(row.scheduler_enabled),
    refreshIntervalMinutes: toNumber(row.refresh_interval_minutes),
    recomputeIntervalMinutes: toNumber(row.recompute_interval_minutes),
    lockTtlSeconds: toNumber(row.lock_ttl_seconds),
    maxJobRuns: toNumber(row.max_job_runs),
    activeLock: (asObject(row.active_lock) as CompetitionRuntimeState["activeLock"]) ?? null,
    lastTickAt: toOptionalText(row.last_tick_at),
    lastSuccessfulTickAt: toOptionalText(row.last_successful_tick_at),
    updatedAt: toText(row.updated_at),
  };
}

function runtimeJobRunRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    trigger: (row.trigger as PilotDatabase["runtimeJobRuns"][number]["trigger"]) ?? "manual",
    startedAt: toText(row.started_at),
    finishedAt: toText(row.finished_at),
    status: (row.status as PilotDatabase["runtimeJobRuns"][number]["status"]) ?? "success",
    dueActions: toStringArray(row.due_actions) as PilotDatabase["runtimeJobRuns"][number]["dueActions"],
    executedActions: toStringArray(row.executed_actions) as PilotDatabase["runtimeJobRuns"][number]["executedActions"],
    skippedReason: toOptionalText(row.skipped_reason),
    errorMessage: toOptionalText(row.error_message),
    refreshRunId: toOptionalText(row.refresh_run_id),
    leaderboardSnapshotId: toOptionalText(row.leaderboard_snapshot_id),
  };
}

function competitionServiceStateRowToRecord(
  row: Record<string, unknown>
): CompetitionServiceStateRecord {
  return {
    competitionId: toText(row.competition_id),
    health: {
      checkedAt: toOptionalText(row.health_checked_at),
      status:
        (row.health_status as CompetitionServiceStateRecord["health"]["status"]) ?? "unknown",
      responseTimeMs: toOptionalNumber(row.health_response_time_ms),
      serviceTimestamp: toOptionalNumber(row.health_service_timestamp),
      errorMessage: toOptionalText(row.health_error_message),
    },
    sizeMultiplier: {
      syncedAt: toOptionalText(row.size_multiplier_synced_at),
      source:
        (row.size_multiplier_source as CompetitionServiceStateRecord["sizeMultiplier"]["source"]) ??
        "fallback",
      interpolation: toText(row.size_multiplier_interpolation),
      formula: toText(row.size_multiplier_formula),
      notes: toStringArray(row.size_multiplier_notes),
      tiers: Array.isArray(row.size_multiplier_tiers)
        ? (row.size_multiplier_tiers as CompetitionServiceStateRecord["sizeMultiplier"]["tiers"])
        : [],
    },
    positionSchema: {
      syncedAt: toOptionalText(row.position_schema_synced_at),
      programId: toOptionalText(row.position_schema_program_id),
      accountSizeBytes: toOptionalNumber(row.position_schema_account_size_bytes),
      closeInstructions: toStringArray(row.position_schema_close_instructions),
      pdaSeeds: toStringArray(row.position_schema_pda_seeds),
      fieldCount: toNumber(row.position_schema_field_count),
    },
    stream: {
      enabled: toBoolean(row.stream_enabled),
      connectionStatus:
        (row.stream_connection_status as CompetitionServiceStateRecord["stream"]["connectionStatus"]) ??
        "idle",
      lastConnectedAt: toOptionalText(row.stream_last_connected_at),
      lastDisconnectedAt: toOptionalText(row.stream_last_disconnected_at),
      reconnectAttempts: toNumber(row.stream_reconnect_attempts),
      lastEventAt: toOptionalText(row.stream_last_event_at),
      lastCloseEventAt: toOptionalText(row.stream_last_close_event_at),
      lastSignature: toOptionalText(row.stream_last_signature),
      lastErrorAt: toOptionalText(row.stream_last_error_at),
      lastErrorMessage: toOptionalText(row.stream_last_error_message),
    },
  };
}

function closeEventRowToRecord(row: Record<string, unknown>) {
  return {
    id: toText(row.id),
    competitionId: toText(row.competition_id),
    participantId: toText(row.participant_id),
    wallet: toText(row.wallet),
    positionPda: toText(row.position_pda),
    positionId: toNumber(row.position_id),
    signature: toText(row.signature),
    slot: toText(row.slot),
    custodyMint: toText(row.custody_mint),
    side: (row.side as PilotDatabase["closeEvents"][number]["side"]) ?? "long",
    sizeUsd: toNumber(row.size_usd),
    priceUsd: toNumber(row.price_usd),
    collateralAmountUsd: toNumber(row.collateral_amount_usd),
    profitUsd: toNumber(row.profit_usd),
    lossUsd: toNumber(row.loss_usd),
    netPnlUsd: toNumber(row.net_pnl_usd),
    borrowFeeUsd: toNumber(row.borrow_fee_usd),
    exitFeeUsd: toNumber(row.exit_fee_usd),
    percentageClosedPct: toNumber(row.percentage_closed_pct),
    timestamp: toText(row.event_timestamp),
    raw: toJsonObject(row.raw),
    decoded: toJsonObject(row.decoded),
  };
}

function competitionRecordToRow(record: CompetitionRecord) {
  return {
    id: record.id,
    name: record.name,
    tagline: record.tagline,
    description: record.description,
    start_at: record.startAt,
    end_at: record.endAt,
    reference_now: record.referenceNow,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    last_refreshed_at: record.lastRefreshedAt,
    last_recomputed_at: record.lastRecomputedAt,
    config_snapshot: record.configSnapshot,
  };
}

function participantRecordToRow(record: ParticipantRecord) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    wallet: record.wallet,
    label: record.label,
    source: record.source,
    status: record.status,
    joined_at: record.joinedAt,
    last_synced_at: record.lastSyncedAt,
  };
}

function positionRecordToRow(record: PositionRecord) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    position_id: record.position_id,
    symbol: record.symbol,
    side: record.side,
    status: record.status,
    entry_price: record.entry_price,
    exit_price: record.exit_price,
    pnl: record.pnl,
    entry_leverage: record.entry_leverage,
    entry_date: record.entry_date,
    exit_date: record.exit_date,
    fees: record.fees,
    borrow_fees: record.borrow_fees,
    closed_by_sl_tp: record.closed_by_sl_tp,
    volume: record.volume,
    duration: record.duration,
    pnl_volume_ratio: record.pnl_volume_ratio,
    source: record.source,
    ingested_at: record.ingestedAt,
    updated_at: record.updatedAt,
    raw_payload: record.rawPayload,
  };
}

function dailyCardSetRecordToRow(record: PublishedDailyCardSet) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    day_key: record.dayKey,
    published_at: record.publishedAt,
    updated_at: record.updatedAt,
    origin: record.origin,
    operator_note: record.operatorNote,
    full_set_bonus: record.fullSetBonus,
    cards: record.cards,
  };
}

function participantCardRecordToRow(record: PilotDatabase["participantCards"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    day_key: record.dayKey,
    card_id: record.cardId,
    title: record.title,
    description: record.description,
    category: record.category,
    difficulty: record.difficulty,
    points: record.points,
    status: record.status,
    completed_at: record.completedAt,
    evidence_position_ids: record.evidencePositionIds,
  };
}

function scoreLedgerRecordToRow(record: PilotDatabase["scoreLedger"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    metric: record.metric,
    source_type: record.sourceType,
    source_ref: record.sourceRef,
    day_key: record.dayKey,
    amount: record.amount,
    created_at: record.createdAt,
    metadata: record.metadata,
  };
}

function manualAdjustmentRecordToRow(record: PilotDatabase["manualAdjustments"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    metric: record.metric,
    amount: record.amount,
    reason: record.reason,
    note: record.note,
    day_key: record.dayKey,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    voided_at: record.voidedAt,
    void_reason: record.voidReason,
  };
}

function reviewFlagRecordToRow(record: PilotDatabase["reviewFlags"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    category: record.category,
    severity: record.severity,
    status: record.status,
    title: record.title,
    description: record.description,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    resolved_at: record.resolvedAt,
    resolution_note: record.resolutionNote,
  };
}

function leaderboardSnapshotRecordToRow(record: PilotDatabase["leaderboardSnapshots"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    captured_at: record.capturedAt,
    reference_now: record.referenceNow,
    rankings: record.rankings,
    summary: record.summary,
  };
}

function refreshRunRecordToRow(record: PilotDatabase["refreshRuns"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    target_wallet: record.targetWallet,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    status: record.status,
    participants_synced: record.participantsSynced,
    positions_upserted: record.positionsUpserted,
    error_messages: record.errorMessages,
  };
}

function runtimeStateRecordToRow(record: CompetitionRuntimeState) {
  return {
    competition_id: record.competitionId,
    scheduler_enabled: record.schedulerEnabled,
    refresh_interval_minutes: record.refreshIntervalMinutes,
    recompute_interval_minutes: record.recomputeIntervalMinutes,
    lock_ttl_seconds: record.lockTtlSeconds,
    max_job_runs: record.maxJobRuns,
    active_lock: record.activeLock,
    last_tick_at: record.lastTickAt,
    last_successful_tick_at: record.lastSuccessfulTickAt,
    updated_at: record.updatedAt,
  };
}

function runtimeJobRunRecordToRow(record: PilotDatabase["runtimeJobRuns"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    trigger: record.trigger,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    status: record.status,
    due_actions: record.dueActions,
    executed_actions: record.executedActions,
    skipped_reason: record.skippedReason,
    error_message: record.errorMessage,
    refresh_run_id: record.refreshRunId,
    leaderboard_snapshot_id: record.leaderboardSnapshotId,
  };
}

function competitionServiceStateRecordToRow(record: CompetitionServiceStateRecord) {
  return {
    competition_id: record.competitionId,
    health_checked_at: record.health.checkedAt,
    health_status: record.health.status,
    health_response_time_ms: record.health.responseTimeMs,
    health_service_timestamp: record.health.serviceTimestamp,
    health_error_message: record.health.errorMessage,
    size_multiplier_synced_at: record.sizeMultiplier.syncedAt,
    size_multiplier_source: record.sizeMultiplier.source,
    size_multiplier_interpolation: record.sizeMultiplier.interpolation,
    size_multiplier_formula: record.sizeMultiplier.formula,
    size_multiplier_notes: record.sizeMultiplier.notes,
    size_multiplier_tiers: record.sizeMultiplier.tiers,
    position_schema_synced_at: record.positionSchema.syncedAt,
    position_schema_program_id: record.positionSchema.programId,
    position_schema_account_size_bytes: record.positionSchema.accountSizeBytes,
    position_schema_close_instructions: record.positionSchema.closeInstructions,
    position_schema_pda_seeds: record.positionSchema.pdaSeeds,
    position_schema_field_count: record.positionSchema.fieldCount,
    stream_enabled: record.stream.enabled,
    stream_connection_status: record.stream.connectionStatus,
    stream_last_connected_at: record.stream.lastConnectedAt,
    stream_last_disconnected_at: record.stream.lastDisconnectedAt,
    stream_reconnect_attempts: record.stream.reconnectAttempts,
    stream_last_event_at: record.stream.lastEventAt,
    stream_last_close_event_at: record.stream.lastCloseEventAt,
    stream_last_signature: record.stream.lastSignature,
    stream_last_error_at: record.stream.lastErrorAt,
    stream_last_error_message: record.stream.lastErrorMessage,
    updated_at: getSystemTimestamp(),
  };
}

function closeEventRecordToRow(record: PilotDatabase["closeEvents"][number]) {
  return {
    id: record.id,
    competition_id: record.competitionId,
    participant_id: record.participantId,
    wallet: record.wallet,
    position_pda: record.positionPda,
    position_id: record.positionId,
    signature: record.signature,
    slot: record.slot,
    custody_mint: record.custodyMint,
    side: record.side,
    size_usd: record.sizeUsd,
    price_usd: record.priceUsd,
    collateral_amount_usd: record.collateralAmountUsd,
    profit_usd: record.profitUsd,
    loss_usd: record.lossUsd,
    net_pnl_usd: record.netPnlUsd,
    borrow_fee_usd: record.borrowFeeUsd,
    exit_fee_usd: record.exitFeeUsd,
    percentage_closed_pct: record.percentageClosedPct,
    event_timestamp: record.timestamp,
    raw: record.raw,
    decoded: record.decoded,
  };
}

async function readDatabaseFromSupabase() {
  const [
    competitionsRows,
    participantsRows,
    positionsRows,
    dailyCardSetsRows,
    participantCardsRows,
    scoreLedgerRows,
    manualAdjustmentsRows,
    reviewFlagsRows,
    leaderboardSnapshotsRows,
    refreshRunsRows,
    runtimeStatesRows,
    runtimeJobRunsRows,
    competitionServiceStatesRows,
    closeEventsRows,
  ] = await Promise.all([
    fetchSupabaseRows("competitions"),
    fetchSupabaseRows("participants"),
    fetchSupabaseRows("positions"),
    fetchSupabaseRows("daily_card_sets"),
    fetchSupabaseRows("participant_cards"),
    fetchSupabaseRows("score_ledger"),
    fetchSupabaseRows("manual_adjustments"),
    fetchSupabaseRows("review_flags"),
    fetchSupabaseRows("leaderboard_snapshots"),
    fetchSupabaseRows("refresh_runs"),
    fetchSupabaseRows("runtime_states"),
    fetchSupabaseRows("runtime_job_runs"),
    fetchSupabaseRows("competition_service_states"),
    fetchSupabaseRows("close_events"),
  ]);

  return {
    version: currentDatabaseVersion,
    competitions: competitionsRows.map(competitionRowToRecord),
    participants: participantsRows.map(participantRowToRecord),
    positions: positionsRows.map(positionRowToRecord),
    dailyCardSets: dailyCardSetsRows.map(dailyCardSetRowToRecord),
    participantCards: participantCardsRows.map(participantCardRowToRecord),
    scoreLedger: scoreLedgerRows.map(scoreLedgerRowToRecord),
    manualAdjustments: manualAdjustmentsRows.map(manualAdjustmentRowToRecord),
    reviewFlags: reviewFlagsRows.map(reviewFlagRowToRecord),
    leaderboardSnapshots: leaderboardSnapshotsRows.map(leaderboardSnapshotRowToRecord),
    refreshRuns: refreshRunsRows.map(refreshRunRowToRecord),
    runtimeStates: runtimeStatesRows.map(runtimeStateRowToRecord),
    runtimeJobRuns: runtimeJobRunsRows.map(runtimeJobRunRowToRecord),
    competitionServiceStates: competitionServiceStatesRows.map(
      competitionServiceStateRowToRecord
    ),
    closeEvents: closeEventsRows.map(closeEventRowToRecord),
  } satisfies PilotDatabase;
}

async function writeDatabaseToSupabase(database: PilotDatabase) {
  const normalized = normalizeDatabase(database);

  const tables = {
    competitions: normalized.competitions.map(competitionRecordToRow),
    participants: normalized.participants.map(participantRecordToRow),
    positions: normalized.positions.map(positionRecordToRow),
    daily_card_sets: normalized.dailyCardSets.map(dailyCardSetRecordToRow),
    participant_cards: normalized.participantCards.map(participantCardRecordToRow),
    score_ledger: normalized.scoreLedger.map(scoreLedgerRecordToRow),
    manual_adjustments: normalized.manualAdjustments.map(manualAdjustmentRecordToRow),
    review_flags: normalized.reviewFlags.map(reviewFlagRecordToRow),
    leaderboard_snapshots: normalized.leaderboardSnapshots.map(
      leaderboardSnapshotRecordToRow
    ),
    refresh_runs: normalized.refreshRuns.map(refreshRunRecordToRow),
    runtime_states: normalized.runtimeStates.map(runtimeStateRecordToRow),
    runtime_job_runs: normalized.runtimeJobRuns.map(runtimeJobRunRecordToRow),
    competition_service_states: normalized.competitionServiceStates.map(
      competitionServiceStateRecordToRow
    ),
    close_events: normalized.closeEvents.map(closeEventRecordToRow),
  } satisfies Record<string, Record<string, unknown>[]>;

  await upsertSupabaseRows("competitions", "id", tables.competitions);
  await upsertSupabaseRows("participants", "id", tables.participants);
  await upsertSupabaseRows("positions", "id", tables.positions);
  await upsertSupabaseRows("daily_card_sets", "id", tables.daily_card_sets);
  await upsertSupabaseRows("participant_cards", "id", tables.participant_cards);
  await upsertSupabaseRows("score_ledger", "id", tables.score_ledger);
  await upsertSupabaseRows("manual_adjustments", "id", tables.manual_adjustments);
  await upsertSupabaseRows("review_flags", "id", tables.review_flags);
  await upsertSupabaseRows(
    "leaderboard_snapshots",
    "id",
    tables.leaderboard_snapshots
  );
  await upsertSupabaseRows("refresh_runs", "id", tables.refresh_runs);
  await upsertSupabaseRows("runtime_states", "competition_id", tables.runtime_states);
  await upsertSupabaseRows("runtime_job_runs", "id", tables.runtime_job_runs);
  await upsertSupabaseRows(
    "competition_service_states",
    "competition_id",
    tables.competition_service_states
  );
  await upsertSupabaseRows("close_events", "id", tables.close_events);

  await deleteMissingSupabaseRows(
    "close_events",
    "id",
    tables.close_events.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "competition_service_states",
    "competition_id",
    tables.competition_service_states.map((row) => toText(row.competition_id))
  );
  await deleteMissingSupabaseRows(
    "runtime_job_runs",
    "id",
    tables.runtime_job_runs.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "runtime_states",
    "competition_id",
    tables.runtime_states.map((row) => toText(row.competition_id))
  );
  await deleteMissingSupabaseRows(
    "refresh_runs",
    "id",
    tables.refresh_runs.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "leaderboard_snapshots",
    "id",
    tables.leaderboard_snapshots.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "review_flags",
    "id",
    tables.review_flags.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "manual_adjustments",
    "id",
    tables.manual_adjustments.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "score_ledger",
    "id",
    tables.score_ledger.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "participant_cards",
    "id",
    tables.participant_cards.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "daily_card_sets",
    "id",
    tables.daily_card_sets.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "positions",
    "id",
    tables.positions.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "participants",
    "id",
    tables.participants.map((row) => toText(row.id))
  );
  await deleteMissingSupabaseRows(
    "competitions",
    "id",
    tables.competitions.map((row) => toText(row.id))
  );
}

async function bootstrapSupabaseDatabase() {
  const fileDatabase = await readDatabaseFromFile();
  const normalized = normalizeDatabase(fileDatabase);
  await writeDatabaseToSupabase(normalized);
  await writeDatabaseToFile(normalized);
  return normalized;
}

export async function readDatabase() {
  if (!isSupabaseConfigured()) {
    const database = await readDatabaseFromFile();
    const normalizedDatabase = normalizeDatabase(database);

    if (JSON.stringify(normalizedDatabase) !== JSON.stringify(database)) {
      await writeDatabaseToFile(normalizedDatabase);
    }

    return normalizedDatabase;
  }

  const database = await readDatabaseFromSupabase();

  if (database.competitions.length === 0) {
    return bootstrapSupabaseDatabase();
  }

  const normalizedDatabase = normalizeDatabase(database);

  if (JSON.stringify(normalizedDatabase) !== JSON.stringify(database)) {
    await writeDatabaseToSupabase(normalizedDatabase);
  }

  await writeDatabaseToFile(normalizedDatabase);
  return normalizedDatabase;
}

export async function writeDatabase(database: PilotDatabase) {
  const normalized = normalizeDatabase(database);

  if (isSupabaseConfigured()) {
    await writeDatabaseToSupabase(normalized);
  }

  await writeDatabaseToFile(normalized);
}

export async function updateDatabase<T>(
  mutator: (database: PilotDatabase) => Promise<T> | T
) {
  const database = await readDatabase();
  const result = await mutator(database);
  await writeDatabase(database);
  return result;
}

export function getActiveCompetition(database: PilotDatabase) {
  const competition = database.competitions.find((entry) => entry.status === "active");

  if (!competition) {
    throw new Error("No active competition found in pilot database.");
  }

  return competition;
}

export function getCompetitionRuntimeState(database: PilotDatabase, competitionId: string) {
  const existing = database.runtimeStates.find((entry) => entry.competitionId === competitionId);

  if (existing) {
    return existing;
  }

  const runtimeState = createRuntimeState(competitionId);
  database.runtimeStates.push(runtimeState);
  return runtimeState;
}

export function getCompetitionServiceState(
  database: PilotDatabase,
  competitionId: string
) {
  const existing = database.competitionServiceStates.find(
    (entry) => entry.competitionId === competitionId
  );

  if (existing) {
    return existing;
  }

  const serviceState = createCompetitionServiceState(competitionId);
  database.competitionServiceStates.push(serviceState);
  return serviceState;
}

export function touchCompetition(competition: CompetitionRecord) {
  competition.updatedAt = getSystemTimestamp();
}

export function replaceParticipantPositions(
  database: PilotDatabase,
  participant: ParticipantRecord,
  nextPositions: PositionRecord[]
) {
  database.positions = database.positions.filter((position) => position.participantId !== participant.id);
  database.positions.push(...nextPositions);
}

export function buildPositionRecordsForParticipant(
  competitionId: string,
  participant: ParticipantRecord,
  positions: AdrenaPosition[]
) {
  const timestamp = getSystemTimestamp();

  return positions.map(
    (position): PositionRecord => ({
      ...position,
      id: createPositionId(participant.id, position.position_id),
      competitionId,
      participantId: participant.id,
      wallet: participant.wallet,
      ingestedAt: timestamp,
      updatedAt: timestamp,
      rawPayload: null,
    })
  );
}
