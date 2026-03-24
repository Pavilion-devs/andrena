"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDashboardWallet } from "@/components/dashboard/wallet-context";
import type { CompetitionSnapshot } from "@/lib/types";

interface DashboardParticipantContextValue {
  selectedWallet: string | null;
  setSelectedWallet: (wallet: string | null) => void;
  clearSelectedWallet: () => void;
}

const DashboardParticipantContext = createContext<DashboardParticipantContextValue | null>(null);

export function DashboardParticipantProvider({ children }: { children: ReactNode }) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      selectedWallet,
      setSelectedWallet,
      clearSelectedWallet: () => setSelectedWallet(null),
    }),
    [selectedWallet]
  );

  return (
    <DashboardParticipantContext.Provider value={value}>
      {children}
    </DashboardParticipantContext.Provider>
  );
}

function useDashboardParticipantStore() {
  const context = useContext(DashboardParticipantContext);

  if (!context) {
    throw new Error("useDashboardParticipantStore must be used within DashboardParticipantProvider.");
  }

  return context;
}

export function useSelectedParticipant(snapshot: CompetitionSnapshot | null) {
  const { selectedWallet, setSelectedWallet, clearSelectedWallet } = useDashboardParticipantStore();
  const { connectedWallet } = useDashboardWallet();
  const participants = useMemo(() => snapshot?.leaderboard ?? [], [snapshot]);

  useEffect(() => {
    if (participants.length === 0) {
      return;
    }

    if (
      connectedWallet &&
      participants.some((participant) => participant.wallet === connectedWallet) &&
      selectedWallet !== connectedWallet
    ) {
      setSelectedWallet(connectedWallet);
      return;
    }

    if (
      !selectedWallet ||
      !participants.some((participant) => participant.wallet === selectedWallet)
    ) {
      setSelectedWallet(participants[0].wallet);
    }
  }, [connectedWallet, participants, selectedWallet, setSelectedWallet]);

  const selectedParticipant = useMemo(() => {
    if (participants.length === 0) {
      return null;
    }

    if (!selectedWallet) {
      return participants[0];
    }

    return participants.find((participant) => participant.wallet === selectedWallet) ?? participants[0];
  }, [participants, selectedWallet]);

  return {
    selectedWallet,
    selectedParticipant,
    selectParticipant: setSelectedWallet,
    clearSelectedParticipant: clearSelectedWallet,
  };
}
