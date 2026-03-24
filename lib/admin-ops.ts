import {
  getBattlecardTemplate,
  getDayKey,
  getDayRange,
  getReferenceNow,
} from "@/lib/config";
import {
  getCompetitionAdminSnapshot,
  getCompetitionParticipantAdminDetail,
  recomputeCompetitionState,
} from "@/lib/competition";
import { getActiveCompetition, touchCompetition, updateDatabase } from "@/lib/storage";
import type {
  CompetitionParticipantAdminDetail,
  LedgerMetric,
  ReviewCategory,
  ReviewSeverity,
} from "@/lib/types";

function getSystemTimestamp() {
  return new Date().toISOString();
}

function getParticipantForWallet(detail: CompetitionParticipantAdminDetail | null) {
  if (!detail) {
    throw new Error("Participant not found.");
  }

  return detail.participant;
}

function syncParticipantStatusFromFlags(
  participant: CompetitionParticipantAdminDetail["participant"],
  flags: Array<{
    category: ReviewCategory;
    severity: ReviewSeverity;
    status: "open" | "resolved";
  }>
) {
  if (participant.status === "paused") {
    return;
  }

  const shouldFlag = flags.some(
    (flag) =>
      flag.status === "open" && (flag.category !== "dispute" || flag.severity === "high")
  );

  participant.status = shouldFlag ? "flagged" : "active";
}

export async function publishCompetitionCardSet(input: {
  dayKey: string;
  cardIds: string[];
  fullSetBonus?: number;
  operatorNote?: string;
}) {
  const { dayKey, cardIds, fullSetBonus, operatorNote } = input;

  if (new Set(cardIds).size !== 3) {
    throw new Error("Three unique battlecards are required.");
  }

  const cards = cardIds.map((cardId) => {
    const card = getBattlecardTemplate(cardId);

    if (!card) {
      throw new Error(`Unknown battlecard: ${cardId}`);
    }

    return card;
  });

  const publishResult = await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const validDayKeys = new Set(getDayRange(competition.startAt, competition.endAt));

    if (!validDayKeys.has(dayKey)) {
      throw new Error("dayKey is outside the active competition window.");
    }

    const now = getSystemTimestamp();
    const existing = database.dailyCardSets.find(
      (entry) => entry.competitionId === competition.id && entry.dayKey === dayKey
    );

    if (existing) {
      existing.cards = cards;
      existing.fullSetBonus = fullSetBonus ?? existing.fullSetBonus;
      existing.origin = "manual";
      existing.operatorNote = operatorNote?.trim() || null;
      existing.updatedAt = now;
    } else {
      database.dailyCardSets.push({
        id: `daily-card-set:${competition.id}:${dayKey}`,
        competitionId: competition.id,
        dayKey,
        publishedAt: now,
        updatedAt: now,
        origin: "manual",
        operatorNote: operatorNote?.trim() || null,
        fullSetBonus: fullSetBonus ?? competition.configSnapshot.fullSetBonus,
        cards,
      });
    }

    touchCompetition(competition);

    return {
      shouldRecompute: dayKey <= getDayKey(getReferenceNow()),
    };
  });

  const snapshot = publishResult.shouldRecompute ? await recomputeCompetitionState() : null;
  const admin = await getCompetitionAdminSnapshot();

  return {
    admin,
    snapshot,
  };
}

export async function createParticipantReviewFlag(
  wallet: string,
  input: {
    category: ReviewCategory;
    severity: ReviewSeverity;
    title: string;
    description: string;
  }
) {
  if (!input.title.trim()) {
    throw new Error("title is required.");
  }

  if (!input.description.trim()) {
    throw new Error("description is required.");
  }

  await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const participant = database.participants.find(
      (entry) => entry.competitionId === competition.id && entry.wallet === wallet
    );

    if (!participant) {
      throw new Error("Participant not found.");
    }

    const now = getSystemTimestamp();
    database.reviewFlags.push({
      id: `review-flag:${participant.id}:${Date.now()}`,
      competitionId: competition.id,
      participantId: participant.id,
      wallet: participant.wallet,
      category: input.category,
      severity: input.severity,
      status: "open",
      title: input.title.trim(),
      description: input.description.trim(),
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolutionNote: null,
    });

    syncParticipantStatusFromFlags(
      participant,
      database.reviewFlags.filter((entry) => entry.participantId === participant.id)
    );
    touchCompetition(competition);
  });

  const admin = await getCompetitionAdminSnapshot();
  const participant = await getCompetitionParticipantAdminDetail(wallet);
  getParticipantForWallet(participant);

  return {
    admin,
    participant,
  };
}

export async function resolveParticipantReviewFlag(
  wallet: string,
  flagId: string,
  resolutionNote?: string
) {
  await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const participant = database.participants.find(
      (entry) => entry.competitionId === competition.id && entry.wallet === wallet
    );

    if (!participant) {
      throw new Error("Participant not found.");
    }

    const flag = database.reviewFlags.find(
      (entry) =>
        entry.competitionId === competition.id &&
        entry.participantId === participant.id &&
        entry.id === flagId
    );

    if (!flag) {
      throw new Error("Review flag not found.");
    }

    const now = getSystemTimestamp();
    flag.status = "resolved";
    flag.updatedAt = now;
    flag.resolvedAt = now;
    flag.resolutionNote = resolutionNote?.trim() || null;

    syncParticipantStatusFromFlags(
      participant,
      database.reviewFlags.filter((entry) => entry.participantId === participant.id)
    );
    touchCompetition(competition);
  });

  const admin = await getCompetitionAdminSnapshot();
  const participant = await getCompetitionParticipantAdminDetail(wallet);
  getParticipantForWallet(participant);

  return {
    admin,
    participant,
  };
}

export async function createParticipantManualAdjustment(
  wallet: string,
  input: {
    metric: LedgerMetric;
    amount: number;
    reason: string;
    note?: string;
    dayKey?: string;
  }
) {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    throw new Error("amount must be a non-zero number.");
  }

  if (!input.reason.trim()) {
    throw new Error("reason is required.");
  }

  await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const participant = database.participants.find(
      (entry) => entry.competitionId === competition.id && entry.wallet === wallet
    );

    if (!participant) {
      throw new Error("Participant not found.");
    }

    const validDayKeys = new Set(getDayRange(competition.startAt, competition.endAt));
    const dayKey = input.dayKey?.trim() || getDayKey(getReferenceNow());

    if (!validDayKeys.has(dayKey)) {
      throw new Error("dayKey is outside the active competition window.");
    }

    const now = getSystemTimestamp();
    database.manualAdjustments.push({
      id: `manual-adjustment:${participant.id}:${Date.now()}`,
      competitionId: competition.id,
      participantId: participant.id,
      wallet: participant.wallet,
      metric: input.metric,
      amount: input.amount,
      reason: input.reason.trim(),
      note: input.note?.trim() || null,
      dayKey,
      status: "active",
      createdAt: now,
      updatedAt: now,
      voidedAt: null,
      voidReason: null,
    });

    touchCompetition(competition);
  });

  const snapshot = await recomputeCompetitionState();
  const admin = await getCompetitionAdminSnapshot();
  const participant = await getCompetitionParticipantAdminDetail(wallet);
  getParticipantForWallet(participant);

  return {
    snapshot,
    admin,
    participant,
  };
}

export async function voidParticipantManualAdjustment(
  wallet: string,
  adjustmentId: string,
  voidReason?: string
) {
  await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const participant = database.participants.find(
      (entry) => entry.competitionId === competition.id && entry.wallet === wallet
    );

    if (!participant) {
      throw new Error("Participant not found.");
    }

    const adjustment = database.manualAdjustments.find(
      (entry) =>
        entry.competitionId === competition.id &&
        entry.participantId === participant.id &&
        entry.id === adjustmentId
    );

    if (!adjustment) {
      throw new Error("Manual adjustment not found.");
    }

    adjustment.status = "voided";
    adjustment.updatedAt = getSystemTimestamp();
    adjustment.voidedAt = adjustment.updatedAt;
    adjustment.voidReason = voidReason?.trim() || null;

    touchCompetition(competition);
  });

  const snapshot = await recomputeCompetitionState();
  const admin = await getCompetitionAdminSnapshot();
  const participant = await getCompetitionParticipantAdminDetail(wallet);
  getParticipantForWallet(participant);

  return {
    snapshot,
    admin,
    participant,
  };
}
