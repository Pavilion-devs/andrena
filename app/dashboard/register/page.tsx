"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DashboardAlert,
  DashboardBadge,
  DashboardField,
  DashboardInput,
  DashboardLoadingHeader,
  DashboardPageIntro,
  DashboardPanel,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import { useSelectedParticipant } from "@/components/dashboard/participant-context";
import {
  formatShortWallet,
  useDashboardWallet,
} from "@/components/dashboard/wallet-context";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";

export default function RegisterPage() {
  const {
    snapshot,
    loading,
    refreshing,
    registering,
    error,
    setError,
    registerWallet,
    refreshSnapshot,
  } = useCompetitionSnapshot();
  const { selectedParticipant, selectParticipant } = useSelectedParticipant(snapshot);
  const { connectedWallet, connectWallet, connecting, walletAvailable } = useDashboardWallet();
  const [label, setLabel] = useState("");
  const [success, setSuccess] = useState(false);
  const connectedWalletRegistered = Boolean(
    connectedWallet && snapshot?.leaderboard.some((participant) => participant.wallet === connectedWallet)
  );

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!connectedWallet) {
      return;
    }

    setError(null);
    setSuccess(false);

    const result = await registerWallet(connectedWallet, label);

    if (result) {
      selectParticipant(connectedWallet);
      setLabel("");
      setSuccess(true);
    }
  }

  async function handleRefreshConnectedWallet() {
    if (!connectedWallet) {
      return;
    }

    await refreshSnapshot(connectedWallet);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader showSubline={false} />
        <div className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Wallet Management"
        title="Register Wallet"
        description="Registration is now wallet-driven. Connect a wallet, set an optional label, and add that connected account to the league without pasting addresses."
      />

      {!connectedWallet ? (
        <DashboardPanel className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge tone="amber">No Wallet Connected</DashboardBadge>
          </div>
          <div>
            <p className="font-geist text-lg font-medium tracking-tight">
              Connect the wallet you want to register
            </p>
            <p className="mt-1 font-geist text-sm text-neutral-500">
              Participant registration now comes from the connected wallet adapter account. Manual wallet paste is no longer required on this path.
            </p>
          </div>
          <PrimaryButton onClick={() => void connectWallet()} disabled={!walletAvailable || connecting}>
            {connecting ? "Connecting..." : walletAvailable ? "Connect Wallet" : "Wallet Not Found"}
          </PrimaryButton>
        </DashboardPanel>
      ) : connectedWalletRegistered ? (
        <DashboardPanel className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <DashboardBadge tone="green">Connected Wallet Registered</DashboardBadge>
            <DashboardBadge>{formatShortWallet(connectedWallet)}</DashboardBadge>
          </div>
          <div>
            <p className="font-geist text-lg font-medium tracking-tight">
              This connected wallet is already in the league
            </p>
            <p className="mt-1 font-geist text-sm text-neutral-500">
              Refresh the connected wallet directly from here or jump into your participant history and trade flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => void handleRefreshConnectedWallet()} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh Connected Wallet"}
            </PrimaryButton>
            <Link
              href="/dashboard/history"
              className="inline-flex rounded-full border border-neutral-200 bg-white px-6 py-3 font-geist text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
            >
              View My History
            </Link>
          </div>
          {error ? <DashboardAlert tone="error">{error}</DashboardAlert> : null}
          {success ? (
            <DashboardAlert tone="success">
              Wallet registered successfully.
            </DashboardAlert>
          ) : null}
        </DashboardPanel>
      ) : (
        <DashboardPanel>
          <h2 className="mb-4 font-geist text-lg font-medium tracking-tighter">
            Add Connected Wallet To League
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DashboardField label="Connected Wallet" htmlFor="connected-wallet">
                <DashboardInput
                  id="connected-wallet"
                  value={connectedWallet}
                  readOnly
                  disabled
                  className="font-mono"
                />
              </DashboardField>

              <DashboardField label="Display Label" htmlFor="label">
                <DashboardInput
                  id="label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Optional label"
                />
              </DashboardField>
            </div>

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={registering}>
                {registering ? "Registering..." : "Register Connected Wallet"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setLabel("")}>Clear Label</SecondaryButton>
            </div>
          </form>

          {error ? <DashboardAlert className="mt-4" tone="error">{error}</DashboardAlert> : null}

          {success ? (
            <DashboardAlert className="mt-4" tone="success">
              Connected wallet registered successfully.
            </DashboardAlert>
          ) : null}
        </DashboardPanel>
      )}

      <DashboardPanel className="bg-neutral-900">
        <p className="mb-2 font-geist text-xs uppercase tracking-widest text-white/60">
          What happens on refresh
        </p>
        <p className="font-geist text-sm text-white/70">
          The server calls Adrena&apos;s public{" "}
          <code className="font-mono text-white/90">GET /position</code> endpoint for every live
          wallet, updates local pilot state, then rebuilds the leaderboard.
        </p>
      </DashboardPanel>

      <DashboardPanel>
        <h2 className="mb-4 font-geist text-lg font-medium tracking-tighter">
          Registered Wallets ({snapshot?.competition.participantCount ?? 0})
        </h2>
        {snapshot?.leaderboard.length ? (
          <div className="flex flex-wrap gap-2">
            {snapshot.leaderboard.map((participant) => (
              <button
                key={participant.wallet}
                type="button"
                onClick={() => selectParticipant(participant.wallet)}
                className="cursor-pointer"
              >
                <DashboardBadge
                  tone={participant.source === "live" ? "green" : "neutral"}
                  className={`gap-2 px-3 py-1.5 ${
                    selectedParticipant?.wallet === participant.wallet ? "ring-2 ring-neutral-900/15" : ""
                  }`}
                >
                  <span className="font-medium">{participant.label}</span>
                  <span className="font-mono text-neutral-400">{participant.wallet.slice(0, 8)}…</span>
                </DashboardBadge>
              </button>
            ))}
          </div>
        ) : (
          <DashboardAlert tone="dark">
            No wallets are registered yet. Connect a wallet and add the first participant to start the league.
          </DashboardAlert>
        )}
      </DashboardPanel>
    </div>
  );
}
