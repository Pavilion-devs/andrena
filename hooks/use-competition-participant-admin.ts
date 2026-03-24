"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createCompetitionParticipantAdjustment,
  createCompetitionParticipantFlag,
  fetchCompetitionParticipantAdminDetail,
  recomputeCompetitionAdminSnapshot,
  refreshCompetitionParticipant,
  resolveCompetitionParticipantFlag,
  voidCompetitionParticipantAdjustment,
} from "@/lib/competition-client";
import type { CompetitionParticipantAdminDetail } from "@/lib/types";

export function useCompetitionParticipantAdmin(wallet: string | null) {
  const [detail, setDetail] = useState<CompetitionParticipantAdminDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(wallet));
  const [refreshing, setRefreshing] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (targetWallet = wallet) => {
      if (!targetWallet) {
        return null;
      }

      try {
        setError(null);
        setLoading(true);
        const nextDetail = await fetchCompetitionParticipantAdminDetail(targetWallet);
        setDetail(nextDetail);
        return nextDetail;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Failed to load participant detail."
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  useEffect(() => {
    if (!wallet) {
      setDetail(null);
      setLoading(false);
      return;
    }

    void loadDetail(wallet);
  }, [loadDetail, wallet]);

  async function refreshDetail() {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      setRefreshing(true);
      const next = await refreshCompetitionParticipant(wallet);
      setDetail(next.participant);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to refresh participant."
      );
      return null;
    } finally {
      setRefreshing(false);
    }
  }

  async function recomputeDetail() {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      setRecomputing(true);
      await recomputeCompetitionAdminSnapshot();
      const nextDetail = await fetchCompetitionParticipantAdminDetail(wallet);
      setDetail(nextDetail);
      return nextDetail;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to recompute participant."
      );
      return null;
    } finally {
      setRecomputing(false);
    }
  }

  async function createFlag(input: {
    category: "abuse" | "dispute" | "scoring" | "data_quality";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
  }) {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      const next = await createCompetitionParticipantFlag(wallet, input);
      setDetail(next.participant);
      return next;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to create review flag.");
      return null;
    }
  }

  async function resolveFlag(flagId: string, resolutionNote?: string) {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      const next = await resolveCompetitionParticipantFlag(wallet, flagId, resolutionNote);
      setDetail(next.participant);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to resolve review flag."
      );
      return null;
    }
  }

  async function createAdjustment(input: {
    metric: "score" | "ticket";
    amount: number;
    reason: string;
    note?: string;
    dayKey?: string;
  }) {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      const next = await createCompetitionParticipantAdjustment(wallet, input);
      setDetail(next.participant);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create manual adjustment."
      );
      return null;
    }
  }

  async function voidAdjustment(adjustmentId: string, voidReason?: string) {
    if (!wallet) {
      return null;
    }

    try {
      setError(null);
      const next = await voidCompetitionParticipantAdjustment(wallet, adjustmentId, voidReason);
      setDetail(next.participant);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to void adjustment."
      );
      return null;
    }
  }

  return {
    detail,
    loading,
    refreshing,
    recomputing,
    error,
    setError,
    loadDetail,
    refreshDetail,
    recomputeDetail,
    createFlag,
    resolveFlag,
    createAdjustment,
    voidAdjustment,
  };
}
