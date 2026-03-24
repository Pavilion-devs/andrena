"use client";

import Link from "next/link";
import { useState } from "react";
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
import {
  formatShortWallet,
  useDashboardWallet,
} from "@/components/dashboard/wallet-context";
import { useCompetitionParticipantDetail } from "@/hooks/use-competition-participant-detail";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";
import { currency, fixed, formatDate } from "@/lib/format";

type HistoryTab = "positions" | "close-events" | "cards" | "ledger";

const tabLabels: Record<HistoryTab, string> = {
  positions: "Recent Positions",
  "close-events": "Realized Closes",
  cards: "Battlecard Evidence",
  ledger: "Score Ledger",
};

export default function HistoryPage() {
  const { connectedWallet, connectWallet, connecting, walletAvailable } = useDashboardWallet();
  const {
    snapshot,
    loading: snapshotLoading,
    refreshing,
    registering,
    error: snapshotError,
    refreshSnapshot,
    registerWallet,
  } = useCompetitionSnapshot();
  const isRegistered = Boolean(
    connectedWallet && snapshot?.leaderboard.some((participant) => participant.wallet === connectedWallet)
  );
  const {
    detail,
    loading: detailLoading,
    error: detailError,
    loadDetail,
  } = useCompetitionParticipantDetail(isRegistered ? connectedWallet : null);
  const [activeTab, setActiveTab] = useState<HistoryTab>("positions");

  async function handleRefreshWallet() {
    if (!connectedWallet) return;
    const nextSnapshot = await refreshSnapshot(connectedWallet);
    if (nextSnapshot) await loadDetail(connectedWallet);
  }

  async function handleRegisterConnectedWallet() {
    if (!connectedWallet) return;
    const nextSnapshot = await registerWallet(connectedWallet, "");
    if (nextSnapshot) await loadDetail(connectedWallet);
  }

  if (snapshotLoading && !snapshot) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader />
        <DashboardLoadingGrid
          count={3}
          className="grid grid-cols-3 gap-3"
          itemClassName="h-20 animate-pulse rounded-xl bg-white ring-1 ring-neutral-200"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-geist text-[11px] uppercase tracking-widest text-neutral-400">
            Participant View
          </p>
          <h1 className="font-geist text-2xl font-semibold tracking-tight sm:text-3xl">
            My History
          </h1>
        </div>
        {connectedWallet ? (
          <div className="flex shrink-0 items-center gap-2">
            <SecondaryButton
              onClick={() => void handleRefreshWallet()}
              disabled={refreshing}
              className="!py-2 !px-4 !text-xs"
            >
              {refreshing ? "Refreshing…" : "Refresh Wallet"}
            </SecondaryButton>
            <Link
              href="/dashboard/trade"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 font-geist text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Launch Trade
            </Link>
          </div>
        ) : null}
      </div>

      {snapshotError ? <DashboardAlert tone="error">{snapshotError}</DashboardAlert> : null}

      {/* ── Connect / Register prompts ── */}
      {!connectedWallet ? (
        <DashboardPanel className="flex items-center justify-between gap-4">
          <p className="font-geist text-sm text-neutral-600">
            Connect your wallet to view history.
          </p>
          <PrimaryButton
            onClick={() => void connectWallet()}
            disabled={!walletAvailable || connecting}
            className="!py-2 !px-4 !text-xs"
          >
            {connecting ? "Connecting…" : walletAvailable ? "Connect Wallet" : "Wallet Not Found"}
          </PrimaryButton>
        </DashboardPanel>
      ) : null}

      {connectedWallet && !isRegistered ? (
        <DashboardPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <DashboardBadge tone="amber">Connected</DashboardBadge>
            <DashboardBadge>{formatShortWallet(connectedWallet)}</DashboardBadge>
            <span className="font-geist text-sm text-neutral-500">— not registered yet</span>
          </div>
          <div className="flex items-center gap-2">
            <PrimaryButton
              onClick={() => void handleRegisterConnectedWallet()}
              disabled={registering}
              className="!py-2 !px-4 !text-xs"
            >
              {registering ? "Registering…" : "Register Wallet"}
            </PrimaryButton>
            <Link
              href="/dashboard/register"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 font-geist text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Add Label First
            </Link>
          </div>
        </DashboardPanel>
      ) : null}

      {/* ── Loading detail ── */}
      {connectedWallet && isRegistered && detailLoading && !detail ? (
        <DashboardLoadingGrid
          count={4}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          itemClassName="h-20 animate-pulse rounded-xl bg-white ring-1 ring-neutral-200"
        />
      ) : null}

      {detailError ? <DashboardAlert tone="error">{detailError}</DashboardAlert> : null}

      {detail ? (
        <>
          {/* ── Stats strip ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Rank", value: detail.snapshot ? `#${detail.snapshot.rank}` : "—" },
              { label: "Score", value: fixed(detail.snapshot?.score ?? 0) },
              { label: "Volume", value: currency(detail.snapshot?.totalEligibleVolume ?? 0) },
              { label: "Last Sync", value: formatDate(detail.participant.lastSyncedAt) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200/80">
                <p className="font-geist text-[11px] uppercase tracking-wider text-neutral-400">{stat.label}</p>
                <p className="mt-0.5 font-geist text-xl font-semibold tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* ── Tab filter ── */}
          <div className="flex items-center gap-3">
            <label htmlFor="history-tab" className="font-geist text-xs font-medium text-neutral-500">
              View
            </label>
            <select
              id="history-tab"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as HistoryTab)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-geist text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {(Object.keys(tabLabels) as HistoryTab[]).map((key) => (
                <option key={key} value={key}>
                  {tabLabels[key]}
                </option>
              ))}
            </select>
          </div>

          {/* ── Positions ── */}
          {activeTab === "positions" && (
            <DashboardPanel>
              <DashboardPanelHeader title="Recent Positions" />
              {detail.positions.length === 0 ? (
                <p className="font-geist text-sm text-neutral-400">
                  No positions ingested yet. Refresh after trading on Adrena.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {detail.positions.slice(0, 8).map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-neutral-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <DashboardBadge
                          tone={position.side === "long" ? "green" : "blue"}
                          className="!text-[10px]"
                        >
                          {position.side.toUpperCase()}
                        </DashboardBadge>
                        <span className="font-geist text-sm font-medium">{position.symbol}</span>
                        <span className="font-geist text-xs text-neutral-400">
                          {formatDate(position.entry_date)}
                          {position.exit_date ? ` → ${formatDate(position.exit_date)}` : " · open"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-geist text-xs text-neutral-400">
                          {position.entry_leverage != null ? `${fixed(position.entry_leverage)}x` : ""}
                        </span>
                        <span className="font-geist text-sm font-medium tabular-nums">
                          {currency(position.volume)}
                        </span>
                        <span className={`font-geist text-sm font-medium tabular-nums ${(position.pnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {currency(position.pnl ?? 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          )}

          {activeTab === "close-events" && (
            <DashboardPanel>
              <DashboardPanelHeader title="Realized Close Events" />
              {detail.closeEvents.length === 0 ? (
                <p className="font-geist text-sm text-neutral-400">
                  No close-position evidence yet. These entries appear when the competition service captures a realized close for your wallet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {detail.closeEvents.slice(0, 8).map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <DashboardBadge
                          tone={event.side === "long" ? "green" : "blue"}
                          className="!text-[10px]"
                        >
                          {event.side.toUpperCase()}
                        </DashboardBadge>
                        <span className="font-geist text-sm font-medium">
                          Position #{event.positionId}
                        </span>
                        <span className="font-geist text-xs text-neutral-400">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-geist text-xs text-neutral-400">
                          {fixed(event.percentageClosedPct)}% closed
                        </span>
                        <span className="font-geist text-sm font-medium tabular-nums">
                          {currency(event.sizeUsd)}
                        </span>
                        <span
                          className={`font-geist text-sm font-medium tabular-nums ${
                            event.netPnlUsd >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {currency(event.netPnlUsd)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          )}

          {/* ── Cards ── */}
          {activeTab === "cards" && (
            <DashboardPanel>
              <DashboardPanelHeader title="Battlecard Evidence" />
              {detail.cards.length === 0 ? (
                <p className="font-geist text-sm text-neutral-400">
                  No battlecard evidence yet. Complete cards by trading within rule windows.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {detail.cards.slice(0, 8).map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <DashboardBadge
                          tone={card.status === "completed" ? "green" : "amber"}
                          className="!text-[10px]"
                        >
                          {card.status}
                        </DashboardBadge>
                        <span className="font-geist text-sm font-medium truncate">{card.title}</span>
                        <span className="font-geist text-xs text-neutral-400">{card.dayKey}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-geist text-xs text-neutral-400">
                          {card.evidencePositionIds.length > 0
                            ? card.evidencePositionIds.map((id) => `#${id}`).join(", ")
                            : "pending"}
                        </span>
                        <span className="rounded-md bg-neutral-900 px-2 py-0.5 font-geist text-xs font-semibold text-white">
                          +{card.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          )}

          {/* ── Ledger ── */}
          {activeTab === "ledger" && (
            <DashboardPanel>
              <DashboardPanelHeader title="Score Ledger" />
              {detail.ledger.length === 0 ? (
                <p className="font-geist text-sm text-neutral-400">
                  No ledger entries yet. Points appear after scored trades land.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {detail.ledger.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <DashboardBadge
                          tone={entry.metric === "score" ? "blue" : "amber"}
                          className="!text-[10px]"
                        >
                          {entry.metric}
                        </DashboardBadge>
                        <DashboardBadge className="!text-[10px]">
                          {entry.sourceType.replaceAll("_", " ")}
                        </DashboardBadge>
                        <span className="font-geist text-xs text-neutral-400">
                          {entry.dayKey} · {formatDate(entry.createdAt)}
                        </span>
                        {typeof entry.metadata.sizeMultiplier === "number" ? (
                          <span className="font-geist text-xs text-neutral-400">
                            {`· ${fixed(entry.metadata.sizeMultiplier)}x size`}
                          </span>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-geist text-sm font-semibold tabular-nums">
                        {entry.amount > 0 ? "+" : ""}{fixed(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>
          )}
        </>
      ) : null}
    </div>
  );
}
