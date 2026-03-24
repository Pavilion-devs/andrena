"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCompetitionAdminSnapshot,
  ingestCompetitionServiceCloseEvent,
  publishCompetitionCards,
  recomputeCompetitionAdminSnapshot,
  refreshCompetitionSnapshot,
  runCompetitionSchedulerTick,
  setCompetitionScheduler,
  syncCompetitionService,
} from "@/lib/competition-client";
import type { CompetitionAdminSnapshot, CompetitionSnapshot } from "@/lib/types";

interface UseCompetitionAdminOptions {
  loadOnMount?: boolean;
}

export function useCompetitionAdmin(options: UseCompetitionAdminOptions = {}) {
  const { loadOnMount = true } = options;
  const [snapshot, setSnapshot] = useState<CompetitionAdminSnapshot | null>(null);
  const [loading, setLoading] = useState(loadOnMount);
  const [refreshing, setRefreshing] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [publishingCards, setPublishingCards] = useState(false);
  const [syncingService, setSyncingService] = useState(false);
  const [ingestingCloseEvent, setIngestingCloseEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      setSnapshot(await fetchCompetitionAdminSnapshot());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load admin state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadOnMount) {
      return;
    }

    void loadSnapshot();
  }, [loadOnMount, loadSnapshot]);

  async function recomputeSnapshot() {
    try {
      setError(null);
      setRecomputing(true);
      const next = await recomputeCompetitionAdminSnapshot();
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to recompute state.");
      return null;
    } finally {
      setRecomputing(false);
    }
  }

  async function refreshAll() {
    try {
      setError(null);
      setRefreshing(true);
      const publicSnapshot = await refreshCompetitionSnapshot();
      const nextAdminSnapshot = await fetchCompetitionAdminSnapshot();
      setSnapshot(nextAdminSnapshot);
      return {
        snapshot: publicSnapshot,
        admin: nextAdminSnapshot,
      } satisfies { snapshot: CompetitionSnapshot; admin: CompetitionAdminSnapshot };
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to refresh wallets.");
      return null;
    } finally {
      setRefreshing(false);
    }
  }

  async function runTick(force = false) {
    try {
      setError(null);
      setTicking(true);
      const next = await runCompetitionSchedulerTick(force);
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to run scheduler.");
      return null;
    } finally {
      setTicking(false);
    }
  }

  async function updateScheduler(enabled: boolean) {
    try {
      setError(null);
      setSavingScheduler(true);
      const next = await setCompetitionScheduler(enabled);
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to update scheduler."
      );
      return null;
    } finally {
      setSavingScheduler(false);
    }
  }

  async function publishCardSet(input: {
    dayKey: string;
    cardIds: string[];
    fullSetBonus?: number;
    operatorNote?: string;
  }) {
    try {
      setError(null);
      setPublishingCards(true);
      const next = await publishCompetitionCards(input);
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to publish card set."
      );
      return null;
    } finally {
      setPublishingCards(false);
    }
  }

  async function syncService(force = false) {
    try {
      setError(null);
      setSyncingService(true);
      const next = await syncCompetitionService(force);
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to sync competition service."
      );
      return null;
    } finally {
      setSyncingService(false);
    }
  }

  async function ingestCloseEvent(payload: Record<string, unknown>) {
    try {
      setError(null);
      setIngestingCloseEvent(true);
      const next = await ingestCompetitionServiceCloseEvent(payload);
      setSnapshot(next.admin);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to ingest close-position event."
      );
      return null;
    } finally {
      setIngestingCloseEvent(false);
    }
  }

  return {
    snapshot,
    loading,
    refreshing,
    recomputing,
    ticking,
    savingScheduler,
    publishingCards,
    syncingService,
    ingestingCloseEvent,
    error,
    setError,
    loadSnapshot,
    refreshAll,
    recomputeSnapshot,
    runTick,
    updateScheduler,
    publishCardSet,
    syncService,
    ingestCloseEvent,
  };
}
