"use client";

import Link from "next/link";
import {
  DashboardBadge,
  DashboardLoadingGrid,
  DashboardLoadingHeader,
  DashboardPageIntro,
  DashboardPanel,
  DashboardPanelHeader,
} from "@/components/dashboard/ui";
import { useSelectedParticipant } from "@/components/dashboard/participant-context";
import { formatShortWallet, useDashboardWallet } from "@/components/dashboard/wallet-context";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";
import { buildBattlecardTradePreset } from "@/lib/trade-presets";

export default function BattlecardsPage() {
  const { snapshot, loading } = useCompetitionSnapshot();
  const { selectedParticipant } = useSelectedParticipant(snapshot);
  const { connectedWallet } = useDashboardWallet();
  const featuredParticipant = selectedParticipant ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader showSubline={false} />
        <DashboardLoadingGrid
          count={3}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          itemClassName="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Daily Challenge"
        title="Today's Battlecards"
        description="Cards are visible, bounded, and much harder to brute-force than flat volume quests."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {connectedWallet ? <DashboardBadge tone="green">Trader: {formatShortWallet(connectedWallet)}</DashboardBadge> : null}
            {featuredParticipant ? (
              <DashboardBadge tone={featuredParticipant.source === "live" ? "green" : "blue"}>
                Focus: {featuredParticipant.label}
              </DashboardBadge>
            ) : null}
          </div>
        }
      />

      <DashboardPanel className="flex items-center justify-between">
        <div>
          <p className="font-geist text-sm font-medium">Full-Set Completion Bonus</p>
          <p className="mt-0.5 font-geist text-xs text-neutral-500">
            Complete all {snapshot?.dailyBattlecards.cards.length ?? 3} cards today to earn bonus
            league points and extra raffle tickets.
          </p>
        </div>
        <DashboardBadge tone="amber" className="shrink-0 px-3 py-1 text-sm font-medium">
          +{snapshot?.dailyBattlecards.fullSetBonus ?? 5} pts
        </DashboardBadge>
      </DashboardPanel>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot?.dailyBattlecards.cards.map((card) => (
          <DashboardPanel key={card.id} className="flex flex-col p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <DashboardBadge tone="blue" className="px-2.5 py-0.5 font-medium">
                {card.category}
              </DashboardBadge>
              <DashboardBadge>{card.difficulty}</DashboardBadge>
            </div>
            <h3 className="mb-2 font-geist text-lg font-medium tracking-tight">{card.title}</h3>
            <p className="flex-1 font-geist text-sm text-neutral-500">{card.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="font-geist text-xs text-neutral-400">Reward</span>
              <span className="font-geist text-sm font-medium">+{card.points} pts</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/trade?cardId=${encodeURIComponent(card.id)}`}
                className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 font-geist text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
              >
                {buildBattlecardTradePreset(card).headline}
              </Link>
            </div>
          </DashboardPanel>
        ))}
      </div>

      {featuredParticipant ? (
        <DashboardPanel>
          <DashboardPanelHeader
            title={`Card Progress — ${featuredParticipant.label}`}
            description={`#${featuredParticipant.rank} on the leaderboard`}
            action={
              <span className="font-geist text-sm font-medium">
                {featuredParticipant.todayCardsCompleted}/{featuredParticipant.todayCardStatuses.length} completed
              </span>
            }
          />
          <div className="space-y-2">
            {featuredParticipant.todayCardStatuses.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3"
              >
                <div className="min-w-0">
                  <p className="font-geist text-sm font-medium">{card.title}</p>
                  <p className="mt-0.5 font-geist text-xs text-neutral-500">{card.description}</p>
                </div>
                <DashboardBadge
                  tone={card.completed ? "green" : "amber"}
                  className="shrink-0 px-2.5 py-0.5 font-medium"
                >
                  {card.completed ? "completed" : "pending"} • +{card.points}
                </DashboardBadge>
              </div>
            ))}
          </div>
        </DashboardPanel>
      ) : null}
    </div>
  );
}
