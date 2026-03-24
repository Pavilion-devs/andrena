"use client";

import { useEffect, useState } from "react";
import {
  fetchCompetitionSnapshot,
  refreshCompetitionSnapshot,
  registerCompetitionWallet
} from "@/lib/competition-client";
import type { CompetitionSnapshot } from "@/lib/types";

interface UseCompetitionSnapshotOptions {
  loadOnMount?: boolean;
}

export function useCompetitionSnapshot(options: UseCompetitionSnapshotOptions = {}) {
  const { loadOnMount = true } = options;
  const [snapshot, setSnapshot] = useState<CompetitionSnapshot | null>(null);
  const [loading, setLoading] = useState(loadOnMount);
  const [refreshing, setRefreshing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadOnMount) {
      return;
    }

    void loadSnapshot();
  }, [loadOnMount]);

  async function loadSnapshot() {
    try {
      setError(null);
      setLoading(true);
      setSnapshot(await fetchCompetitionSnapshot());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load state.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSnapshot(wallet?: string) {
    try {
      setError(null);
      setRefreshing(true);
      const nextSnapshot = await refreshCompetitionSnapshot(wallet);
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to refresh.");
      return null;
    } finally {
      setRefreshing(false);
    }
  }

  async function registerWallet(wallet: string, label: string) {
    try {
      setError(null);
      setRegistering(true);
      const nextSnapshot = await registerCompetitionWallet(wallet, label);
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to register.");
      return null;
    } finally {
      setRegistering(false);
    }
  }

  return {
    snapshot,
    setSnapshot,
    loading,
    refreshing,
    registering,
    error,
    setError,
    loadSnapshot,
    refreshSnapshot,
    registerWallet
  };
}
