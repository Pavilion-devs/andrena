"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DashboardAlert,
  DashboardBadge,
  DashboardField,
  DashboardInput,
  DashboardLoadingGrid,
  DashboardLoadingHeader,
  DashboardMetric,
  DashboardPanel,
  DashboardPanelHeader,
  DashboardSelect,
  DashboardTextarea,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import { useCompetitionAdmin } from "@/hooks/use-competition-admin";
import { compactNumber, fixed, formatDate } from "@/lib/format";

type AdminSection =
  | "overview"
  | "service"
  | "scheduler"
  | "metrics"
  | "cards"
  | "review"
  | "participants"
  | "scheduler-runs"
  | "refresh-runs";

const sectionLabels: Record<AdminSection, string> = {
  overview: "Overview & Points",
  service: "Competition Service",
  scheduler: "Scheduler Runtime",
  metrics: "Pilot Metrics",
  cards: "Card Publishing",
  review: "Review Queue",
  participants: "Participant Audit",
  "scheduler-runs": "Scheduler Runs",
  "refresh-runs": "Refresh Runs",
};

export default function AdminOpsPage() {
  const {
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
    loadSnapshot,
    refreshAll,
    recomputeSnapshot,
    runTick,
    updateScheduler,
    publishCardSet,
    syncService,
    ingestCloseEvent,
  } = useCompetitionAdmin();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [serviceEventPayload, setServiceEventPayload] = useState("");
  const [servicePayloadError, setServicePayloadError] = useState<string | null>(null);
  const [cardDrafts, setCardDrafts] = useState<
    Record<string, { cardIds: string[]; fullSetBonus: string; operatorNote: string }>
  >({});

  const fallbackDayKey =
    snapshot?.publishedCardSets.find((cardSet) => cardSet.dayKey === snapshot.competition.dayKey)
      ?.dayKey ??
    snapshot?.publishedCardSets[0]?.dayKey ??
    "";
  const activeDayKey = selectedDayKey || fallbackDayKey;
  const activePublishedSet = snapshot?.publishedCardSets.find(
    (cardSet) => cardSet.dayKey === activeDayKey
  );
  const activeDraft = activeDayKey
    ? cardDrafts[activeDayKey] ?? {
        cardIds: [
          activePublishedSet?.cards[0]?.id ?? snapshot?.cardCatalog[0]?.id ?? "",
          activePublishedSet?.cards[1]?.id ?? snapshot?.cardCatalog[1]?.id ?? "",
          activePublishedSet?.cards[2]?.id ?? snapshot?.cardCatalog[2]?.id ?? "",
        ],
        fullSetBonus: String(activePublishedSet?.fullSetBonus ?? ""),
        operatorNote: activePublishedSet?.operatorNote ?? "",
      }
    : {
        cardIds: ["", "", ""],
        fullSetBonus: "",
        operatorNote: "",
      };

  function updateActiveDraft(
    nextDraft:
      | { cardIds: string[]; fullSetBonus: string; operatorNote: string }
      | ((current: { cardIds: string[]; fullSetBonus: string; operatorNote: string }) => {
          cardIds: string[];
          fullSetBonus: string;
          operatorNote: string;
        })
  ) {
    if (!activeDayKey) {
      return;
    }

    setCardDrafts((current) => {
      const baseDraft = current[activeDayKey] ?? activeDraft;
      return {
        ...current,
        [activeDayKey]:
          typeof nextDraft === "function" ? nextDraft(baseDraft) : nextDraft,
      };
    });
  }

  async function handlePublishCardSet() {
    if (!activeDayKey || activeDraft.cardIds.some((cardId) => !cardId)) {
      return;
    }

    const next = await publishCardSet({
      dayKey: activeDayKey,
      cardIds: activeDraft.cardIds,
      fullSetBonus: Number(activeDraft.fullSetBonus),
      operatorNote: activeDraft.operatorNote,
    });

    if (next) {
      setCardDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[activeDayKey];
        return nextDrafts;
      });
    }
  }

  async function handleIngestCloseEvent() {
    const trimmedPayload = serviceEventPayload.trim();

    if (!trimmedPayload) {
      setServicePayloadError("Paste a close-position payload first.");
      return;
    }

    try {
      const parsedPayload = JSON.parse(trimmedPayload) as Record<string, unknown>;
      setServicePayloadError(null);
      const next = await ingestCloseEvent(parsedPayload);

      if (next?.result.stored) {
        setServiceEventPayload("");
      }
    } catch {
      setServicePayloadError("Close-position payload must be valid JSON.");
    }
  }

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

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-geist text-[11px] uppercase tracking-widest text-neutral-400">
            Pilot Operations
          </p>
          <h1 className="font-geist text-2xl font-semibold tracking-tight sm:text-3xl">
            Admin Ops
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PrimaryButton
            onClick={() => void recomputeSnapshot()}
            disabled={recomputing}
            className="!py-2 !px-4 !text-xs"
          >
            {recomputing ? "Recomputing…" : "Recompute"}
          </PrimaryButton>
          <SecondaryButton
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="!py-2 !px-4 !text-xs"
          >
            {refreshing ? "Refreshing…" : "Refresh Wallets"}
          </SecondaryButton>
          <SecondaryButton onClick={() => void loadSnapshot()} className="!py-2 !px-4 !text-xs">
            Reload
          </SecondaryButton>
        </div>
      </div>

      {error ? <DashboardAlert tone="error">{error}</DashboardAlert> : null}

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Participants", value: String(snapshot?.counts.participants ?? 0) },
          { label: "Positions", value: compactNumber(snapshot?.counts.positions ?? 0) },
          { label: "Close Events", value: compactNumber(snapshot?.counts.closeEvents ?? 0) },
          { label: "Cards", value: `${compactNumber(snapshot?.counts.completedParticipantCards ?? 0)} / ${compactNumber(snapshot?.counts.participantCards ?? 0)}` },
          { label: "Ledger", value: compactNumber(snapshot?.counts.scoreLedgerEntries ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white px-4 py-3 ring-1 ring-neutral-200/80">
            <p className="font-geist text-[11px] uppercase tracking-wider text-neutral-400">{stat.label}</p>
            <p className="mt-0.5 font-geist text-xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Section filter ── */}
      <div className="flex items-center gap-3">
        <label htmlFor="admin-section" className="font-geist text-xs font-medium text-neutral-500">
          View
        </label>
        <select
          id="admin-section"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as AdminSection)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-geist text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
        >
          {(Object.keys(sectionLabels) as AdminSection[]).map((key) => (
            <option key={key} value={key}>
              {sectionLabels[key]}
            </option>
          ))}
        </select>
      </div>

      {/* ── Sections ── */}

      {activeSection === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white px-4 py-4 ring-1 ring-neutral-200/80">
            <p className="mb-3 font-geist text-sm font-semibold tracking-tight">Ops Pulse</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <DashboardMetric label="Status" value={snapshot?.competition.status ?? "unknown"} />
              <DashboardMetric label="Reference Day" value={snapshot?.competition.dayKey ?? "N/A"} />
              <DashboardMetric label="Published Sets" value={String(snapshot?.counts.publishedCardSets ?? 0)} />
              <DashboardMetric label="Last Refresh" value={formatDate(snapshot?.competition.lastRefreshedAt ?? null)} />
              <DashboardMetric label="Last Recompute" value={formatDate(snapshot?.competition.lastRecomputedAt ?? null)} />
              <DashboardMetric label="Window" value={`${formatDate(snapshot?.competition.startAt ?? null)} – ${formatDate(snapshot?.competition.endAt ?? null)}`} />
            </div>
          </div>
          <div className="rounded-xl bg-white px-4 py-4 ring-1 ring-neutral-200/80">
            <p className="mb-3 font-geist text-sm font-semibold tracking-tight">Points Composition</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <DashboardMetric label="Trade" value={fixed(snapshot?.pointsComposition.tradePoints ?? 0)} />
              <DashboardMetric label="Card" value={fixed(snapshot?.pointsComposition.battlecardPoints ?? 0)} />
              <DashboardMetric label="Streak" value={fixed(snapshot?.pointsComposition.streakPoints ?? 0)} />
              <DashboardMetric label="Adjustments" value={fixed(snapshot?.pointsComposition.adjustmentPoints ?? 0)} />
              <DashboardMetric label="Tickets" value={compactNumber(snapshot?.pointsComposition.tickets ?? 0)} />
            </div>
          </div>
        </div>
      )}

      {activeSection === "service" && (
        <div className="space-y-4">
          <DashboardPanel>
            <DashboardPanelHeader
              title="Competition Service"
              description="Official health, size-multiplier, schema, and stream state from the team-provided service"
              action={
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton
                    onClick={() => void syncService()}
                    disabled={syncingService}
                    className="!py-1.5 !px-3 !text-xs"
                  >
                    {syncingService ? "Syncing…" : "Sync Service"}
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={() => void syncService(true)}
                    disabled={syncingService}
                    className="!py-1.5 !px-3 !text-xs"
                  >
                    {syncingService ? "Syncing…" : "Force Sync"}
                  </SecondaryButton>
                </div>
              }
            />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
              <DashboardMetric
                label="Health"
                value={snapshot?.competitionService.health.status ?? "unknown"}
              />
              <DashboardMetric
                label="Checked"
                value={formatDate(snapshot?.competitionService.health.checkedAt ?? null)}
              />
              <DashboardMetric
                label="Response"
                value={
                  snapshot?.competitionService.health.responseTimeMs != null
                    ? `${snapshot.competitionService.health.responseTimeMs}ms`
                    : "N/A"
                }
              />
              <DashboardMetric
                label="Multiplier Source"
                value={snapshot?.competitionService.sizeMultiplier.source ?? "fallback"}
              />
              <DashboardMetric
                label="Tiers"
                value={String(snapshot?.competitionService.sizeMultiplier.tiers.length ?? 0)}
              />
              <DashboardMetric
                label="Program ID"
                value={
                  <span className="break-all text-sm">
                    {snapshot?.competitionService.positionSchema.programId ?? "N/A"}
                  </span>
                }
              />
              <DashboardMetric
                label="Schema Fields"
                value={String(snapshot?.competitionService.positionSchema.fieldCount ?? 0)}
              />
              <DashboardMetric
                label="Account Size"
                value={
                  snapshot?.competitionService.positionSchema.accountSizeBytes != null
                    ? `${snapshot.competitionService.positionSchema.accountSizeBytes} bytes`
                    : "N/A"
                }
              />
              <DashboardMetric
                label="Stream"
                value={snapshot?.competitionService.stream.connectionStatus ?? "idle"}
              />
              <DashboardMetric
                label="Last Close"
                value={formatDate(snapshot?.competitionService.stream.lastCloseEventAt ?? null)}
              />
              <DashboardMetric
                label="Close Events"
                value={compactNumber(snapshot?.competitionService.stream.closeEventsStored ?? 0)}
              />
              <DashboardMetric
                label="Last Signature"
                value={
                  snapshot?.competitionService.stream.lastSignature ? (
                    <span className="break-all text-sm">
                      {snapshot.competitionService.stream.lastSignature}
                    </span>
                  ) : (
                    "N/A"
                  )
                }
              />
              <DashboardMetric
                label="Last Connected"
                value={formatDate(snapshot?.competitionService.stream.lastConnectedAt ?? null)}
              />
              <DashboardMetric
                label="Last Disconnected"
                value={formatDate(snapshot?.competitionService.stream.lastDisconnectedAt ?? null)}
              />
              <DashboardMetric
                label="Reconnects"
                value={compactNumber(snapshot?.competitionService.stream.reconnectAttempts ?? 0)}
              />
            </div>
            {snapshot?.competitionService.health.errorMessage ? (
              <DashboardAlert tone="warning" className="mt-4">
                {snapshot.competitionService.health.errorMessage}
              </DashboardAlert>
            ) : null}
            {snapshot?.competitionService.stream.lastErrorMessage ? (
              <DashboardAlert tone="warning" className="mt-3">
                Stream note: {snapshot.competitionService.stream.lastErrorMessage}
              </DashboardAlert>
            ) : null}
          </DashboardPanel>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Manual Close Event Ingestion"
              description="Paste the normalized close_position payload from the Adrena competition service to persist evidence and recompute the leaderboard"
              action={
                <PrimaryButton
                  onClick={() => void handleIngestCloseEvent()}
                  disabled={ingestingCloseEvent}
                  className="!py-1.5 !px-3 !text-xs"
                >
                  {ingestingCloseEvent ? "Ingesting…" : "Ingest Close Event"}
                </PrimaryButton>
              }
            />
            {servicePayloadError ? (
              <DashboardAlert tone="error" className="mb-4">
                {servicePayloadError}
              </DashboardAlert>
            ) : null}
            <DashboardTextarea
              id="service-close-event"
              value={serviceEventPayload}
              onChange={(event) => setServiceEventPayload(event.target.value)}
              placeholder='{"type":"close_position","decoded":{"owner":"...","positionId":"110159"},"raw":{"signature":"...","slot":"..."}}'
              className="min-h-52 font-mono text-xs"
            />
          </DashboardPanel>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Latest Close Events"
              description="Most recent realized-close evidence persisted for the active competition"
            />
            {snapshot?.competitionService.latestCloseEvents.length ? (
              <div className="space-y-2">
                {snapshot.competitionService.latestCloseEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/admin/participants/${encodeURIComponent(event.wallet)}`}
                    className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 transition hover:bg-neutral-100 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DashboardBadge tone={event.side === "long" ? "green" : "blue"}>
                          {event.side.toUpperCase()}
                        </DashboardBadge>
                        <DashboardBadge tone="neutral">
                          Position #{event.positionId}
                        </DashboardBadge>
                        <DashboardBadge tone="blue">
                          {event.percentageClosedPct.toFixed(2)}%
                        </DashboardBadge>
                      </div>
                      <p className="mt-2 font-geist text-sm font-medium">
                        {event.wallet.slice(0, 8)}… closed {fixed(event.sizeUsd)} USD
                      </p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-neutral-500">
                        {event.signature}
                      </p>
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-1 text-right">
                      <div>
                        <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                          Net PnL
                        </p>
                        <p className="font-geist text-sm font-medium">
                          {fixed(event.netPnlUsd)}
                        </p>
                      </div>
                      <div>
                        <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                          Closed At
                        </p>
                        <p className="font-geist text-sm font-medium">
                          {formatDate(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="font-geist text-sm text-neutral-400">
                No close-position events have been stored yet.
              </p>
            )}
          </DashboardPanel>
        </div>
      )}

      {activeSection === "scheduler" && (
        <DashboardPanel>
          <DashboardPanelHeader
            title="Scheduler Runtime"
            action={
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => void runTick()} disabled={ticking} className="!py-1.5 !px-3 !text-xs">
                  {ticking ? "Running…" : "Run Due Tick"}
                </SecondaryButton>
                <SecondaryButton onClick={() => void runTick(true)} disabled={ticking} className="!py-1.5 !px-3 !text-xs">
                  {ticking ? "Running…" : "Force Tick"}
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => void updateScheduler(!(snapshot?.runtime.schedulerEnabled ?? true))}
                  disabled={savingScheduler}
                  className="!py-1.5 !px-3 !text-xs"
                >
                  {savingScheduler ? "Saving…" : snapshot?.runtime.schedulerEnabled ? "Pause" : "Resume"}
                </SecondaryButton>
              </div>
            }
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardMetric label="Scheduler" value={snapshot?.runtime.schedulerEnabled ? "enabled" : "paused"} />
            <DashboardMetric label="Active Lock" value={snapshot?.runtime.activeLock?.owner ?? "none"} />
            <DashboardMetric label="Refresh Cadence" value={`${snapshot?.runtime.refreshIntervalMinutes ?? 0}m`} />
            <DashboardMetric label="Recompute Cadence" value={`${snapshot?.runtime.recomputeIntervalMinutes ?? 0}m`} />
            <DashboardMetric label="Next Refresh" value={formatDate(snapshot?.runtime.nextRefreshDueAt ?? null)} />
            <DashboardMetric label="Next Recompute" value={formatDate(snapshot?.runtime.nextRecomputeDueAt ?? null)} />
            <DashboardMetric label="Refresh Overdue" value={`${snapshot?.runtime.refreshOverdueMinutes ?? 0}m`} />
            <DashboardMetric label="Recompute Overdue" value={`${snapshot?.runtime.recomputeOverdueMinutes ?? 0}m`} />
            <DashboardMetric label="Last Tick" value={formatDate(snapshot?.runtime.lastTickAt ?? null)} />
            <DashboardMetric label="Last Success" value={formatDate(snapshot?.runtime.lastSuccessfulTickAt ?? null)} />
          </div>
        </DashboardPanel>
      )}

      {activeSection === "metrics" && (
        <DashboardPanel>
          <DashboardPanelHeader title="Pilot Metrics" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            <DashboardMetric label="Score Dispersion" value={fixed(snapshot?.analytics.scoreDispersion ?? 0)} />
            <DashboardMetric label="Top Wallet Share" value={`${fixed(snapshot?.analytics.topParticipantScoreSharePct ?? 0)}%`} />
            <DashboardMetric label="Top 10 Share" value={`${fixed(snapshot?.analytics.topTenScoreSharePct ?? 0)}%`} />
            <DashboardMetric label="Avg Cards / Wallet" value={fixed(snapshot?.analytics.averageCardsCompletedPerParticipant ?? 0)} />
            <DashboardMetric label="Full Set Rate" value={`${fixed(snapshot?.analytics.fullSetCompletionRatePct ?? 0)}%`} />
            <DashboardMetric label="Failed Ingestion" value={compactNumber(snapshot?.analytics.failedIngestionRuns ?? 0)} />
            <DashboardMetric label="Partial Ingestion" value={compactNumber(snapshot?.analytics.partialIngestionRuns ?? 0)} />
            <DashboardMetric label="Runtime Success" value={`${compactNumber(snapshot?.runtime.runCounts.success ?? 0)} / ${compactNumber(snapshot?.runtime.runCounts.total ?? 0)}`} />
          </div>
        </DashboardPanel>
      )}

      {activeSection === "cards" && (
        <DashboardPanel>
          <DashboardPanelHeader
            title="Card Publishing"
            action={
              <PrimaryButton
                onClick={() => void handlePublishCardSet()}
                disabled={publishingCards || activeDraft.cardIds.some((cardId) => !cardId)}
                className="!py-1.5 !px-3 !text-xs"
              >
                {publishingCards ? "Publishing…" : "Publish Set"}
              </PrimaryButton>
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DashboardField label="Day" htmlFor="publish-day">
              <DashboardSelect
                id="publish-day"
                value={activeDayKey}
                onChange={(event) => setSelectedDayKey(event.target.value)}
              >
                {snapshot?.publishedCardSets.map((cardSet) => (
                  <option key={cardSet.dayKey} value={cardSet.dayKey}>
                    {cardSet.dayKey}
                  </option>
                ))}
              </DashboardSelect>
            </DashboardField>
            <DashboardField label="Full Set Bonus" htmlFor="publish-bonus">
              <DashboardInput
                id="publish-bonus"
                type="number"
                min="0"
                step="1"
                value={activeDraft.fullSetBonus}
                onChange={(event) =>
                  updateActiveDraft((current) => ({
                    ...current,
                    fullSetBonus: event.target.value,
                  }))
                }
              />
            </DashboardField>
            {activeDraft.cardIds.map((cardId, index) => (
              <DashboardField
                key={index}
                label={`Card ${index + 1}`}
                htmlFor={`publish-card-${index}`}
              >
                <DashboardSelect
                  id={`publish-card-${index}`}
                  value={cardId}
                  onChange={(event) =>
                    updateActiveDraft((current) => ({
                      ...current,
                      cardIds: current.cardIds.map((entry, entryIndex) =>
                        entryIndex === index ? event.target.value : entry
                      ),
                    }))
                  }
                >
                  <option value="">Select a battlecard</option>
                  {snapshot?.cardCatalog.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.title}
                    </option>
                  ))}
                </DashboardSelect>
              </DashboardField>
            ))}
            <DashboardField label="Operator Note" htmlFor="publish-note">
              <DashboardInput
                id="publish-note"
                value={activeDraft.operatorNote}
                onChange={(event) =>
                  updateActiveDraft((current) => ({
                    ...current,
                    operatorNote: event.target.value,
                  }))
                }
                placeholder="Why this set was published manually"
              />
            </DashboardField>
          </div>
          {activePublishedSet?.cards.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {activePublishedSet.cards.map((card) => (
                <DashboardBadge key={card.id} tone="blue">
                  {card.title}
                </DashboardBadge>
              ))}
            </div>
          ) : null}
        </DashboardPanel>
      )}

      {activeSection === "review" && (
        <DashboardPanel>
          <DashboardPanelHeader title="Review Queue" />
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DashboardMetric label="Open Flags" value={String(snapshot?.counts.openFlags ?? 0)} />
            <DashboardMetric label="Open Disputes" value={String(snapshot?.counts.openDisputes ?? 0)} />
            <DashboardMetric label="Adjustments" value={String(snapshot?.counts.activeAdjustments ?? 0)} />
            <DashboardMetric label="Manual Pts" value={fixed(snapshot?.pointsComposition.adjustmentPoints ?? 0)} />
          </div>
          {snapshot?.reviewQueue.length ? (
            <div className="space-y-1.5">
              {snapshot.reviewQueue.map((flag) => (
                <Link
                  key={flag.id}
                  href={`/dashboard/admin/participants/${encodeURIComponent(flag.wallet)}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-2">
                    <DashboardBadge tone={flag.category === "dispute" ? "amber" : "neutral"}>
                      {flag.category}
                    </DashboardBadge>
                    <span className="font-geist text-sm font-medium">{flag.title}</span>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">{flag.wallet.slice(0, 8)}…</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="font-geist text-sm text-neutral-400">No open review items.</p>
          )}
          {snapshot?.recentAdjustments.length ? (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <p className="mb-2 font-geist text-[11px] uppercase tracking-widest text-neutral-400">
                Recent Adjustments
              </p>
              <div className="space-y-1">
                {snapshot.recentAdjustments.slice(0, 4).map((adjustment) => (
                  <div key={adjustment.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 hover:bg-neutral-50">
                    <span className="font-geist text-sm">
                      {adjustment.wallet.slice(0, 8)}… · {adjustment.metric}
                    </span>
                    <span className="font-geist text-sm font-medium">{fixed(adjustment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DashboardPanel>
      )}

      {activeSection === "participants" && (
        <DashboardPanel>
          <DashboardPanelHeader title="Participant Audit" />
          <div className="space-y-1">
            {snapshot?.latestLeaderboard.map((participant) => (
              <Link
                key={participant.wallet}
                href={`/dashboard/admin/participants/${encodeURIComponent(participant.wallet)}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition hover:bg-neutral-50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-geist text-sm font-medium truncate">{participant.label}</span>
                  <DashboardBadge tone={participant.source === "live" ? "green" : "blue"} className="!text-[10px]">
                    {participant.source}
                  </DashboardBadge>
                </div>
                <div className="shrink-0 flex items-center gap-4">
                  <span className="font-geist text-xs text-neutral-400">#{participant.rank}</span>
                  <span className="font-geist text-sm font-medium tabular-nums">{fixed(participant.score)}</span>
                </div>
              </Link>
            ))}
          </div>
        </DashboardPanel>
      )}

      {activeSection === "scheduler-runs" && (
        <DashboardPanel>
          <DashboardPanelHeader title="Scheduler Runs" />
          {snapshot?.runtime.recentRuns.length ? (
            <div className="space-y-1.5">
              {snapshot.runtime.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <DashboardBadge
                      tone={run.status === "success" ? "green" : run.status === "failed" ? "amber" : "neutral"}
                      className="!text-[10px]"
                    >
                      {run.status}
                    </DashboardBadge>
                    <DashboardBadge tone="blue" className="!text-[10px]">{run.trigger}</DashboardBadge>
                    <span className="font-geist text-sm">
                      {run.executedActions.length ? run.executedActions.join(" + ") : "No actions"}
                    </span>
                  </div>
                  <span className="shrink-0 font-geist text-xs text-neutral-400">
                    {formatDate(run.finishedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-geist text-sm text-neutral-400">No scheduler runs recorded yet.</p>
          )}
        </DashboardPanel>
      )}

      {activeSection === "refresh-runs" && (
        <DashboardPanel>
          <DashboardPanelHeader title="Refresh Runs" />
          {snapshot?.refreshRuns.length ? (
            <div className="space-y-1.5">
              {snapshot.refreshRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <DashboardBadge
                      tone={run.status === "success" ? "green" : run.status === "partial" ? "amber" : "neutral"}
                      className="!text-[10px]"
                    >
                      {run.status}
                    </DashboardBadge>
                    <span className="font-geist text-sm">
                      {run.targetWallet ?? "All wallets"} · {run.participantsSynced} synced · {run.positionsUpserted} upserted
                    </span>
                  </div>
                  <span className="shrink-0 font-geist text-xs text-neutral-400">
                    {formatDate(run.finishedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-geist text-sm text-neutral-400">No refresh runs recorded yet.</p>
          )}
        </DashboardPanel>
      )}
    </div>
  );
}
