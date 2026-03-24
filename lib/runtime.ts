import { getReferenceNow } from "@/lib/config";
import {
  getCompetitionAdminSnapshot,
  recomputeCompetitionState,
  refreshCompetitionState,
} from "@/lib/competition";
import { getActiveCompetition, getCompetitionRuntimeState, readDatabase, updateDatabase } from "@/lib/storage";
import type {
  CompetitionSnapshot,
  PilotDatabase,
  RuntimeActionType,
  RuntimeJobRunRecord,
  RuntimeJobStatus,
  RuntimeTrigger,
} from "@/lib/types";

function getSystemTimestamp() {
  return new Date().toISOString();
}

function addSeconds(timestamp: string, seconds: number) {
  return new Date(new Date(timestamp).getTime() + seconds * 1000).toISOString();
}

function isLockActive(expiresAt: string, now: string) {
  return new Date(expiresAt).getTime() > new Date(now).getTime();
}

function limitRuntimeJobRuns(
  database: PilotDatabase,
  competitionId: string,
  limit: number
) {
  const otherRuns = database.runtimeJobRuns.filter((entry) => entry.competitionId !== competitionId);
  const competitionRuns = database.runtimeJobRuns
    .filter((entry) => entry.competitionId === competitionId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit);

  database.runtimeJobRuns = [...otherRuns, ...competitionRuns];
}

function getLatestRefreshRunId(database: PilotDatabase, competitionId: string) {
  return database.refreshRuns
    .filter((entry) => entry.competitionId === competitionId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0]?.id ?? null;
}

function getLatestLeaderboardSnapshotId(database: PilotDatabase, competitionId: string) {
  return database.leaderboardSnapshots
    .filter((entry) => entry.competitionId === competitionId)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))[0]?.id ?? null;
}

function buildRuntimeRunRecord({
  competitionId,
  trigger,
  startedAt,
  finishedAt,
  status,
  dueActions,
  executedActions,
  skippedReason,
  errorMessage,
  refreshRunId,
  leaderboardSnapshotId,
}: {
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
}): RuntimeJobRunRecord {
  return {
    id: `runtime-run:${competitionId}:${Date.now()}`,
    competitionId,
    trigger,
    startedAt,
    finishedAt,
    status,
    dueActions,
    executedActions,
    skippedReason,
    errorMessage,
    refreshRunId,
    leaderboardSnapshotId,
  };
}

async function finalizeRuntimeRun({
  competitionId,
  lockId,
  run,
}: {
  competitionId: string;
  lockId: string | null;
  run: RuntimeJobRunRecord;
}) {
  await updateDatabase((database) => {
    const runtimeState = getCompetitionRuntimeState(database, competitionId);

    if (lockId && runtimeState.activeLock?.id === lockId) {
      runtimeState.activeLock = null;
    }

    runtimeState.lastTickAt = run.finishedAt;

    if (run.status === "success") {
      runtimeState.lastSuccessfulTickAt = run.finishedAt;
    }

    runtimeState.updatedAt = run.finishedAt;
    database.runtimeJobRuns.push(run);
    limitRuntimeJobRuns(database, competitionId, runtimeState.maxJobRuns);
  });

  const admin = await getCompetitionAdminSnapshot();
  return {
    admin,
    runtime: admin.runtime,
    run,
  };
}

function isActionDue(lastRanAt: string | null, intervalMinutes: number, now: string) {
  if (!lastRanAt) {
    return true;
  }

  return new Date(lastRanAt).getTime() + intervalMinutes * 60_000 <= new Date(now).getTime();
}

export async function setCompetitionSchedulerEnabled(enabled: boolean) {
  await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const runtimeState = getCompetitionRuntimeState(database, competition.id);
    const now = getSystemTimestamp();

    runtimeState.schedulerEnabled = enabled;
    runtimeState.updatedAt = now;

    if (!enabled) {
      runtimeState.activeLock = null;
    }
  });

  const admin = await getCompetitionAdminSnapshot();

  return {
    admin,
    runtime: admin.runtime,
  };
}

export async function runCompetitionRuntimeTick({
  force = false,
  trigger = "manual",
}: {
  force?: boolean;
  trigger?: RuntimeTrigger;
} = {}) {
  const startedAt = getSystemTimestamp();
  const lockOwner = `${trigger}-tick`;
  const lockAttempt = await updateDatabase((database) => {
    const competition = getActiveCompetition(database);
    const runtimeState = getCompetitionRuntimeState(database, competition.id);

    runtimeState.lastTickAt = startedAt;
    runtimeState.updatedAt = startedAt;

    if (
      runtimeState.activeLock &&
      isLockActive(runtimeState.activeLock.expiresAt, startedAt)
    ) {
      return {
        acquired: false as const,
        competitionId: competition.id,
        run: buildRuntimeRunRecord({
          competitionId: competition.id,
          trigger,
          startedAt,
          finishedAt: startedAt,
          status: "skipped",
          dueActions: [],
          executedActions: [],
          skippedReason: `Runtime lock held by ${runtimeState.activeLock.owner}.`,
          errorMessage: null,
          refreshRunId: null,
          leaderboardSnapshotId: null,
        }),
      };
    }

    const lock = {
      id: `runtime-lock:${competition.id}:${Date.now()}`,
      owner: lockOwner,
      lockedAt: startedAt,
      expiresAt: addSeconds(startedAt, runtimeState.lockTtlSeconds),
    };

    runtimeState.activeLock = lock;

    return {
      acquired: true as const,
      competitionId: competition.id,
      lockId: lock.id,
      schedulerEnabled: runtimeState.schedulerEnabled,
      refreshIntervalMinutes: runtimeState.refreshIntervalMinutes,
      recomputeIntervalMinutes: runtimeState.recomputeIntervalMinutes,
    };
  });

  if (!lockAttempt.acquired) {
    return finalizeRuntimeRun({
      competitionId: lockAttempt.competitionId,
      lockId: null,
      run: lockAttempt.run,
    });
  }

  if (trigger === "scheduler" && !lockAttempt.schedulerEnabled && !force) {
    return finalizeRuntimeRun({
      competitionId: lockAttempt.competitionId,
      lockId: lockAttempt.lockId,
      run: buildRuntimeRunRecord({
        competitionId: lockAttempt.competitionId,
        trigger,
        startedAt,
        finishedAt: getSystemTimestamp(),
        status: "skipped",
        dueActions: [],
        executedActions: [],
        skippedReason: "Scheduler is paused.",
        errorMessage: null,
        refreshRunId: null,
        leaderboardSnapshotId: null,
      }),
    });
  }

  try {
    const database = await readDatabase();
    const competition = getActiveCompetition(database);
    const now = getReferenceNow().toISOString();
    const refreshDue =
      force ||
      isActionDue(competition.lastRefreshedAt, lockAttempt.refreshIntervalMinutes, now);
    const recomputeDue =
      force ||
      isActionDue(competition.lastRecomputedAt, lockAttempt.recomputeIntervalMinutes, now);
    const dueActions: RuntimeActionType[] = refreshDue
      ? ["refresh_live_wallets", "recompute_leaderboard"]
      : recomputeDue
        ? ["recompute_leaderboard"]
        : [];

    if (dueActions.length === 0) {
      return finalizeRuntimeRun({
        competitionId: competition.id,
        lockId: lockAttempt.lockId,
        run: buildRuntimeRunRecord({
          competitionId: competition.id,
          trigger,
          startedAt,
          finishedAt: getSystemTimestamp(),
          status: "skipped",
          dueActions,
          executedActions: [],
          skippedReason: "No runtime actions are due.",
          errorMessage: null,
          refreshRunId: null,
          leaderboardSnapshotId: null,
        }),
      });
    }

    let snapshot: CompetitionSnapshot | null;

    if (refreshDue) {
      snapshot = await refreshCompetitionState();
    } else {
      snapshot = await recomputeCompetitionState();
    }

    const nextDatabase = await readDatabase();
    const run = buildRuntimeRunRecord({
      competitionId: competition.id,
      trigger,
      startedAt,
      finishedAt: getSystemTimestamp(),
      status: "success",
      dueActions,
      executedActions: dueActions,
      skippedReason: null,
      errorMessage: null,
      refreshRunId: refreshDue ? getLatestRefreshRunId(nextDatabase, competition.id) : null,
      leaderboardSnapshotId: getLatestLeaderboardSnapshotId(nextDatabase, competition.id),
    });
    const finalized = await finalizeRuntimeRun({
      competitionId: competition.id,
      lockId: lockAttempt.lockId,
      run,
    });

    return {
      ...finalized,
      snapshot,
    };
  } catch (caughtError) {
    const finalized = await finalizeRuntimeRun({
      competitionId: lockAttempt.competitionId,
      lockId: lockAttempt.lockId,
      run: buildRuntimeRunRecord({
        competitionId: lockAttempt.competitionId,
        trigger,
        startedAt,
        finishedAt: getSystemTimestamp(),
        status: "failed",
        dueActions: [],
        executedActions: [],
        skippedReason: null,
        errorMessage:
          caughtError instanceof Error ? caughtError.message : "Runtime tick failed.",
        refreshRunId: null,
        leaderboardSnapshotId: null,
      }),
    });

    return {
      ...finalized,
      snapshot: null,
    };
  }
}
