import { syncCompetitionServiceState } from "@/lib/adrena-competition-service";
import { fetchMarketPulse, fetchPositions } from "@/lib/adrena";
import { getBattlecardCatalog, getDayKey, getReferenceNow } from "@/lib/config";
import { buildParticipantScoreResult } from "@/lib/scoring";
import {
  buildPositionRecordsForParticipant,
  getActiveCompetition,
  getCompetitionServiceState,
  getCompetitionRuntimeState,
  readDatabase,
  replaceParticipantPositions,
  touchCompetition,
  updateDatabase,
  writeDatabase,
} from "@/lib/storage";
import type {
  AdminManualAdjustmentRecord,
  CompetitionAdminSnapshot,
  CompetitionParticipantDetail,
  CompetitionPilotMetrics,
  CompetitionParticipantAdminDetail,
  CompetitionRecord,
  CompetitionRuntimeSnapshot,
  CompetitionSnapshot,
  LeaderboardSnapshotRecord,
  LeaderboardSummary,
  ParticipantSnapshot,
  PilotDatabase,
  RefreshRunRecord,
  ScoreLedgerEntry,
} from "@/lib/types";

function getSystemTimestamp() {
  return new Date().toISOString();
}

function addMinutes(timestamp: string, minutes: number) {
  return new Date(new Date(timestamp).getTime() + minutes * 60_000).toISOString();
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function sortParticipants(participants: ParticipantSnapshot[]) {
  return participants
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.totalEligibleVolume !== left.totalEligibleVolume) {
        return right.totalEligibleVolume - left.totalEligibleVolume;
      }

      return left.label.localeCompare(right.label);
    })
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
}

function buildSummary(rankings: ParticipantSnapshot[]): LeaderboardSummary {
  return {
    totalScore: rankings.reduce((sum, participant) => sum + participant.score, 0),
    totalEligibleVolume: rankings.reduce(
      (sum, participant) => sum + participant.totalEligibleVolume,
      0
    ),
    totalTrades: rankings.reduce((sum, participant) => sum + participant.eligibleTrades, 0),
    totalTickets: rankings.reduce((sum, participant) => sum + participant.raffleTickets, 0),
  };
}

function buildNotes(database: PilotDatabase, participants: ParticipantSnapshot[]) {
  const notes = [
    "Pilot mode now uses a normalized local data store with published card sets, position records, participant cards, and score ledger entries.",
    "Every leaderboard view is rebuilt from deterministic recompute logic, so trade points, card rewards, streaks, and raffle tickets are auditable.",
  ];

  if (participants.length === 0) {
    notes.push("Register a live Solana wallet to start ingesting Adrena positions and populate the league.");
  } else {
    notes.push("Registered wallets can be refreshed against Adrena's public position endpoint from this UI.");
  }

  if (database.refreshRuns.some((run) => run.status !== "success")) {
    notes.push("Recent refresh activity includes partial failures. Admin review routes can inspect refresh logs and recompute safely.");
  }

  if (database.reviewFlags.some((flag) => flag.status === "open")) {
    notes.push("Admin review workflow is active, with open flags or disputes available for operator follow-up.");
  }

  if (database.manualAdjustments.some((adjustment) => adjustment.status === "active")) {
    notes.push("Manual score or ticket adjustments are being tracked as explicit ledger-backed overrides.");
  }

  if (database.closeEvents.length > 0) {
    notes.push("Realized close-position events from the Adrena competition service now feed score evidence and size-multiplier weighting.");
  }

  return notes;
}

function buildCompetitionParticipantDetail(
  database: PilotDatabase,
  competition: CompetitionRecord,
  participant: ReturnType<typeof getCompetitionParticipants>[number],
  latestSnapshot: LeaderboardSnapshotRecord | null
): CompetitionParticipantDetail {
  return {
    participant,
    snapshot: latestSnapshot?.rankings.find((entry) => entry.wallet === participant.wallet) ?? null,
    positions: database.positions
      .filter(
        (position) =>
          position.competitionId === competition.id && position.participantId === participant.id
      )
      .sort((left, right) => {
        const leftDate = new Date(left.exit_date ?? left.entry_date).getTime();
        const rightDate = new Date(right.exit_date ?? right.entry_date).getTime();
        return rightDate - leftDate;
      }),
    closeEvents: database.closeEvents
      .filter(
        (entry) =>
          entry.competitionId === competition.id && entry.participantId === participant.id
      )
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    cards: database.participantCards
      .filter(
        (entry) =>
          entry.competitionId === competition.id && entry.participantId === participant.id
      )
      .sort((left, right) => right.dayKey.localeCompare(left.dayKey)),
    ledger: database.scoreLedger
      .filter(
        (entry) =>
          entry.competitionId === competition.id && entry.participantId === participant.id
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };
}

function getCompetitionCardSets(database: PilotDatabase, competition: CompetitionRecord) {
  const referenceDay = getDayKey(competition.referenceNow);

  return database.dailyCardSets
    .filter(
      (cardSet) => cardSet.competitionId === competition.id && cardSet.dayKey <= referenceDay
    )
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey));
}

function getAllCompetitionCardSets(database: PilotDatabase, competitionId: string) {
  return database.dailyCardSets
    .filter((cardSet) => cardSet.competitionId === competitionId)
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey));
}

function getCompetitionParticipants(database: PilotDatabase, competitionId: string) {
  return database.participants.filter((participant) => participant.competitionId === competitionId);
}

function getCompetitionLedger(database: PilotDatabase, competitionId: string) {
  return database.scoreLedger.filter((entry) => entry.competitionId === competitionId);
}

function getCompetitionCloseEvents(database: PilotDatabase, competitionId: string) {
  return database.closeEvents.filter((entry) => entry.competitionId === competitionId);
}

function getCompetitionFlags(database: PilotDatabase, competitionId: string) {
  return database.reviewFlags.filter((entry) => entry.competitionId === competitionId);
}

function getCompetitionManualAdjustments(database: PilotDatabase, competitionId: string) {
  return database.manualAdjustments.filter((entry) => entry.competitionId === competitionId);
}

function getLatestLeaderboardSnapshot(database: PilotDatabase, competitionId: string) {
  return database.leaderboardSnapshots
    .filter((snapshot) => snapshot.competitionId === competitionId)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0] ?? null;
}

function buildCompetitionSnapshotRecord(
  competition: CompetitionRecord,
  rankings: ParticipantSnapshot[]
): LeaderboardSnapshotRecord {
  return {
    id: `leaderboard-snapshot:${competition.id}:${Date.now()}`,
    competitionId: competition.id,
    capturedAt: competition.lastRecomputedAt ?? getSystemTimestamp(),
    referenceNow: competition.referenceNow,
    rankings,
    summary: buildSummary(rankings),
  };
}

function buildManualAdjustmentLedgerEntries(
  participant: { id: string; wallet: string },
  competitionId: string,
  adjustments: AdminManualAdjustmentRecord[]
) {
  return adjustments.map(
    (adjustment): ScoreLedgerEntry => ({
      id: `ledger:${adjustment.id}`,
      competitionId,
      participantId: participant.id,
      wallet: participant.wallet,
      metric: adjustment.metric,
      sourceType: "manual_adjustment",
      sourceRef: `adjustment:${adjustment.id}`,
      dayKey: adjustment.dayKey,
      amount: adjustment.amount,
      createdAt: adjustment.createdAt,
      metadata: {
        adjustmentId: adjustment.id,
        reason: adjustment.reason,
        note: adjustment.note,
      },
    })
  );
}

function applyManualAdjustmentsToSnapshot(
  snapshot: ParticipantSnapshot,
  adjustments: ScoreLedgerEntry[]
): ParticipantSnapshot {
  const adjustmentPoints = adjustments
    .filter((entry) => entry.metric === "score")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const adjustmentTickets = adjustments
    .filter((entry) => entry.metric === "ticket")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    ...snapshot,
    score: snapshot.score + adjustmentPoints,
    adjustmentPoints,
    raffleTickets: snapshot.raffleTickets + adjustmentTickets,
    adjustmentTickets,
  };
}

function buildPublicSnapshot({
  database,
  competition,
  leaderboardSnapshot,
  marketPulse,
}: {
  database: PilotDatabase;
  competition: CompetitionRecord;
  leaderboardSnapshot: LeaderboardSnapshotRecord;
  marketPulse: CompetitionSnapshot["marketPulse"];
}): CompetitionSnapshot {
  return {
    competition: {
      id: competition.id,
      name: competition.name,
      tagline: competition.tagline,
      description: competition.description,
      startAt: competition.startAt,
      endAt: competition.endAt,
      referenceNow: competition.referenceNow,
      dayKey: getDayKey(competition.referenceNow),
      participantCount: leaderboardSnapshot.rankings.length,
      lastRefreshedAt: competition.lastRefreshedAt,
      lastRecomputedAt: competition.lastRecomputedAt,
    },
    notes: buildNotes(database, leaderboardSnapshot.rankings),
    marketPulse,
    summary: leaderboardSnapshot.summary,
    dailyBattlecards: getCompetitionCardSets(database, competition).find(
      (cardSet) => cardSet.dayKey === getDayKey(competition.referenceNow)
    ) ?? {
      dayKey: getDayKey(competition.referenceNow),
      cards: [],
      fullSetBonus: competition.configSnapshot.fullSetBonus,
    },
    leaderboard: leaderboardSnapshot.rankings,
  };
}

function limitRefreshRuns(
  database: PilotDatabase,
  competitionId: string,
  limit: number
) {
  const otherRuns = database.refreshRuns.filter((run) => run.competitionId !== competitionId);
  const competitionRuns = database.refreshRuns
    .filter((run) => run.competitionId === competitionId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit);

  database.refreshRuns = [...otherRuns, ...competitionRuns];
}

function limitLeaderboardSnapshots(
  database: PilotDatabase,
  competitionId: string,
  limit: number
) {
  const otherSnapshots = database.leaderboardSnapshots.filter(
    (snapshot) => snapshot.competitionId !== competitionId
  );
  const competitionSnapshots = database.leaderboardSnapshots
    .filter((snapshot) => snapshot.competitionId === competitionId)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .slice(0, limit);

  database.leaderboardSnapshots = [...otherSnapshots, ...competitionSnapshots];
}

function getRecentRuntimeRuns(database: PilotDatabase, competitionId: string) {
  return database.runtimeJobRuns
    .filter((entry) => entry.competitionId === competitionId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

function buildCompetitionRuntimeSnapshot(
  database: PilotDatabase,
  competition: CompetitionRecord
): CompetitionRuntimeSnapshot {
  const runtimeState = getCompetitionRuntimeState(database, competition.id);
  const now = getReferenceNow().toISOString();
  const allRuns = getRecentRuntimeRuns(database, competition.id);
  const recentRuns = allRuns.slice(0, 10);
  const nextRefreshDueAt = competition.lastRefreshedAt
    ? addMinutes(competition.lastRefreshedAt, runtimeState.refreshIntervalMinutes)
    : now;
  const nextRecomputeDueAt = competition.lastRecomputedAt
    ? addMinutes(competition.lastRecomputedAt, runtimeState.recomputeIntervalMinutes)
    : now;
  const refreshOverdueMinutes = Math.max(
    0,
    Math.floor((new Date(now).getTime() - new Date(nextRefreshDueAt).getTime()) / 60_000)
  );
  const recomputeOverdueMinutes = Math.max(
    0,
    Math.floor((new Date(now).getTime() - new Date(nextRecomputeDueAt).getTime()) / 60_000)
  );

  return {
    schedulerEnabled: runtimeState.schedulerEnabled,
    refreshIntervalMinutes: runtimeState.refreshIntervalMinutes,
    recomputeIntervalMinutes: runtimeState.recomputeIntervalMinutes,
    activeLock:
      runtimeState.activeLock &&
      new Date(runtimeState.activeLock.expiresAt).getTime() > new Date(now).getTime()
        ? runtimeState.activeLock
        : null,
    lastTickAt: runtimeState.lastTickAt,
    lastSuccessfulTickAt: runtimeState.lastSuccessfulTickAt,
    nextRefreshDueAt,
    nextRecomputeDueAt,
    refreshOverdueMinutes,
    recomputeOverdueMinutes,
    runCounts: {
      total: allRuns.length,
      success: allRuns.filter((entry) => entry.status === "success").length,
      skipped: allRuns.filter((entry) => entry.status === "skipped").length,
      failed: allRuns.filter((entry) => entry.status === "failed").length,
    },
    recentRuns,
  };
}

function buildCompetitionServiceAdminSnapshot(
  database: PilotDatabase,
  competitionId: string
) {
  const serviceState = getCompetitionServiceState(database, competitionId);
  const latestCloseEvents = getCompetitionCloseEvents(database, competitionId)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 10);

  return {
    health: serviceState.health,
    sizeMultiplier: serviceState.sizeMultiplier,
    positionSchema: serviceState.positionSchema,
    stream: {
      ...serviceState.stream,
      closeEventsStored: getCompetitionCloseEvents(database, competitionId).length,
    },
    latestCloseEvents,
  };
}

function buildPilotMetrics({
  rankings,
  participantCards,
  refreshRuns,
}: {
  rankings: ParticipantSnapshot[];
  participantCards: PilotDatabase["participantCards"];
  refreshRuns: RefreshRunRecord[];
}): CompetitionPilotMetrics {
  const totalScore = rankings.reduce((sum, participant) => sum + participant.score, 0);
  const averageScore = rankings.length > 0 ? totalScore / rankings.length : 0;
  const variance =
    rankings.length > 0
      ? rankings.reduce((sum, participant) => {
          return sum + (participant.score - averageScore) ** 2;
        }, 0) / rankings.length
      : 0;
  const topTenScore = rankings
    .slice(0, 10)
    .reduce((sum, participant) => sum + participant.score, 0);
  const completedCards = participantCards.filter((entry) => entry.status === "completed");
  const groupedCardStatuses = new Map<string, boolean[]>();

  for (const card of participantCards) {
    const key = `${card.participantId}:${card.dayKey}`;
    const current = groupedCardStatuses.get(key) ?? [];
    current.push(card.status === "completed");
    groupedCardStatuses.set(key, current);
  }

  const fullSetsCompleted = Array.from(groupedCardStatuses.values()).filter(
    (statuses) => statuses.length > 0 && statuses.every(Boolean)
  ).length;

  return {
    scoreDispersion: Math.sqrt(variance),
    topTenScoreSharePct: toPercent(topTenScore, totalScore),
    topParticipantScoreSharePct: toPercent(rankings[0]?.score ?? 0, totalScore),
    averageCardsCompletedPerParticipant:
      rankings.length > 0 ? completedCards.length / rankings.length : 0,
    fullSetCompletionRatePct: toPercent(fullSetsCompleted, groupedCardStatuses.size),
    failedIngestionRuns: refreshRuns.filter((entry) => entry.status === "failed").length,
    partialIngestionRuns: refreshRuns.filter((entry) => entry.status === "partial").length,
  };
}

export async function recomputeCompetitionState() {
  const recomputeResult = await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const recomputedAt = getSystemTimestamp();

    competition.referenceNow = getReferenceNow().toISOString();
    competition.lastRecomputedAt = recomputedAt;
    touchCompetition(competition);

    const cardSets = getCompetitionCardSets(database, competition);
    const participants = getCompetitionParticipants(database, competition.id);
    const manualAdjustments = getCompetitionManualAdjustments(database, competition.id);
    const serviceState = getCompetitionServiceState(database, competition.id);
    const closeEvents = getCompetitionCloseEvents(database, competition.id);
    const nextParticipantCards: PilotDatabase["participantCards"] = [];
    const nextLedgerEntries: PilotDatabase["scoreLedger"] = [];

    const rankings = sortParticipants(
      participants.map((participant) => {
        const positions = database.positions.filter(
          (position) => position.competitionId === competition.id && position.participantId === participant.id
        );
        const result = buildParticipantScoreResult({
          competition,
          participant,
          positions,
          dailyCardSets: cardSets,
          closeEvents: closeEvents.filter((entry) => entry.participantId === participant.id),
          sizeMultiplierCache: serviceState.sizeMultiplier,
        });
        const participantAdjustments = manualAdjustments.filter(
          (entry) => entry.participantId === participant.id && entry.status === "active"
        );
        const adjustmentEntries = buildManualAdjustmentLedgerEntries(
          participant,
          competition.id,
          participantAdjustments
        );
        const nextSnapshot = applyManualAdjustmentsToSnapshot(result.snapshot, adjustmentEntries);

        nextParticipantCards.push(...result.participantCards);
        nextLedgerEntries.push(...result.ledgerEntries, ...adjustmentEntries);
        return nextSnapshot;
      })
    );

    database.participantCards = [
      ...database.participantCards.filter((entry) => entry.competitionId !== competition.id),
      ...nextParticipantCards,
    ];
    database.scoreLedger = [
      ...database.scoreLedger.filter((entry) => entry.competitionId !== competition.id),
      ...nextLedgerEntries,
    ];

    const leaderboardSnapshot = buildCompetitionSnapshotRecord(competition, rankings);
    database.leaderboardSnapshots.push(leaderboardSnapshot);
    limitLeaderboardSnapshots(database, competition.id, 25);

    return {
      competition: { ...competition },
      leaderboardSnapshot,
    };
  });

  const database = await readDatabase();
  const marketPulse = await fetchMarketPulse().catch(() => null);

  return buildPublicSnapshot({
    database,
    competition: recomputeResult.competition,
    leaderboardSnapshot: recomputeResult.leaderboardSnapshot,
    marketPulse,
  });
}

export async function getCompetitionSnapshot(): Promise<CompetitionSnapshot> {
  const database = await readDatabase();
  const competition = getActiveCompetition(database);
  const latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);

  if (!latestSnapshot || latestSnapshot.referenceNow !== getReferenceNow().toISOString()) {
    return recomputeCompetitionState();
  }

  const marketPulse = await fetchMarketPulse().catch(() => null);

  return buildPublicSnapshot({
    database,
    competition,
    leaderboardSnapshot: latestSnapshot,
    marketPulse,
  });
}

export async function registerParticipant(wallet: string, label?: string) {
  const alreadyExists = await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const existing = database.participants.find(
      (participant) => participant.competitionId === competition.id && participant.wallet === wallet
    );

    if (existing) {
      return true;
    }

    database.participants.push({
      id: `participant:${wallet}`,
      competitionId: competition.id,
      wallet,
      label: label?.trim() || `Wallet ${wallet.slice(0, 4)}`,
      source: "live",
      status: "active",
      joinedAt: getReferenceNow().toISOString(),
      lastSyncedAt: null,
    });
    touchCompetition(competition);

    return false;
  });

  if (alreadyExists) {
    return getCompetitionSnapshot();
  }

  return refreshCompetitionState(wallet);
}

export async function refreshCompetitionState(targetWallet?: string) {
  const database = await readDatabase();
  const competition = getActiveCompetition(database);
  const startedAt = getSystemTimestamp();
  const targetParticipants = getCompetitionParticipants(database, competition.id).filter(
    (participant) =>
      participant.source === "live" && (targetWallet == null || participant.wallet === targetWallet)
  );

  let positionsUpserted = 0;
  let participantsSynced = 0;
  const errorMessages: string[] = [];

  for (const participant of targetParticipants) {
    try {
      const positions = await fetchPositions(participant.wallet);
      const positionRecords = buildPositionRecordsForParticipant(
        competition.id,
        participant,
        positions
      );

      replaceParticipantPositions(database, participant, positionRecords);
      participant.lastSyncedAt = getSystemTimestamp();
      positionsUpserted += positionRecords.length;
      participantsSynced += 1;
    } catch (error) {
      errorMessages.push(
        error instanceof Error
          ? `${participant.wallet}: ${error.message}`
          : `${participant.wallet}: refresh failed`
      );
    }
  }

  competition.lastRefreshedAt = getSystemTimestamp();
  touchCompetition(competition);

  const refreshRun: RefreshRunRecord = {
    id: `refresh-run:${competition.id}:${Date.now()}`,
    competitionId: competition.id,
    targetWallet: targetWallet ?? null,
    startedAt,
    finishedAt: getSystemTimestamp(),
    status:
      errorMessages.length === 0
        ? "success"
        : participantsSynced > 0
          ? "partial"
          : "failed",
    participantsSynced,
    positionsUpserted,
    errorMessages,
  };

  database.refreshRuns.push(refreshRun);
  limitRefreshRuns(database, competition.id, 25);
  await writeDatabase(database);

  return recomputeCompetitionState();
}

function buildPointsComposition(entries: ScoreLedgerEntry[]) {
  return {
    tradePoints: entries
      .filter((entry) => entry.metric === "score" && entry.sourceType === "trade")
      .reduce((sum, entry) => sum + entry.amount, 0),
    battlecardPoints: entries
      .filter(
        (entry) =>
          entry.metric === "score" &&
          (entry.sourceType === "battlecard" || entry.sourceType === "full_set_bonus")
      )
      .reduce((sum, entry) => sum + entry.amount, 0),
    streakPoints: entries
      .filter(
        (entry) =>
          entry.metric === "score" &&
          (entry.sourceType === "streak" || entry.sourceType === "perfect_week_bonus")
      )
      .reduce((sum, entry) => sum + entry.amount, 0),
    adjustmentPoints: entries
      .filter((entry) => entry.metric === "score" && entry.sourceType === "manual_adjustment")
      .reduce((sum, entry) => sum + entry.amount, 0),
    tickets: entries
      .filter((entry) => entry.metric === "ticket")
      .reduce((sum, entry) => sum + entry.amount, 0),
  };
}

export async function getCompetitionAdminSnapshot(): Promise<CompetitionAdminSnapshot> {
  await syncCompetitionServiceState().catch(() => null);

  let database = await readDatabase();
  let competition = getActiveCompetition(database);
  let latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);

  if (!latestSnapshot || latestSnapshot.referenceNow !== getReferenceNow().toISOString()) {
    await recomputeCompetitionState();
    database = await readDatabase();
    competition = getActiveCompetition(database);
    latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);
  }

  const participants = getCompetitionParticipants(database, competition.id);
  const ledgerEntries = getCompetitionLedger(database, competition.id);
  const cardCatalog = getBattlecardCatalog();
  const publishedCardSets = getAllCompetitionCardSets(database, competition.id);
  const participantCards = database.participantCards.filter(
    (entry) => entry.competitionId === competition.id
  );
  const reviewFlags = getCompetitionFlags(database, competition.id).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
  const manualAdjustments = getCompetitionManualAdjustments(database, competition.id).sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt)
  );
  const refreshRuns = database.refreshRuns
    .filter((run) => run.competitionId === competition.id)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      status: competition.status,
      dayKey: getDayKey(competition.referenceNow),
      startAt: competition.startAt,
      endAt: competition.endAt,
      referenceNow: competition.referenceNow,
      lastRefreshedAt: competition.lastRefreshedAt,
      lastRecomputedAt: competition.lastRecomputedAt,
    },
    counts: {
      participants: participants.length,
      liveParticipants: participants.filter((participant) => participant.source === "live").length,
      syntheticParticipants: participants.filter((participant) => participant.source === "synthetic")
        .length,
      positions: database.positions.filter((position) => position.competitionId === competition.id).length,
      closeEvents: getCompetitionCloseEvents(database, competition.id).length,
      publishedCardSets: publishedCardSets.length,
      participantCards: participantCards.length,
      completedParticipantCards: participantCards.filter((entry) => entry.status === "completed").length,
      scoreLedgerEntries: ledgerEntries.length,
      leaderboardSnapshots: database.leaderboardSnapshots.filter(
        (snapshot) => snapshot.competitionId === competition.id
      ).length,
      activeAdjustments: manualAdjustments.filter((entry) => entry.status === "active").length,
      openFlags: reviewFlags.filter((entry) => entry.status === "open").length,
      openDisputes: reviewFlags.filter(
        (entry) => entry.status === "open" && entry.category === "dispute"
      ).length,
    },
    pointsComposition: buildPointsComposition(ledgerEntries),
    analytics: buildPilotMetrics({
      rankings: latestSnapshot?.rankings ?? [],
      participantCards,
      refreshRuns,
    }),
    runtime: buildCompetitionRuntimeSnapshot(database, competition),
    competitionService: buildCompetitionServiceAdminSnapshot(database, competition.id),
    cardCatalog,
    publishedCardSets,
    reviewQueue: reviewFlags.filter((entry) => entry.status === "open").slice(0, 10),
    recentAdjustments: manualAdjustments.slice(0, 10),
    latestLeaderboard: latestSnapshot?.rankings.slice(0, 10) ?? [],
    refreshRuns: refreshRuns.slice(0, 10),
  };
}

export async function getCompetitionParticipantDetail(
  wallet: string
): Promise<CompetitionParticipantDetail | null> {
  let database = await readDatabase();
  let competition = getActiveCompetition(database);
  let latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);

  if (!latestSnapshot || latestSnapshot.referenceNow !== getReferenceNow().toISOString()) {
    await recomputeCompetitionState();
    database = await readDatabase();
    competition = getActiveCompetition(database);
    latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);
  }

  const participant = getCompetitionParticipants(database, competition.id).find(
    (entry) => entry.wallet === wallet
  );

  if (!participant) {
    return null;
  }

  return buildCompetitionParticipantDetail(database, competition, participant, latestSnapshot);
}

export async function getCompetitionParticipantAdminDetail(
  wallet: string
): Promise<CompetitionParticipantAdminDetail | null> {
  let database = await readDatabase();
  let competition = getActiveCompetition(database);
  let latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);

  if (!latestSnapshot || latestSnapshot.referenceNow !== getReferenceNow().toISOString()) {
    await recomputeCompetitionState();
    database = await readDatabase();
    competition = getActiveCompetition(database);
    latestSnapshot = getLatestLeaderboardSnapshot(database, competition.id);
  }

  const participant = getCompetitionParticipants(database, competition.id).find(
    (entry) => entry.wallet === wallet
  );

  if (!participant) {
    return null;
  }

  return {
    ...buildCompetitionParticipantDetail(database, competition, participant, latestSnapshot),
    flags: getCompetitionFlags(database, competition.id)
      .filter((entry) => entry.participantId === participant.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    adjustments: getCompetitionManualAdjustments(database, competition.id)
      .filter((entry) => entry.participantId === participant.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}
