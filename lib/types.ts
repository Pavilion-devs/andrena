export type ParticipantSource = "synthetic" | "live";
export type CompetitionStatus = "draft" | "active" | "completed";
export type ParticipantStatus = "active" | "paused" | "flagged";
export type ParticipantCardStatus = "pending" | "completed";
export type LedgerMetric = "score" | "ticket";
export type RefreshRunStatus = "success" | "partial" | "failed";
export type RuntimeTrigger = "manual" | "scheduler";
export type RuntimeJobStatus = "success" | "skipped" | "failed";
export type RuntimeActionType = "refresh_live_wallets" | "recompute_leaderboard";
export type PublishedCardSetOrigin = "generated" | "manual";
export type AdminAdjustmentStatus = "active" | "voided";
export type ReviewCategory = "abuse" | "dispute" | "scoring" | "data_quality";
export type ReviewSeverity = "low" | "medium" | "high";
export type ReviewStatus = "open" | "resolved";
export type CompetitionServiceHealthStatus =
  | "healthy"
  | "degraded"
  | "unreachable"
  | "unknown";

export interface AdrenaPosition {
  position_id: number;
  symbol: string;
  side: "long" | "short";
  status: string;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  entry_leverage: number | null;
  entry_date: string;
  exit_date: string | null;
  fees: number | null;
  borrow_fees: number | null;
  closed_by_sl_tp: boolean;
  volume: number;
  duration: number;
  pnl_volume_ratio: number;
  source: ParticipantSource;
}

export interface LegacyParticipantRecord {
  wallet: string;
  label: string;
  source: ParticipantSource;
  joinedAt: string;
  lastSyncedAt: string | null;
  positions: AdrenaPosition[];
}

export interface CompetitionStateFile {
  version: number;
  lastRefreshedAt: string | null;
  participants: LegacyParticipantRecord[];
}

export type QuoteKind =
  | "open-long"
  | "open-short"
  | "open-limit-long"
  | "open-limit-short";

export type QuoteRequestMode = "live" | "simulated";

export interface CompetitionConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  startAt: string;
  endAt: string;
  referenceNow: string;
  minTradeVolumeUsd: number;
  fullSetBonus: number;
  dailyVolumeBands: Array<{
    upTo: number;
    multiplier: number;
  }>;
}

export type BattlecardRule =
  | {
      type: "profit_trade";
      symbols?: string[];
      minVolumeUsd?: number;
      minPnlVolumeRatio?: number;
      minimumCount?: number;
    }
  | {
      type: "min_duration_trade";
      minDurationSeconds: number;
      symbols?: string[];
    }
  | {
      type: "sl_tp_close";
      symbols?: string[];
    }
  | {
      type: "long_and_short_same_day";
    }
  | {
      type: "market_focus";
      symbols: string[];
      minVolumeUsd?: number;
    }
  | {
      type: "leverage_band";
      minLeverage: number;
      maxLeverage: number;
      symbols?: string[];
    };

export interface BattlecardTemplate {
  id: string;
  category: "performance" | "discipline" | "style" | "market";
  difficulty: "easy" | "medium" | "hard";
  points: number;
  title: string;
  description: string;
  rule: BattlecardRule;
}

export interface DailyBattlecardSet {
  dayKey: string;
  cards: BattlecardTemplate[];
  fullSetBonus: number;
}

export interface CompetitionRecord {
  id: string;
  name: string;
  tagline: string;
  description: string;
  startAt: string;
  endAt: string;
  referenceNow: string;
  status: CompetitionStatus;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt: string | null;
  lastRecomputedAt: string | null;
  configSnapshot: CompetitionConfig;
}

export interface ParticipantRecord {
  id: string;
  competitionId: string;
  wallet: string;
  label: string;
  source: ParticipantSource;
  status: ParticipantStatus;
  joinedAt: string;
  lastSyncedAt: string | null;
}

export interface ParticipantScoringInput extends ParticipantRecord {
  positions: AdrenaPosition[];
}

export interface PositionRecord extends AdrenaPosition {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  ingestedAt: string;
  updatedAt: string;
  rawPayload: Record<string, unknown> | null;
}

export interface PublishedDailyCardSet extends DailyBattlecardSet {
  id: string;
  competitionId: string;
  publishedAt: string;
  updatedAt: string;
  origin: PublishedCardSetOrigin;
  operatorNote: string | null;
}

export interface ScoredTrade {
  positionId: number;
  symbol: string;
  side: "long" | "short";
  exitDate: string;
  exitDayKey: string;
  volume: number;
  scoringSizeUsd: number;
  effectiveVolume: number;
  sizeMultiplier: number;
  multiplierTierMinSize: number | null;
  multiplierTierMaxSize: number | null;
  duration: number;
  pnl: number | null;
  pnlVolumeRatio: number;
  tradePoints: number;
  closedBySlTp: boolean;
  closeEventSignature: string | null;
  evidenceSource: "position" | "close_event";
  breakdown: {
    size: number;
    quality: number;
    duration: number;
    discipline: number;
    liquidationPenalty: number;
  };
}

export interface CardStatus {
  id: string;
  title: string;
  description: string;
  category: BattlecardTemplate["category"];
  points: number;
  difficulty: BattlecardTemplate["difficulty"];
  completed: boolean;
}

export interface ParticipantCardRecord {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  dayKey: string;
  cardId: string;
  title: string;
  description: string;
  category: BattlecardTemplate["category"];
  difficulty: BattlecardTemplate["difficulty"];
  points: number;
  status: ParticipantCardStatus;
  completedAt: string | null;
  evidencePositionIds: number[];
}

export type ScoreLedgerSourceType =
  | "trade"
  | "battlecard"
  | "full_set_bonus"
  | "daily_trade_ticket"
  | "card_ticket"
  | "full_set_ticket"
  | "streak"
  | "manual_adjustment"
  | "perfect_week_bonus"
  | "perfect_week_ticket";

export interface ScoreLedgerEntry {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  metric: LedgerMetric;
  sourceType: ScoreLedgerSourceType;
  sourceRef: string;
  dayKey: string;
  amount: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AdminManualAdjustmentRecord {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  metric: LedgerMetric;
  amount: number;
  reason: string;
  note: string | null;
  dayKey: string;
  status: AdminAdjustmentStatus;
  createdAt: string;
  updatedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface AdminFlagRecord {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  status: ReviewStatus;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface ParticipantSnapshot {
  wallet: string;
  label: string;
  source: ParticipantSource;
  joinedAt: string;
  lastSyncedAt: string | null;
  rank: number;
  score: number;
  tradePoints: number;
  battlecardPoints: number;
  streakPoints: number;
  adjustmentPoints: number;
  streakDays: number;
  raffleTickets: number;
  adjustmentTickets: number;
  fullSetsCompleted: number;
  todayCardsCompleted: number;
  totalEligibleVolume: number;
  totalEligiblePnl: number;
  eligibleTrades: number;
  todayCardStatuses: CardStatus[];
  scoredTrades: ScoredTrade[];
}

export interface LeaderboardSummary {
  totalScore: number;
  totalEligibleVolume: number;
  totalTrades: number;
  totalTickets: number;
}

export interface LeaderboardSnapshotRecord {
  id: string;
  competitionId: string;
  capturedAt: string;
  referenceNow: string;
  rankings: ParticipantSnapshot[];
  summary: LeaderboardSummary;
}

export interface RefreshRunRecord {
  id: string;
  competitionId: string;
  targetWallet: string | null;
  startedAt: string;
  finishedAt: string;
  status: RefreshRunStatus;
  participantsSynced: number;
  positionsUpserted: number;
  errorMessages: string[];
}

export interface RuntimeLockRecord {
  id: string;
  owner: string;
  lockedAt: string;
  expiresAt: string;
}

export interface CompetitionRuntimeState {
  competitionId: string;
  schedulerEnabled: boolean;
  refreshIntervalMinutes: number;
  recomputeIntervalMinutes: number;
  lockTtlSeconds: number;
  maxJobRuns: number;
  activeLock: RuntimeLockRecord | null;
  lastTickAt: string | null;
  lastSuccessfulTickAt: string | null;
  updatedAt: string;
}

export interface RuntimeJobRunRecord {
  id: string;
  competitionId: string;
  trigger: RuntimeTrigger;
  startedAt: string;
  finishedAt: string;
  status: RuntimeJobStatus;
  dueActions: RuntimeActionType[];
  executedActions: RuntimeActionType[];
  skippedReason: string | null;
  errorMessage: string | null;
  refreshRunId: string | null;
  leaderboardSnapshotId: string | null;
}

export interface CompetitionServiceHealthSnapshot {
  checkedAt: string | null;
  status: CompetitionServiceHealthStatus;
  responseTimeMs: number | null;
  serviceTimestamp: number | null;
  errorMessage: string | null;
}

export interface CompetitionServiceSizeMultiplierTier {
  minSize: number;
  maxSize: number;
  multiplierMin: number;
  multiplierMax: number;
}

export interface CompetitionServiceSizeMultiplierCache {
  syncedAt: string | null;
  source: "live" | "fallback";
  interpolation: string;
  formula: string;
  notes: string[];
  tiers: CompetitionServiceSizeMultiplierTier[];
}

export interface CompetitionServicePositionSchemaSnapshot {
  syncedAt: string | null;
  programId: string | null;
  accountSizeBytes: number | null;
  closeInstructions: string[];
  pdaSeeds: string[];
  fieldCount: number;
}

export type CompetitionServiceStreamConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface CompetitionServiceStreamState {
  enabled: boolean;
  connectionStatus: CompetitionServiceStreamConnectionStatus;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  reconnectAttempts: number;
  lastEventAt: string | null;
  lastCloseEventAt: string | null;
  lastSignature: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface CompetitionServiceStateRecord {
  competitionId: string;
  health: CompetitionServiceHealthSnapshot;
  sizeMultiplier: CompetitionServiceSizeMultiplierCache;
  positionSchema: CompetitionServicePositionSchemaSnapshot;
  stream: CompetitionServiceStreamState;
}

export interface CompetitionServiceCloseEventRecord {
  id: string;
  competitionId: string;
  participantId: string;
  wallet: string;
  positionPda: string;
  positionId: number;
  signature: string;
  slot: string;
  custodyMint: string;
  side: "long" | "short";
  sizeUsd: number;
  priceUsd: number;
  collateralAmountUsd: number;
  profitUsd: number;
  lossUsd: number;
  netPnlUsd: number;
  borrowFeeUsd: number;
  exitFeeUsd: number;
  percentageClosedPct: number;
  timestamp: string;
  raw: Record<string, unknown>;
  decoded: Record<string, unknown>;
}

export interface CompetitionServiceAdminSnapshot {
  health: CompetitionServiceHealthSnapshot;
  sizeMultiplier: CompetitionServiceSizeMultiplierCache;
  positionSchema: CompetitionServicePositionSchemaSnapshot;
  stream: CompetitionServiceStreamState & {
    closeEventsStored: number;
  };
  latestCloseEvents: CompetitionServiceCloseEventRecord[];
}

export interface CompetitionRuntimeSnapshot {
  schedulerEnabled: boolean;
  refreshIntervalMinutes: number;
  recomputeIntervalMinutes: number;
  activeLock: RuntimeLockRecord | null;
  lastTickAt: string | null;
  lastSuccessfulTickAt: string | null;
  nextRefreshDueAt: string | null;
  nextRecomputeDueAt: string | null;
  refreshOverdueMinutes: number;
  recomputeOverdueMinutes: number;
  runCounts: {
    total: number;
    success: number;
    skipped: number;
    failed: number;
  };
  recentRuns: RuntimeJobRunRecord[];
}

export interface CompetitionPilotMetrics {
  scoreDispersion: number;
  topTenScoreSharePct: number;
  topParticipantScoreSharePct: number;
  averageCardsCompletedPerParticipant: number;
  fullSetCompletionRatePct: number;
  failedIngestionRuns: number;
  partialIngestionRuns: number;
}

export interface PilotDatabase {
  version: number;
  competitions: CompetitionRecord[];
  participants: ParticipantRecord[];
  positions: PositionRecord[];
  dailyCardSets: PublishedDailyCardSet[];
  participantCards: ParticipantCardRecord[];
  scoreLedger: ScoreLedgerEntry[];
  manualAdjustments: AdminManualAdjustmentRecord[];
  reviewFlags: AdminFlagRecord[];
  leaderboardSnapshots: LeaderboardSnapshotRecord[];
  refreshRuns: RefreshRunRecord[];
  runtimeStates: CompetitionRuntimeState[];
  runtimeJobRuns: RuntimeJobRunRecord[];
  competitionServiceStates: CompetitionServiceStateRecord[];
  closeEvents: CompetitionServiceCloseEventRecord[];
}

export interface ParticipantScoreResult {
  snapshot: ParticipantSnapshot;
  participantCards: ParticipantCardRecord[];
  ledgerEntries: ScoreLedgerEntry[];
}

export interface MarketPulse {
  poolName: string;
  dailyVolumeUsd: number | null;
  dailyFeesUsd: number | null;
  topCustodySymbol: string | null;
  topCustodyUtilizationPct: number | null;
}

export interface CompetitionSnapshot {
  competition: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    startAt: string;
    endAt: string;
    referenceNow: string;
    dayKey: string;
    participantCount: number;
    lastRefreshedAt: string | null;
    lastRecomputedAt: string | null;
  };
  notes: string[];
  marketPulse: MarketPulse | null;
  summary: LeaderboardSummary;
  dailyBattlecards: DailyBattlecardSet;
  leaderboard: ParticipantSnapshot[];
}

export interface CompetitionAdminSnapshot {
  competition: {
    id: string;
    name: string;
    status: CompetitionStatus;
    dayKey: string;
    startAt: string;
    endAt: string;
    referenceNow: string;
    lastRefreshedAt: string | null;
    lastRecomputedAt: string | null;
  };
  counts: {
    participants: number;
    liveParticipants: number;
    syntheticParticipants: number;
    positions: number;
    closeEvents: number;
    publishedCardSets: number;
    participantCards: number;
    completedParticipantCards: number;
    scoreLedgerEntries: number;
    leaderboardSnapshots: number;
    activeAdjustments: number;
    openFlags: number;
    openDisputes: number;
  };
  pointsComposition: {
    tradePoints: number;
    battlecardPoints: number;
    streakPoints: number;
    adjustmentPoints: number;
    tickets: number;
  };
  analytics: CompetitionPilotMetrics;
  runtime: CompetitionRuntimeSnapshot;
  competitionService: CompetitionServiceAdminSnapshot;
  cardCatalog: BattlecardTemplate[];
  publishedCardSets: PublishedDailyCardSet[];
  reviewQueue: AdminFlagRecord[];
  recentAdjustments: AdminManualAdjustmentRecord[];
  latestLeaderboard: ParticipantSnapshot[];
  refreshRuns: RefreshRunRecord[];
}

export interface CompetitionParticipantAdminDetail {
  participant: ParticipantRecord;
  snapshot: ParticipantSnapshot | null;
  positions: PositionRecord[];
  closeEvents: CompetitionServiceCloseEventRecord[];
  cards: ParticipantCardRecord[];
  ledger: ScoreLedgerEntry[];
  flags: AdminFlagRecord[];
  adjustments: AdminManualAdjustmentRecord[];
}

export interface CompetitionParticipantDetail {
  participant: ParticipantRecord;
  snapshot: ParticipantSnapshot | null;
  positions: PositionRecord[];
  closeEvents: CompetitionServiceCloseEventRecord[];
  cards: ParticipantCardRecord[];
  ledger: ScoreLedgerEntry[];
}
