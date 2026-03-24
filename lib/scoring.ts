import {
  getCompetitionServiceMultiplierCacheForScoring,
  getSizeMultiplierDetails,
} from "@/lib/adrena-competition-service";
import { competitionConfig, getBattlecardSetsUntilReference, getDayKey, getReferenceNow } from "@/lib/config";
import type {
  AdrenaPosition,
  BattlecardRule,
  CardStatus,
  CompetitionServiceCloseEventRecord,
  CompetitionServiceSizeMultiplierCache,
  CompetitionRecord,
  ParticipantCardRecord,
  ParticipantRecord,
  ParticipantScoreResult,
  ParticipantScoringInput,
  ParticipantSnapshot,
  PublishedDailyCardSet,
  ScoreLedgerEntry,
  ScoredTrade,
  ScoreLedgerSourceType,
} from "@/lib/types";

interface EvaluatedCardStatus extends CardStatus {
  evidencePositionIds: number[];
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function symbolsMatch(positionSymbol: string, allowedSymbols?: string[]) {
  if (!allowedSymbols || allowedSymbols.length === 0) {
    return true;
  }

  const normalizedPosition = normalizeSymbol(positionSymbol);

  return allowedSymbols.some((symbol) => {
    const normalizedAllowed = normalizeSymbol(symbol);

    if (normalizedAllowed === normalizedPosition) {
      return true;
    }

    if (normalizedAllowed === "BTC" && normalizedPosition === "WBTC") {
      return true;
    }

    return normalizedAllowed === "WBTC" && normalizedPosition === "BTC";
  });
}

function isEligiblePosition(
  position: AdrenaPosition,
  participant: ParticipantRecord,
  competition: CompetitionRecord
) {
  if (!position.exit_date) {
    return false;
  }

  const joinedAt = new Date(participant.joinedAt);
  const entryDate = new Date(position.entry_date);
  const exitDate = new Date(position.exit_date);
  const startAt = new Date(competition.startAt);
  const endAt = new Date(competition.endAt);

  if (entryDate < joinedAt) {
    return false;
  }

  if (entryDate < startAt || exitDate > endAt) {
    return false;
  }

  if (position.volume < competition.configSnapshot.minTradeVolumeUsd) {
    return false;
  }

  const normalizedStatus = position.status.toLowerCase();
  return normalizedStatus.includes("close") || normalizedStatus.includes("liquid");
}

function getEffectiveVolume(
  rawVolume: number,
  usedRawVolume: number,
  dailyVolumeBands: CompetitionRecord["configSnapshot"]["dailyVolumeBands"]
) {
  let remaining = rawVolume;
  let effectiveVolume = 0;
  let currentUsed = usedRawVolume;
  let previousBandLimit = 0;

  for (const band of dailyVolumeBands) {
    if (remaining <= 0) {
      break;
    }

    const bandStart = Math.max(previousBandLimit, currentUsed);
    const bandCapacity = Math.max(0, band.upTo - bandStart);
    const allocated = Math.min(remaining, bandCapacity);

    effectiveVolume += allocated * band.multiplier;
    remaining -= allocated;
    currentUsed += allocated;
    previousBandLimit = band.upTo;
  }

  return effectiveVolume;
}

function getDurationPoints(durationSeconds: number) {
  if (durationSeconds < 120) {
    return 0;
  }

  if (durationSeconds < 600) {
    return 1;
  }

  if (durationSeconds < 1800) {
    return 2;
  }

  if (durationSeconds < 14400) {
    return 3;
  }

  return 4;
}

function scorePosition({
  position,
  effectiveVolume,
  scoringSizeUsd,
  sizeMultiplier,
  multiplierTierMinSize,
  multiplierTierMaxSize,
  closeEventSignature,
  evidenceSource,
}: {
  position: AdrenaPosition;
  effectiveVolume: number;
  scoringSizeUsd: number;
  sizeMultiplier: number;
  multiplierTierMinSize: number | null;
  multiplierTierMaxSize: number | null;
  closeEventSignature: string | null;
  evidenceSource: "position" | "close_event";
}): ScoredTrade {
  const scaledEffectiveVolume = effectiveVolume * Math.max(sizeMultiplier, 0);
  const size = Math.min(8, Math.sqrt(Math.max(scaledEffectiveVolume, 0) / 500));
  const quality = clamp(position.pnl_volume_ratio * 4, -8, 16);
  const duration = getDurationPoints(position.duration);
  const discipline = position.closed_by_sl_tp ? 2 : 0;
  const liquidationPenalty = position.status.toLowerCase().includes("liquid") ? 5 : 0;

  return {
    positionId: position.position_id,
    symbol: position.symbol,
    side: position.side,
    exitDate: position.exit_date ?? position.entry_date,
    exitDayKey: getDayKey(position.exit_date ?? position.entry_date),
    volume: position.volume,
    scoringSizeUsd,
    effectiveVolume: scaledEffectiveVolume,
    sizeMultiplier,
    multiplierTierMinSize,
    multiplierTierMaxSize,
    duration: position.duration,
    pnl: position.pnl,
    pnlVolumeRatio: position.pnl_volume_ratio,
    tradePoints: clamp(size + quality + duration + discipline - liquidationPenalty, 0, 25),
    closedBySlTp: position.closed_by_sl_tp,
    closeEventSignature,
    evidenceSource,
    breakdown: {
      size,
      quality,
      duration,
      discipline,
      liquidationPenalty,
    },
  };
}

function getMatchingTrades(rule: BattlecardRule, dayTrades: ScoredTrade[]) {
  switch (rule.type) {
    case "profit_trade":
      return dayTrades.filter((trade) => {
        if (!symbolsMatch(trade.symbol, rule.symbols)) {
          return false;
        }

        if (rule.minVolumeUsd && trade.volume < rule.minVolumeUsd) {
          return false;
        }

        if (rule.minPnlVolumeRatio != null && trade.pnlVolumeRatio < rule.minPnlVolumeRatio) {
          return false;
        }

        return true;
      });

    case "min_duration_trade":
      return dayTrades.filter(
        (trade) =>
          symbolsMatch(trade.symbol, rule.symbols) && trade.duration >= rule.minDurationSeconds
      );

    case "sl_tp_close":
      return dayTrades.filter(
        (trade) => trade.closedBySlTp && symbolsMatch(trade.symbol, rule.symbols)
      );

    case "market_focus":
      return dayTrades.filter(
        (trade) =>
          symbolsMatch(trade.symbol, rule.symbols) &&
          (rule.minVolumeUsd == null || trade.volume >= rule.minVolumeUsd)
      );

    case "long_and_short_same_day":
    case "leverage_band":
      return [];
  }
}

function evaluateRule(
  rule: BattlecardRule,
  dayTrades: ScoredTrade[],
  leverageIndex: Map<number, number | null>
) {
  switch (rule.type) {
    case "profit_trade": {
      const matches = getMatchingTrades(rule, dayTrades);
      const minimumCount = rule.minimumCount ?? 1;

      return {
        completed: matches.length >= minimumCount,
        evidencePositionIds: matches.slice(0, minimumCount).map((trade) => trade.positionId),
      };
    }

    case "min_duration_trade":
    case "sl_tp_close":
    case "market_focus": {
      const match = getMatchingTrades(rule, dayTrades)[0];
      return {
        completed: Boolean(match),
        evidencePositionIds: match ? [match.positionId] : [],
      };
    }

    case "long_and_short_same_day": {
      const longTrade = dayTrades.find((trade) => trade.side === "long");
      const shortTrade = dayTrades.find((trade) => trade.side === "short");

      return {
        completed: Boolean(longTrade && shortTrade),
        evidencePositionIds: [longTrade?.positionId, shortTrade?.positionId].filter(
          (value): value is number => value != null
        ),
      };
    }

    case "leverage_band": {
      const matchingTrade = dayTrades.find((trade) => {
        if (!symbolsMatch(trade.symbol, rule.symbols)) {
          return false;
        }

        const leverage = leverageIndex.get(trade.positionId) ?? null;
        return leverage != null && leverage >= rule.minLeverage && leverage <= rule.maxLeverage;
      });

      return {
        completed: Boolean(matchingTrade),
        evidencePositionIds: matchingTrade ? [matchingTrade.positionId] : [],
      };
    }
  }
}

function evaluateCardStatuses(
  participant: ParticipantRecord,
  competition: CompetitionRecord,
  cardSet: PublishedDailyCardSet,
  dayTrades: ScoredTrade[],
  leverageIndex: Map<number, number | null>
) {
  return cardSet.cards.map((card): { status: EvaluatedCardStatus; record: ParticipantCardRecord } => {
    const evaluation = evaluateRule(card.rule, dayTrades, leverageIndex);

    const status: EvaluatedCardStatus = {
      id: card.id,
      title: card.title,
      description: card.description,
      category: card.category,
      points: card.points,
      difficulty: card.difficulty,
      completed: evaluation.completed,
      evidencePositionIds: evaluation.evidencePositionIds,
    };

    return {
      status,
      record: {
        id: `participant-card:${participant.id}:${cardSet.dayKey}:${card.id}`,
        competitionId: competition.id,
        participantId: participant.id,
        wallet: participant.wallet,
        dayKey: cardSet.dayKey,
        cardId: card.id,
        title: card.title,
        description: card.description,
        category: card.category,
        difficulty: card.difficulty,
        points: card.points,
        status: evaluation.completed ? "completed" : "pending",
        completedAt: evaluation.completed ? `${cardSet.dayKey}T23:59:59.000Z` : null,
        evidencePositionIds: evaluation.evidencePositionIds,
      },
    };
  });
}

function createLedgerEntry({
  competitionId,
  participant,
  metric,
  sourceType,
  sourceRef,
  dayKey,
  amount,
  metadata,
}: {
  competitionId: string;
  participant: ParticipantRecord;
  metric: ScoreLedgerEntry["metric"];
  sourceType: ScoreLedgerSourceType;
  sourceRef: string;
  dayKey: string;
  amount: number;
  metadata: Record<string, unknown>;
}): ScoreLedgerEntry {
  return {
    id: `ledger:${competitionId}:${participant.id}:${metric}:${sourceType}:${sourceRef}`,
    competitionId,
    participantId: participant.id,
    wallet: participant.wallet,
    metric,
    sourceType,
    sourceRef,
    dayKey,
    amount,
    createdAt: `${dayKey}T23:59:59.000Z`,
    metadata,
  };
}

function sumLedger(
  entries: ScoreLedgerEntry[],
  predicate: (entry: ScoreLedgerEntry) => boolean
) {
  return entries.reduce((total, entry) => (predicate(entry) ? total + entry.amount : total), 0);
}

function computeStreakEntries(
  competition: CompetitionRecord,
  participant: ParticipantRecord,
  orderedDayKeys: string[],
  activityDays: Set<string>
) {
  let rollingStreak = 0;
  let currentStreak = 0;
  const entries: ScoreLedgerEntry[] = [];

  for (const dayKey of orderedDayKeys) {
    if (activityDays.has(dayKey)) {
      rollingStreak += 1;
      currentStreak = rollingStreak;

      if (rollingStreak > 1) {
        entries.push(
          createLedgerEntry({
            competitionId: competition.id,
            participant,
            metric: "score",
            sourceType: "streak",
            sourceRef: `streak:${dayKey}`,
            dayKey,
            amount: 2,
            metadata: { streakLength: rollingStreak },
          })
        );
      }
    } else {
      rollingStreak = 0;
      currentStreak = 0;
    }
  }

  const perfectWeek =
    orderedDayKeys.length > 0 && orderedDayKeys.every((dayKey) => activityDays.has(dayKey));

  if (perfectWeek) {
    const finalDay = orderedDayKeys[orderedDayKeys.length - 1];

    entries.push(
      createLedgerEntry({
        competitionId: competition.id,
        participant,
        metric: "score",
        sourceType: "perfect_week_bonus",
        sourceRef: "perfect-week",
        dayKey: finalDay,
        amount: 10,
        metadata: { days: orderedDayKeys.length },
      })
    );
    entries.push(
      createLedgerEntry({
        competitionId: competition.id,
        participant,
        metric: "ticket",
        sourceType: "perfect_week_ticket",
        sourceRef: "perfect-week",
        dayKey: finalDay,
        amount: 3,
        metadata: { days: orderedDayKeys.length },
      })
    );
  }

  return {
    currentStreak,
    perfectWeek,
    entries,
  };
}

export function buildParticipantScoreResult({
  competition,
  participant,
  positions,
  dailyCardSets,
  closeEvents = [],
  sizeMultiplierCache,
}: {
  competition: CompetitionRecord;
  participant: ParticipantRecord;
  positions: AdrenaPosition[];
  dailyCardSets: PublishedDailyCardSet[];
  closeEvents?: CompetitionServiceCloseEventRecord[];
  sizeMultiplierCache?: CompetitionServiceSizeMultiplierCache | null;
}): ParticipantScoreResult {
  const eligiblePositions = positions
    .filter((position) => isEligiblePosition(position, participant, competition))
    .sort((left, right) => {
      const leftDate = new Date(left.exit_date ?? left.entry_date).getTime();
      const rightDate = new Date(right.exit_date ?? right.entry_date).getTime();
      return leftDate - rightDate;
    });

  const usedRawVolumeByDay = new Map<string, number>();
  const leverageIndex = new Map<number, number | null>();
  const sizeMultiplierConfig =
    getCompetitionServiceMultiplierCacheForScoring(sizeMultiplierCache);
  const closeEventsByPositionId = new Map<number, CompetitionServiceCloseEventRecord>();

  for (const closeEvent of [...closeEvents].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  )) {
    closeEventsByPositionId.set(closeEvent.positionId, closeEvent);
  }

  const scoredTrades = eligiblePositions.map((position) => {
    const dayKey = getDayKey(position.exit_date ?? position.entry_date);
    const usedRawVolume = usedRawVolumeByDay.get(dayKey) ?? 0;
    const closeEvent = closeEventsByPositionId.get(position.position_id) ?? null;
    const scoringSizeUsd = closeEvent?.sizeUsd ?? position.volume;
    const effectiveVolume = getEffectiveVolume(
      scoringSizeUsd,
      usedRawVolume,
      competition.configSnapshot.dailyVolumeBands
    );
    const multiplierDetails = getSizeMultiplierDetails(
      scoringSizeUsd,
      sizeMultiplierConfig
    );

    usedRawVolumeByDay.set(dayKey, usedRawVolume + scoringSizeUsd);
    leverageIndex.set(position.position_id, position.entry_leverage);

    return scorePosition({
      position,
      effectiveVolume,
      scoringSizeUsd,
      sizeMultiplier: multiplierDetails.multiplier,
      multiplierTierMinSize: multiplierDetails.tier?.minSize ?? null,
      multiplierTierMaxSize: multiplierDetails.tier?.maxSize ?? null,
      closeEventSignature: closeEvent?.signature ?? null,
      evidenceSource: closeEvent ? "close_event" : "position",
    });
  });

  const orderedCardSets = [...dailyCardSets].sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  const todayKey = getDayKey(competition.referenceNow);
  const ledgerEntries: ScoreLedgerEntry[] = [];
  const participantCards: ParticipantCardRecord[] = [];
  const activityDays = new Set<string>();
  let fullSetsCompleted = 0;
  let todayCardStatuses: CardStatus[] = [];

  for (const trade of scoredTrades) {
    ledgerEntries.push(
      createLedgerEntry({
        competitionId: competition.id,
        participant,
        metric: "score",
        sourceType: "trade",
        sourceRef: `position:${trade.positionId}`,
        dayKey: trade.exitDayKey,
        amount: trade.tradePoints,
          metadata: {
            positionId: trade.positionId,
            symbol: trade.symbol,
            side: trade.side,
            volume: trade.volume,
            scoringSizeUsd: trade.scoringSizeUsd,
            effectiveVolume: trade.effectiveVolume,
            sizeMultiplier: trade.sizeMultiplier,
            multiplierTierMinSize: trade.multiplierTierMinSize,
            multiplierTierMaxSize: trade.multiplierTierMaxSize,
            evidenceSource: trade.evidenceSource,
            closeEventSignature: trade.closeEventSignature,
            pnl: trade.pnl,
            pnlVolumeRatio: trade.pnlVolumeRatio,
            breakdown: trade.breakdown,
          },
        })
    );

    activityDays.add(trade.exitDayKey);
  }

  for (const cardSet of orderedCardSets) {
    const dayTrades = scoredTrades.filter((trade) => trade.exitDayKey === cardSet.dayKey);
    const evaluations = evaluateCardStatuses(participant, competition, cardSet, dayTrades, leverageIndex);
    const completedCards = evaluations.filter((evaluation) => evaluation.status.completed);

    participantCards.push(...evaluations.map((evaluation) => evaluation.record));

    if (dayTrades.length > 0) {
      activityDays.add(cardSet.dayKey);
      ledgerEntries.push(
        createLedgerEntry({
          competitionId: competition.id,
          participant,
          metric: "ticket",
          sourceType: "daily_trade_ticket",
          sourceRef: `daily-trade:${cardSet.dayKey}`,
          dayKey: cardSet.dayKey,
          amount: 1,
          metadata: { eligibleTrades: dayTrades.length },
        })
      );
    }

    for (const completedCard of completedCards) {
      activityDays.add(cardSet.dayKey);
      ledgerEntries.push(
        createLedgerEntry({
          competitionId: competition.id,
          participant,
          metric: "score",
          sourceType: "battlecard",
          sourceRef: `battlecard:${cardSet.dayKey}:${completedCard.status.id}`,
          dayKey: cardSet.dayKey,
          amount: completedCard.status.points,
          metadata: {
            cardId: completedCard.status.id,
            title: completedCard.status.title,
            category: completedCard.status.category,
            difficulty: completedCard.status.difficulty,
            evidencePositionIds: completedCard.status.evidencePositionIds,
          },
        })
      );
      ledgerEntries.push(
        createLedgerEntry({
          competitionId: competition.id,
          participant,
          metric: "ticket",
          sourceType: "card_ticket",
          sourceRef: `battlecard-ticket:${cardSet.dayKey}:${completedCard.status.id}`,
          dayKey: cardSet.dayKey,
          amount: 1,
          metadata: {
            cardId: completedCard.status.id,
            evidencePositionIds: completedCard.status.evidencePositionIds,
          },
        })
      );
    }

    if (completedCards.length === evaluations.length && evaluations.length > 0) {
      fullSetsCompleted += 1;
      ledgerEntries.push(
        createLedgerEntry({
          competitionId: competition.id,
          participant,
          metric: "score",
          sourceType: "full_set_bonus",
          sourceRef: `full-set:${cardSet.dayKey}`,
          dayKey: cardSet.dayKey,
          amount: cardSet.fullSetBonus,
          metadata: {
            cardsCompleted: completedCards.length,
            fullSetBonus: cardSet.fullSetBonus,
          },
        })
      );
      ledgerEntries.push(
        createLedgerEntry({
          competitionId: competition.id,
          participant,
          metric: "ticket",
          sourceType: "full_set_ticket",
          sourceRef: `full-set-ticket:${cardSet.dayKey}`,
          dayKey: cardSet.dayKey,
          amount: 2,
          metadata: {
            cardsCompleted: completedCards.length,
          },
        })
      );
    }

    if (cardSet.dayKey === todayKey) {
      todayCardStatuses = evaluations.map(({ status }) => ({
        id: status.id,
        title: status.title,
        description: status.description,
        category: status.category,
        points: status.points,
        difficulty: status.difficulty,
        completed: status.completed,
      }));
    }
  }

  const streak = computeStreakEntries(
    competition,
    participant,
    orderedCardSets.map((cardSet) => cardSet.dayKey),
    activityDays
  );
  ledgerEntries.push(...streak.entries);

  const tradePoints = sumLedger(
    ledgerEntries,
    (entry) => entry.metric === "score" && entry.sourceType === "trade"
  );
  const battlecardPoints = sumLedger(
    ledgerEntries,
    (entry) =>
      entry.metric === "score" &&
      (entry.sourceType === "battlecard" || entry.sourceType === "full_set_bonus")
  );
  const streakPoints = sumLedger(
    ledgerEntries,
    (entry) =>
      entry.metric === "score" &&
      (entry.sourceType === "streak" || entry.sourceType === "perfect_week_bonus")
  );
  const raffleTickets = sumLedger(ledgerEntries, (entry) => entry.metric === "ticket");
  const totalEligibleVolume = scoredTrades.reduce((sum, trade) => sum + trade.volume, 0);
  const totalEligiblePnl = scoredTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  return {
    snapshot: {
      wallet: participant.wallet,
      label: participant.label,
      source: participant.source,
      joinedAt: participant.joinedAt,
      lastSyncedAt: participant.lastSyncedAt,
      rank: 0,
      score: tradePoints + battlecardPoints + streakPoints,
      tradePoints,
      battlecardPoints,
      streakPoints,
      adjustmentPoints: 0,
      streakDays: streak.currentStreak,
      raffleTickets,
      adjustmentTickets: 0,
      fullSetsCompleted,
      todayCardsCompleted: todayCardStatuses.filter((card) => card.completed).length,
      totalEligibleVolume,
      totalEligiblePnl,
      eligibleTrades: scoredTrades.length,
      todayCardStatuses,
      scoredTrades: [...scoredTrades].reverse(),
    },
    participantCards,
    ledgerEntries,
  };
}

export function buildParticipantSnapshot(participant: ParticipantScoringInput): ParticipantSnapshot {
  const cardSets = getBattlecardSetsUntilReference().map((cardSet) => ({
    id: `legacy-card-set:${cardSet.dayKey}`,
    competitionId: competitionConfig.id,
    dayKey: cardSet.dayKey,
    publishedAt: `${cardSet.dayKey}T00:00:00.000Z`,
    updatedAt: `${cardSet.dayKey}T00:00:00.000Z`,
    origin: "generated" as const,
    operatorNote: null,
    cards: cardSet.cards,
    fullSetBonus: cardSet.fullSetBonus,
  }));

  const competition: CompetitionRecord = {
    id: competitionConfig.id,
    name: competitionConfig.name,
    tagline: competitionConfig.tagline,
    description: competitionConfig.description,
    startAt: competitionConfig.startAt,
    endAt: competitionConfig.endAt,
    referenceNow: getReferenceNow().toISOString(),
    status: "active",
    createdAt: getReferenceNow().toISOString(),
    updatedAt: getReferenceNow().toISOString(),
    lastRefreshedAt: null,
    lastRecomputedAt: null,
    configSnapshot: competitionConfig,
  };

  return buildParticipantScoreResult({
    competition,
    participant,
    positions: participant.positions,
    dailyCardSets: cardSets,
  }).snapshot;
}
