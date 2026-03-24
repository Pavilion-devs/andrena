"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  DashboardAlert,
  DashboardBadge,
  DashboardField,
  DashboardInput,
  DashboardLoadingGrid,
  DashboardLoadingHeader,
  DashboardMetric,
  DashboardPageIntro,
  DashboardPanel,
  DashboardPanelHeader,
  DashboardSelect,
  DashboardStatCard,
  DashboardTextarea,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import { useCompetitionParticipantAdmin } from "@/hooks/use-competition-participant-admin";
import { currency, fixed, formatDate } from "@/lib/format";

export default function AdminParticipantDetailPage() {
  const params = useParams<{ wallet: string }>();
  const wallet = params?.wallet ? decodeURIComponent(params.wallet) : null;
  const {
    detail,
    loading,
    refreshing,
    recomputing,
    error,
    loadDetail,
    refreshDetail,
    recomputeDetail,
    createFlag,
    resolveFlag,
    createAdjustment,
    voidAdjustment,
  } = useCompetitionParticipantAdmin(wallet);
  const [flagCategory, setFlagCategory] = useState<"abuse" | "dispute" | "scoring" | "data_quality">("abuse");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high">("medium");
  const [flagTitle, setFlagTitle] = useState("");
  const [flagDescription, setFlagDescription] = useState("");
  const [adjustmentMetric, setAdjustmentMetric] = useState<"score" | "ticket">("score");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [adjustmentDayKey, setAdjustmentDayKey] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [voidReasons, setVoidReasons] = useState<Record<string, string>>({});
  const activeAdjustmentDayKey = adjustmentDayKey || detail?.cards[0]?.dayKey || "";

  async function handleCreateFlag() {
    setSubmittingFlag(true);
    const next = await createFlag({
      category: flagCategory,
      severity: flagSeverity,
      title: flagTitle,
      description: flagDescription,
    });
    setSubmittingFlag(false);

    if (next?.participant) {
      setFlagTitle("");
      setFlagDescription("");
    }
  }

  async function handleCreateAdjustment() {
    setSubmittingAdjustment(true);
    const next = await createAdjustment({
      metric: adjustmentMetric,
      amount: Number(adjustmentAmount),
      reason: adjustmentReason,
      note: adjustmentNote,
      dayKey: activeAdjustmentDayKey,
    });
    setSubmittingAdjustment(false);

    if (next?.participant) {
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setAdjustmentNote("");
    }
  }

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader />
        <DashboardLoadingGrid
          count={4}
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          itemClassName="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Participant Audit"
        title={detail?.participant.label ?? "Participant Detail"}
        description={wallet ?? "Missing wallet"}
        actions={
          <>
            {detail?.participant.source === "live" ? (
              <PrimaryButton onClick={() => void refreshDetail()} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh Wallet"}
              </PrimaryButton>
            ) : null}
            <SecondaryButton onClick={() => void recomputeDetail()} disabled={recomputing}>
              {recomputing ? "Recomputing..." : "Recompute"}
            </SecondaryButton>
            <SecondaryButton onClick={() => void loadDetail()}>Reload</SecondaryButton>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin"
          className="font-geist text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          ← Back to Admin
        </Link>
        {detail ? (
          <DashboardBadge tone={detail.participant.source === "live" ? "green" : "blue"}>
            {detail.participant.source}
          </DashboardBadge>
        ) : null}
      </div>

      {error ? <DashboardAlert tone="error">{error}</DashboardAlert> : null}

      {detail ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatCard
              label="League Score"
              value={fixed(detail.snapshot?.score ?? 0)}
              sub={`Rank #${detail.snapshot?.rank ?? "N/A"}`}
            />
            <DashboardStatCard
              label="Eligible Trades"
              value={String(detail.snapshot?.eligibleTrades ?? 0)}
              sub={currency(detail.snapshot?.totalEligibleVolume ?? 0)}
            />
            <DashboardStatCard
              label="Battlecards"
              value={String(detail.snapshot?.todayCardsCompleted ?? 0)}
              sub={`${detail.snapshot?.fullSetsCompleted ?? 0} full sets`}
            />
            <DashboardStatCard
              label="Tickets"
              value={String(detail.snapshot?.raffleTickets ?? 0)}
              sub={`${detail.ledger.filter((entry) => entry.metric === "ticket").length} ticket entries`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardPanel>
              <DashboardPanelHeader
                title="Participant Meta"
                description="Identity, lifecycle, and sync timestamps"
              />
              <div className="grid grid-cols-2 gap-4">
                <DashboardMetric label="Status" value={detail.participant.status} />
                <DashboardMetric label="Source" value={detail.participant.source} />
                <DashboardMetric label="Joined" value={formatDate(detail.participant.joinedAt)} />
                <DashboardMetric
                  label="Last Synced"
                  value={formatDate(detail.participant.lastSyncedAt)}
                />
              </div>
            </DashboardPanel>

            <DashboardPanel>
              <DashboardPanelHeader
                title="Score Breakdown"
                description="Current contribution mix for this wallet"
              />
              <div className="grid grid-cols-2 gap-4">
                <DashboardMetric
                  label="Trade Points"
                  value={fixed(detail.snapshot?.tradePoints ?? 0)}
                />
                <DashboardMetric
                  label="Card Points"
                  value={fixed(detail.snapshot?.battlecardPoints ?? 0)}
                />
                <DashboardMetric
                  label="Streak Points"
                  value={fixed(detail.snapshot?.streakPoints ?? 0)}
                />
                <DashboardMetric
                  label="Adjustment Points"
                  value={fixed(detail.snapshot?.adjustmentPoints ?? 0)}
                />
                <DashboardMetric
                  label="Net PnL"
                  value={currency(detail.snapshot?.totalEligiblePnl ?? 0)}
                />
                <DashboardMetric
                  label="Adjustment Tickets"
                  value={fixed(detail.snapshot?.adjustmentTickets ?? 0)}
                />
              </div>
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardPanel>
              <DashboardPanelHeader
                title="Flag Or Open Dispute"
                description="Create an abuse case, scoring issue, or participant dispute for operator review"
                action={
                  <PrimaryButton onClick={() => void handleCreateFlag()} disabled={submittingFlag}>
                    {submittingFlag ? "Saving..." : "Create Review Item"}
                  </PrimaryButton>
                }
              />
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DashboardField label="Category" htmlFor="flag-category">
                    <DashboardSelect
                      id="flag-category"
                      value={flagCategory}
                      onChange={(event) =>
                        setFlagCategory(
                          event.target.value as "abuse" | "dispute" | "scoring" | "data_quality"
                        )
                      }
                    >
                      <option value="abuse">Abuse</option>
                      <option value="dispute">Dispute</option>
                      <option value="scoring">Scoring</option>
                      <option value="data_quality">Data Quality</option>
                    </DashboardSelect>
                  </DashboardField>
                  <DashboardField label="Severity" htmlFor="flag-severity">
                    <DashboardSelect
                      id="flag-severity"
                      value={flagSeverity}
                      onChange={(event) =>
                        setFlagSeverity(event.target.value as "low" | "medium" | "high")
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </DashboardSelect>
                  </DashboardField>
                </div>
                <DashboardField label="Title" htmlFor="flag-title">
                  <DashboardInput
                    id="flag-title"
                    value={flagTitle}
                    onChange={(event) => setFlagTitle(event.target.value)}
                    placeholder="Why this wallet needs review"
                  />
                </DashboardField>
                <DashboardField label="Description" htmlFor="flag-description">
                  <DashboardTextarea
                    id="flag-description"
                    value={flagDescription}
                    onChange={(event) => setFlagDescription(event.target.value)}
                    placeholder="Capture the suspected exploit, dispute, or evidence gap"
                  />
                </DashboardField>
              </div>
            </DashboardPanel>

            <DashboardPanel>
              <DashboardPanelHeader
                title="Manual Override"
                description="Apply explicit score or ticket adjustments that will survive future recomputes"
                action={
                  <PrimaryButton
                    onClick={() => void handleCreateAdjustment()}
                    disabled={submittingAdjustment}
                  >
                    {submittingAdjustment ? "Applying..." : "Apply Adjustment"}
                  </PrimaryButton>
                }
              />
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DashboardField label="Metric" htmlFor="adjustment-metric">
                    <DashboardSelect
                      id="adjustment-metric"
                      value={adjustmentMetric}
                      onChange={(event) =>
                        setAdjustmentMetric(event.target.value as "score" | "ticket")
                      }
                    >
                      <option value="score">Score</option>
                      <option value="ticket">Ticket</option>
                    </DashboardSelect>
                  </DashboardField>
                  <DashboardField label="Amount" htmlFor="adjustment-amount">
                    <DashboardInput
                      id="adjustment-amount"
                      type="number"
                      step="0.1"
                      value={adjustmentAmount}
                      onChange={(event) => setAdjustmentAmount(event.target.value)}
                      placeholder="5 or -2"
                    />
                  </DashboardField>
                  <DashboardField label="Day Key" htmlFor="adjustment-day">
                    <DashboardInput
                      id="adjustment-day"
                      value={activeAdjustmentDayKey}
                      onChange={(event) => setAdjustmentDayKey(event.target.value)}
                      placeholder="2026-03-21"
                    />
                  </DashboardField>
                </div>
                <DashboardField label="Reason" htmlFor="adjustment-reason">
                  <DashboardInput
                    id="adjustment-reason"
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    placeholder="Operator reason for this override"
                  />
                </DashboardField>
                <DashboardField label="Note" htmlFor="adjustment-note">
                  <DashboardTextarea
                    id="adjustment-note"
                    value={adjustmentNote}
                    onChange={(event) => setAdjustmentNote(event.target.value)}
                    placeholder="Optional detail for later audit"
                  />
                </DashboardField>
              </div>
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardPanel>
              <DashboardPanelHeader
                title="Review Flags"
                description="Open and resolved cases linked to this wallet"
              />
              <div className="space-y-2">
                {detail.flags.length ? (
                  detail.flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <DashboardBadge
                          tone={flag.category === "dispute" ? "amber" : "neutral"}
                        >
                          {flag.category}
                        </DashboardBadge>
                        <DashboardBadge tone="blue">{flag.severity}</DashboardBadge>
                        <DashboardBadge
                          tone={flag.status === "open" ? "amber" : "green"}
                        >
                          {flag.status}
                        </DashboardBadge>
                      </div>
                      <p className="mt-2 font-geist text-sm font-medium">{flag.title}</p>
                      <p className="mt-0.5 font-geist text-xs text-neutral-500">
                        {flag.description}
                      </p>
                      <p className="mt-1 font-geist text-xs text-neutral-400">
                        {formatDate(flag.updatedAt)}
                      </p>
                      {flag.status === "open" ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <DashboardInput
                            id={`resolve-note-${flag.id}`}
                            value={resolutionNotes[flag.id] ?? ""}
                            onChange={(event) =>
                              setResolutionNotes((current) => ({
                                ...current,
                                [flag.id]: event.target.value,
                              }))
                            }
                            placeholder="Resolution note"
                          />
                          <SecondaryButton
                            onClick={async () => {
                              setPendingActionId(flag.id);
                              await resolveFlag(flag.id, resolutionNotes[flag.id]);
                              setPendingActionId(null);
                            }}
                            disabled={pendingActionId === flag.id}
                          >
                            {pendingActionId === flag.id ? "Resolving..." : "Resolve Flag"}
                          </SecondaryButton>
                        </div>
                      ) : flag.resolutionNote ? (
                        <p className="mt-2 font-geist text-xs text-neutral-500">
                          Resolution: {flag.resolutionNote}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="font-geist text-sm text-neutral-500">
                    No review flags recorded for this wallet.
                  </p>
                )}
              </div>
            </DashboardPanel>

            <DashboardPanel>
              <DashboardPanelHeader
                title="Manual Adjustments"
                description="Explicit admin overrides that feed back into recompute"
              />
              <div className="space-y-2">
                {detail.adjustments.length ? (
                  detail.adjustments.map((adjustment) => (
                    <div
                      key={adjustment.id}
                      className="rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <DashboardBadge tone={adjustment.metric === "score" ? "blue" : "amber"}>
                          {adjustment.metric}
                        </DashboardBadge>
                        <DashboardBadge
                          tone={adjustment.status === "active" ? "green" : "neutral"}
                        >
                          {adjustment.status}
                        </DashboardBadge>
                      </div>
                      <p className="mt-2 font-geist text-sm font-medium">
                        {fixed(adjustment.amount)} on {adjustment.dayKey}
                      </p>
                      <p className="mt-0.5 font-geist text-xs text-neutral-500">
                        {adjustment.reason}
                      </p>
                      {adjustment.note ? (
                        <p className="mt-1 font-geist text-xs text-neutral-500">
                          Note: {adjustment.note}
                        </p>
                      ) : null}
                      {adjustment.status === "active" ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <DashboardInput
                            id={`void-note-${adjustment.id}`}
                            value={voidReasons[adjustment.id] ?? ""}
                            onChange={(event) =>
                              setVoidReasons((current) => ({
                                ...current,
                                [adjustment.id]: event.target.value,
                              }))
                            }
                            placeholder="Void reason"
                          />
                          <SecondaryButton
                            onClick={async () => {
                              setPendingActionId(adjustment.id);
                              await voidAdjustment(adjustment.id, voidReasons[adjustment.id]);
                              setPendingActionId(null);
                            }}
                            disabled={pendingActionId === adjustment.id}
                          >
                            {pendingActionId === adjustment.id ? "Voiding..." : "Void Adjustment"}
                          </SecondaryButton>
                        </div>
                      ) : adjustment.voidReason ? (
                        <p className="mt-2 font-geist text-xs text-neutral-500">
                          Void reason: {adjustment.voidReason}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="font-geist text-sm text-neutral-500">
                    No manual adjustments recorded for this wallet.
                  </p>
                )}
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Card Evidence"
              description="Daily card assignment and the position IDs that satisfied each card"
            />
            <div className="space-y-2">
              {detail.cards.slice(0, 18).map((card) => (
                <div
                  key={card.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <DashboardBadge tone={card.status === "completed" ? "green" : "neutral"}>
                        {card.status}
                      </DashboardBadge>
                      <DashboardBadge tone="blue">{card.dayKey}</DashboardBadge>
                    </div>
                    <p className="mt-2 font-geist text-sm font-medium">{card.title}</p>
                    <p className="mt-0.5 font-geist text-xs text-neutral-500">{card.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-geist text-sm font-medium">+{card.points}</p>
                    <p className="font-geist text-xs text-neutral-400">
                      Evidence: {card.evidencePositionIds.length ? card.evidencePositionIds.join(", ") : "none"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Recent Positions"
              description="Persisted position records for this wallet"
            />
            <div className="space-y-2">
              {detail.positions.slice(0, 10).map((position) => (
                <div
                  key={position.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-geist text-sm font-medium">
                      {position.side.toUpperCase()} {position.symbol}
                    </p>
                    <p className="mt-0.5 font-geist text-xs text-neutral-500">
                      {formatDate(position.exit_date ?? position.entry_date)} • {currency(position.volume)} volume
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        PnL
                      </p>
                      <p className="font-geist text-sm font-medium">{currency(position.pnl)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        Ratio
                      </p>
                      <p className="font-geist text-sm font-medium">
                        {fixed(position.pnl_volume_ratio)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[10px] uppercase tracking-widest text-neutral-400">
                        Leverage
                      </p>
                      <p className="font-geist text-sm font-medium">
                        {position.entry_leverage == null ? "N/A" : `${fixed(position.entry_leverage)}x`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Realized Close Events"
              description="Official close_position evidence captured from the Adrena competition service"
            />
            <div className="space-y-2">
              {detail.closeEvents.length ? (
                detail.closeEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DashboardBadge tone={event.side === "long" ? "green" : "blue"}>
                          {event.side.toUpperCase()}
                        </DashboardBadge>
                        <DashboardBadge tone="blue">Position #{event.positionId}</DashboardBadge>
                        <DashboardBadge tone="neutral">
                          {fixed(event.percentageClosedPct)}%
                        </DashboardBadge>
                      </div>
                      <p className="mt-2 font-geist text-sm font-medium">
                        {currency(event.sizeUsd)} closed at {currency(event.priceUsd)}
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
                          {currency(event.netPnlUsd)}
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
                  </div>
                ))
              ) : (
                <p className="font-geist text-sm text-neutral-500">
                  No close-position events have been stored for this wallet yet.
                </p>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel>
            <DashboardPanelHeader
              title="Ledger Trail"
              description="Deterministic score and ticket entries for this participant"
            />
            <div className="space-y-2">
              {detail.ledger.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <DashboardBadge tone={entry.metric === "score" ? "blue" : "amber"}>
                        {entry.metric}
                      </DashboardBadge>
                      <DashboardBadge>{entry.sourceType}</DashboardBadge>
                    </div>
                    <p className="mt-2 font-geist text-sm font-medium">{entry.sourceRef}</p>
                    <p className="mt-0.5 font-geist text-xs text-neutral-500">
                      {entry.dayKey} • {formatDate(entry.createdAt)}
                    </p>
                    {typeof entry.metadata.sizeMultiplier === "number" ? (
                      <p className="mt-1 font-geist text-xs text-neutral-500">
                        Size multiplier: {fixed(entry.metadata.sizeMultiplier)}x
                        {typeof entry.metadata.evidenceSource === "string"
                          ? ` • source: ${entry.metadata.evidenceSource}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-geist text-sm font-medium">
                    {entry.metric === "score" ? "+" : ""}{fixed(entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </>
      ) : (
        <DashboardAlert tone="error">Participant not found.</DashboardAlert>
      )}
    </div>
  );
}
