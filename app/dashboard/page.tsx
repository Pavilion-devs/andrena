"use client";

import Link from "next/link";
import {
  DashboardAlert,
  DashboardBadge,
  DashboardLoadingGrid,
  DashboardLoadingHeader,
  DashboardPanel,
  DashboardPanelHeader,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import { useSelectedParticipant } from "@/components/dashboard/participant-context";
import { useDashboardWallet } from "@/components/dashboard/wallet-context";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";
import { compactNumber, currency, fixed, formatDate } from "@/lib/format";

export default function DashboardOverview() {
  const { snapshot, loading, refreshing, error, loadSnapshot, refreshSnapshot } =
    useCompetitionSnapshot();
  const { selectedParticipant, selectParticipant } = useSelectedParticipant(snapshot);
  const { connectedWallet } = useDashboardWallet();
  const connectedWalletRegistered = Boolean(
    connectedWallet &&
      snapshot?.leaderboard.some((participant) => participant.wallet === connectedWallet)
  );

  if (loading && !snapshot) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader />
        <DashboardLoadingGrid
          count={4}
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          itemClassName="h-20 animate-pulse rounded-xl bg-white ring-1 ring-neutral-200"
        />
      </div>
    );
  }

  const stats = [
    { label: "Wallets", value: String(snapshot?.competition.participantCount ?? 0) },
    { label: "League Score", value: compactNumber(snapshot?.summary.totalScore ?? 0) },
    { label: "Volume", value: currency(snapshot?.summary.totalEligibleVolume ?? 0) },
    { label: "Raffle Tickets", value: compactNumber(snapshot?.summary.totalTickets ?? 0) },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-geist text-[11px] uppercase tracking-widest text-neutral-400">
            {snapshot?.competition.dayKey ?? "Bounty Prototype"} · {formatDate(snapshot?.competition.startAt ?? null)} – {formatDate(snapshot?.competition.endAt ?? null)}
          </p>
          <h1 className="font-geist text-2xl font-semibold tracking-tight sm:text-3xl">
            League Overview
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PrimaryButton
            onClick={() =>
              void refreshSnapshot(connectedWalletRegistered ? connectedWallet ?? undefined : undefined)
            }
            disabled={refreshing}
            className="!py-2 !px-4 !text-xs"
          >
            {refreshing ? "Refreshing…" : connectedWalletRegistered ? "Refresh Wallet" : "Refresh"}
          </PrimaryButton>
          {connectedWallet && !connectedWalletRegistered ? (
            <Link
              href="/dashboard/register"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 font-geist text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Register Wallet
            </Link>
          ) : null}
          <SecondaryButton onClick={() => void loadSnapshot()} className="!py-2 !px-4 !text-xs">
            Reload
          </SecondaryButton>
        </div>
      </div>

      {error ? <DashboardAlert tone="error">{error}</DashboardAlert> : null}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200/80"
          >
            <p className="font-geist text-[11px] uppercase tracking-wider text-neutral-400">
              {stat.label}
            </p>
            <p className="mt-0.5 font-geist text-xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid: Battlecards + Leaderboard ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Battlecards — wider */}
        <DashboardPanel className="lg:col-span-3">
          <DashboardPanelHeader
            title="Today's Battlecards"
            description={`Full-set bonus +${snapshot?.dailyBattlecards.fullSetBonus ?? 5}`}
            action={
              <Link
                href="/dashboard/battlecards"
                className="font-geist text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
              >
                View all →
              </Link>
            }
          />
          <div className="divide-y divide-neutral-100">
            {snapshot?.dailyBattlecards.cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <DashboardBadge tone="blue" className="!text-[10px] !px-2 !py-0">
                      {card.category}
                    </DashboardBadge>
                    <span className="font-geist text-[10px] text-neutral-400 uppercase">
                      {card.difficulty}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-geist text-sm font-medium">{card.title}</p>
                </div>
                <span className="shrink-0 rounded-md bg-neutral-900 px-2 py-0.5 font-geist text-xs font-semibold text-white">
                  +{card.points}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        {/* Leaderboard — narrower */}
        <DashboardPanel className="lg:col-span-2">
          <DashboardPanelHeader
            title="Leaderboard"
            action={
              <Link
                href="/dashboard/leaderboard"
                className="font-geist text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
              >
                Full board →
              </Link>
            }
          />
          {snapshot?.leaderboard.length ? (
            <div className="space-y-1">
              {snapshot.leaderboard.slice(0, 5).map((participant) => (
                <button
                  key={participant.wallet}
                  type="button"
                  onClick={() => selectParticipant(participant.wallet)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    selectedParticipant?.wallet === participant.wallet
                      ? "bg-neutral-900 text-white"
                      : participant.rank === 1
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-geist text-[10px] font-bold ${
                        selectedParticipant?.wallet === participant.wallet
                          ? "bg-white/20 text-white"
                          : participant.rank === 1
                            ? "bg-amber-200 text-amber-900"
                            : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {participant.rank}
                    </span>
                    <span className="truncate font-geist text-sm font-medium">
                      {participant.label}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-geist text-sm font-semibold tabular-nums">
                      {fixed(participant.score)}
                    </span>
                    <p className={`font-geist text-[10px] ${selectedParticipant?.wallet === participant.wallet ? "text-white/50" : "text-neutral-400"}`}>
                      {participant.streakDays}d streak
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <DashboardAlert tone="dark">
              No wallets registered yet. Connect and register to start.
            </DashboardAlert>
          )}
        </DashboardPanel>
      </div>

      {/* ── Market Pulse + Meta — compact bottom row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {snapshot?.marketPulse ? (
          <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200/80">
            <p className="mb-2 font-geist text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Market Pulse
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <div>
                <p className="font-geist text-[10px] uppercase text-neutral-400">Pool</p>
                <p className="font-geist text-sm font-medium">{snapshot.marketPulse.poolName}</p>
              </div>
              <div>
                <p className="font-geist text-[10px] uppercase text-neutral-400">Daily Volume</p>
                <p className="font-geist text-sm font-medium">{currency(snapshot.marketPulse.dailyVolumeUsd)}</p>
              </div>
              <div>
                <p className="font-geist text-[10px] uppercase text-neutral-400">Daily Fees</p>
                <p className="font-geist text-sm font-medium">{currency(snapshot.marketPulse.dailyFeesUsd)}</p>
              </div>
              <div>
                <p className="font-geist text-[10px] uppercase text-neutral-400">Top Util.</p>
                <p className="font-geist text-sm font-medium">
                  {snapshot.marketPulse.topCustodySymbol ?? "N/A"}
                  {snapshot.marketPulse.topCustodyUtilizationPct != null
                    ? ` · ${fixed(snapshot.marketPulse.topCustodyUtilizationPct)}%`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200/80">
          <p className="mb-2 font-geist text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Competition Window
          </p>
          <div className="grid grid-cols-3 gap-x-6">
            <div>
              <p className="font-geist text-[10px] uppercase text-neutral-400">Start</p>
              <p className="font-geist text-sm font-medium">{formatDate(snapshot?.competition.startAt ?? null)}</p>
            </div>
            <div>
              <p className="font-geist text-[10px] uppercase text-neutral-400">End</p>
              <p className="font-geist text-sm font-medium">{formatDate(snapshot?.competition.endAt ?? null)}</p>
            </div>
            <div>
              <p className="font-geist text-[10px] uppercase text-neutral-400">Last Refresh</p>
              <p className="font-geist text-sm font-medium">{formatDate(snapshot?.competition.lastRefreshedAt ?? null)}</p>
            </div>
          </div>
        </div>
      </div>

      {snapshot?.notes && snapshot.notes.length > 0 ? (
        <div className="rounded-xl bg-neutral-900 px-4 py-3">
          <p className="mb-1.5 font-geist text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Notes
          </p>
          <div className="space-y-0.5">
            {snapshot.notes.map((note) => (
              <p key={note} className="font-geist text-sm text-white/60">
                {note}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
