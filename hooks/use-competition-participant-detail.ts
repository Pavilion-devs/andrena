"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchCompetitionParticipantDetail } from "@/lib/competition-client";
import type { CompetitionParticipantDetail } from "@/lib/types";

export function useCompetitionParticipantDetail(wallet: string | null) {
  const [detail, setDetail] = useState<CompetitionParticipantDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(wallet));
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async (targetWallet = wallet) => {
    if (!targetWallet) {
      setDetail(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const nextDetail = await fetchCompetitionParticipantDetail(targetWallet);
      setDetail(nextDetail);
      return nextDetail;
    } catch (caughtError) {
      setDetail(null);
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to load participant detail."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    void loadDetail(wallet);
  }, [loadDetail, wallet]);

  return {
    detail,
    loading,
    error,
    setError,
    loadDetail,
  };
}
