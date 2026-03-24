"use client";

import {
  DashboardAlert,
  DashboardBadge,
  DashboardLoadingGrid,
  DashboardLoadingHeader,
  DashboardPageIntro,
  DashboardPanel,
  DashboardStatCard,
} from "@/components/dashboard/ui";
import { useSelectedParticipant } from "@/components/dashboard/participant-context";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";
import { currency, fixed, formatDate } from "@/lib/format";

export default function LeaderboardPage() {
  const { snapshot, loading } = useCompetitionSnapshot();
  const { selectedParticipant, selectParticipant } = useSelectedParticipant(snapshot);
  const featuredParticipant = selectedParticipant ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader showSubline={false} />
        <DashboardLoadingGrid
          count={5}
          className="space-y-4"
          itemClassName="h-16 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Rankings"
        title="Leaderboard"
        description="Rank is anti-whale by design: volume is capped, cards matter, and streaks stay in play."
      />

      {snapshot?.leaderboard.length ? (
        <div className="space-y-2">
          {snapshot.leaderboard.map((participant) => (
            <button
              key={participant.wallet}
              type="button"
              onClick={() => selectParticipant(participant.wallet)}
              className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition-colors ${
                participant.rank === 1 ? "bg-amber-50 ring-amber-200" : "ring-neutral-200"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-3 lg:w-72">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-geist text-xs font-bold ${
                      participant.rank === 1
                        ? "bg-amber-200 text-amber-900"
                        : "bg-neutral-200 text-neutral-700"
                    }`}
                  >
                    {participant.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-geist text-sm font-medium">{participant.label}</p>
                      <DashboardBadge
                        tone={participant.source === "live" ? "green" : "blue"}
                        className="shrink-0 px-2 py-0.5 text-[10px] font-medium"
                      >
                        {participant.source}
                      </DashboardBadge>
                      {selectedParticipant?.wallet === participant.wallet ? (
                        <DashboardBadge className="shrink-0 px-2 py-0.5 text-[10px] font-medium">
                          Focused
                        </DashboardBadge>
                      ) : null}
                    </div>
                    <p className="truncate font-mono text-xs text-neutral-400">{participant.wallet}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 lg:flex-1">
                  <div>
                    <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                      Score
                    </p>
                    <p className="font-geist text-sm font-medium">{fixed(participant.score)}</p>
                  </div>
                  <div>
                    <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                      Cards
                    </p>
                    <p className="font-geist text-sm font-medium">
                      {participant.todayCardsCompleted}/{participant.todayCardStatuses.length}
                    </p>
                  </div>
                  <div>
                    <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                      Streak
                    </p>
                    <p className="font-geist text-sm font-medium">{participant.streakDays}d</p>
                  </div>
                  <div>
                    <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                      Volume
                    </p>
                    <p className="font-geist text-sm font-medium">
                      {currency(participant.totalEligibleVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                      Tickets
                    </p>
                    <p className="font-geist text-sm font-medium">{participant.raffleTickets}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <DashboardAlert tone="dark">
          The leaderboard is empty until the first live wallet is registered and refreshed.
        </DashboardAlert>
      )}

      {featuredParticipant ? (
        <>
          <div>
            <p className="mb-1 font-geist text-xs uppercase tracking-widest text-neutral-500">
              Deep Dive
            </p>
            <h2 className="font-geist text-2xl font-medium tracking-tighter">
              Focused Wallet — {featuredParticipant.label}
            </h2>
            <p className="mt-1 font-geist text-neutral-600">
              Rank #{featuredParticipant.rank}. This score decomposes into trade quality,
              battlecards, and streak behavior.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Trade Points", value: fixed(featuredParticipant.tradePoints) },
              { label: "Card Points", value: fixed(featuredParticipant.battlecardPoints) },
              { label: "Streak Points", value: fixed(featuredParticipant.streakPoints) },
              { label: "Net PnL", value: currency(featuredParticipant.totalEligiblePnl) },
            ].map((stat) => (
              <DashboardStatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>

          <DashboardPanel>
            <h3 className="mb-4 font-geist text-lg font-medium tracking-tighter">
              Recent Scored Trades
            </h3>
            <div className="space-y-2">
              {featuredParticipant.scoredTrades.slice(0, 5).map((trade) => (
                <div
                  key={trade.positionId}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-geist text-sm font-medium">
                      {trade.side.toUpperCase()} {trade.symbol}
                    </p>
                    <p className="font-geist text-xs text-neutral-500">
                      {formatDate(trade.exitDate)} • {currency(trade.volume)} volume
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        Score
                      </p>
                      <p className="font-geist text-sm font-medium">{fixed(trade.tradePoints)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        Quality
                      </p>
                      <p
                        className={`font-geist text-sm font-medium ${
                          trade.pnlVolumeRatio >= 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {fixed(trade.pnlVolumeRatio)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        Duration
                      </p>
                      <p className="font-geist text-sm font-medium">
                        {Math.round(trade.duration / 60)}m
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </>
      ) : null}
    </div>
  );
}
