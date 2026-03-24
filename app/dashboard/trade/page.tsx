"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardAlert,
  DashboardBadge,
  DashboardField,
  DashboardInput,
  DashboardLoadingHeader,
  DashboardMetric,
  DashboardPageIntro,
  DashboardPanel,
  DashboardPanelHeader,
  DashboardPillButton,
  DashboardSelect,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import { useSelectedParticipant } from "@/components/dashboard/participant-context";
import {
  formatShortWallet,
  useDashboardWallet,
} from "@/components/dashboard/wallet-context";
import { useCompetitionSnapshot } from "@/hooks/use-competition-snapshot";
import { currency, fixed } from "@/lib/format";
import { buildBattlecardTradePreset } from "@/lib/trade-presets";
import type { QuoteKind, QuoteRequestMode } from "@/lib/types";

const quoteLabels: Record<QuoteKind, string> = {
  "open-long": "Open Long",
  "open-short": "Open Short",
  "open-limit-long": "Open Limit Long",
  "open-limit-short": "Open Limit Short",
};

const defaultFormState: Record<string, string> = {
  account: "",
  collateralAmount: "25",
  collateralTokenSymbol: "USDC",
  tokenSymbol: "JITOSOL",
  leverage: "5",
  takeProfit: "",
  stopLoss: "",
  triggerPrice: "",
  limitPrice: "",
};

function toNumberOrNull(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getFieldsForKind(kind: QuoteKind) {
  switch (kind) {
    case "open-long":
    case "open-short":
      return [
        ["account", "Wallet"],
        ["collateralAmount", "Collateral Amount"],
        ["collateralTokenSymbol", "Collateral Token"],
        ["tokenSymbol", "Target Token"],
        ["leverage", "Leverage"],
        ["takeProfit", "Take Profit"],
        ["stopLoss", "Stop Loss"],
      ] as const;
    case "open-limit-long":
    case "open-limit-short":
      return [
        ["account", "Wallet"],
        ["collateralAmount", "Collateral Amount"],
        ["collateralTokenSymbol", "Collateral Token"],
        ["tokenSymbol", "Target Token"],
        ["leverage", "Leverage"],
        ["triggerPrice", "Trigger Price"],
        ["limitPrice", "Limit Price"],
      ] as const;
  }
}

function TradePageContent() {
  const searchParams = useSearchParams();
  const { snapshot, loading } = useCompetitionSnapshot();
  const { selectedParticipant, selectParticipant } = useSelectedParticipant(snapshot);
  const {
    connectedWallet,
    liveTradeSubmissionEnabled,
    liveTradeSubmissionFlagName,
    sendSerializedTransaction,
  } = useDashboardWallet();

  const [kind, setKind] = useState<QuoteKind>("open-long");
  const [form, setForm] = useState<Record<string, string>>({ ...defaultFormState });
  const [submitting, setSubmitting] = useState(false);
  const [requestMode, setRequestMode] = useState<QuoteRequestMode | null>(null);
  const [submittingTransaction, setSubmittingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [appliedCardId, setAppliedCardId] = useState<string | null>(null);
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null);

  const wallets = useMemo(() => {
    const rankedWallets = snapshot?.leaderboard.map((participant) => participant.wallet) ?? [];
    return Array.from(new Set([connectedWallet, ...rankedWallets].filter(Boolean))) as string[];
  }, [connectedWallet, snapshot]);

  const fields = useMemo(() => getFieldsForKind(kind), [kind]);
  const selectedCard = useMemo(() => {
    const cardId = searchParams.get("cardId");

    if (!cardId) {
      return null;
    }

    return snapshot?.dailyBattlecards.cards.find((card) => card.id === cardId) ?? null;
  }, [searchParams, snapshot]);
  const connectedWalletRegistered = Boolean(
    connectedWallet && snapshot?.leaderboard.some((participant) => participant.wallet === connectedWallet)
  );
  const payloadData =
    payload && typeof payload.data === "object" && payload.data ? (payload.data as Record<string, unknown>) : null;
  const payloadMode: QuoteRequestMode =
    payload?.mode === "simulated" ? "simulated" : "live";
  const serializedTransaction =
    payloadData && typeof payloadData.transaction === "string" ? payloadData.transaction : null;
  const simulatedQuote =
    payloadMode === "simulated" && payloadData
      ? {
          notionalUsd: toNumberOrNull(payloadData.notionalUsd),
          entryPriceUsd: toNumberOrNull(payloadData.entryPriceUsd),
          estimatedLiquidationPriceUsd: toNumberOrNull(payloadData.estimatedLiquidationPriceUsd),
          estimatedFeeUsd: toNumberOrNull(payloadData.estimatedFeeUsd),
          estimatedPositionSize: toNumberOrNull(payloadData.estimatedPositionSize),
          risk: readObject(payloadData.risk),
          marketContext: readObject(payloadData.marketContext),
          pricing: readObject(payloadData.pricing),
          disclaimer:
            typeof payloadData.disclaimer === "string" ? payloadData.disclaimer : null,
        }
      : null;

  useEffect(() => {
    setForm((prev) => {
      if (connectedWallet) {
        return prev.account === connectedWallet ? prev : { ...prev, account: connectedWallet };
      }

      if (!prev.account && wallets[0]) {
        return { ...prev, account: wallets[0] };
      }

      if (prev.account) {
        return prev;
      }

      return prev;
    });
  }, [connectedWallet, wallets]);

  useEffect(() => {
    if (connectedWallet || !selectedParticipant) {
      return;
    }

    setForm((prev) =>
      prev.account === selectedParticipant.wallet
        ? prev
        : { ...prev, account: selectedParticipant.wallet }
    );
  }, [connectedWallet, selectedParticipant]);

  useEffect(() => {
    if (!selectedCard) {
      setAppliedCardId(null);
      return;
    }

    if (appliedCardId === selectedCard.id) {
      return;
    }

    const preset = buildBattlecardTradePreset(selectedCard);

    setKind(preset.kind);
    setForm((prev) => ({
      ...prev,
      account: connectedWallet ?? prev.account,
      collateralAmount: preset.collateralAmount,
      collateralTokenSymbol: preset.collateralTokenSymbol,
      tokenSymbol: preset.tokenSymbol,
      leverage: preset.leverage,
    }));
    setPayload(null);
    setSubmittedSignature(null);
    setError(null);
    setAppliedCardId(selectedCard.id);
  }, [appliedCardId, connectedWallet, selectedCard]);

  async function handleQuoteRequest(mode: QuoteRequestMode) {
    setSubmitting(true);
    setRequestMode(mode);
    setError(null);
    setSubmittedSignature(null);

    try {
      const response = await fetch(`/api/competition/quote/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode }),
      });
      const result = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(String(result.error ?? "Failed to fetch quote."));
      }

      setPayload(result);
    } catch (caughtError) {
      setPayload(null);
      setError(caughtError instanceof Error ? caughtError.message : "Failed to fetch quote.");
    } finally {
      setSubmitting(false);
      setRequestMode(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleQuoteRequest(liveTradeSubmissionEnabled ? "live" : "simulated");
  }

  async function handleSubmitTransaction() {
    if (!serializedTransaction) {
      return;
    }

    setSubmittingTransaction(true);
    setError(null);

    try {
      const signature = await sendSerializedTransaction(serializedTransaction);
      setSubmittedSignature(signature);
    } catch (caughtError) {
      setSubmittedSignature(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to sign and submit the Adrena transaction."
      );
    } finally {
      setSubmittingTransaction(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <DashboardLoadingHeader showSubline={false} />
        <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardPageIntro
        eyebrow="Adrena Integration"
        title="Trade Launcher"
        description="Build either a safe simulated preview or a live Adrena quote payload using the connected wallet as the trading account."
      />

      <DashboardPanel>
        <DashboardPanelHeader
          title="Build Quote"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <DashboardBadge tone="blue">{quoteLabels[kind]}</DashboardBadge>
              {connectedWallet ? (
                <DashboardBadge tone="green">
                  Connected: {formatShortWallet(connectedWallet)}
                </DashboardBadge>
              ) : null}
              {selectedParticipant ? (
                <DashboardBadge tone={selectedParticipant.source === "live" ? "green" : "neutral"}>
                  Wallet: {selectedParticipant.label}
                </DashboardBadge>
              ) : null}
            </div>
          }
        />

        {selectedCard ? (
          <DashboardAlert tone="dark" className="mb-5">
            <span className="font-medium text-white">{selectedCard.title}</span> •{" "}
            {buildBattlecardTradePreset(selectedCard).note}
          </DashboardAlert>
        ) : null}

        {connectedWallet && !connectedWalletRegistered ? (
          <DashboardAlert tone="dark" className="mb-5">
            This connected wallet is not registered in the league yet. You can still request a live quote, but registration is required before scoring and history tracking kick in.
          </DashboardAlert>
        ) : null}

        <DashboardAlert tone="warning" className="mb-5">
          {liveTradeSubmissionEnabled ? (
            <>
              Live mainnet trade submission is enabled in this build. If you sign a
              transaction below, it will use real funds on Adrena.
            </>
          ) : (
            <>
              Safe mode is active. Quote requests still hit Adrena&apos;s live builder, but
              transaction submission is disabled until{" "}
              <span className="font-mono font-medium">
                {liveTradeSubmissionFlagName}=true
              </span>{" "}
              is set.
            </>
          )}
        </DashboardAlert>

        {/* {!liveTradeSubmissionEnabled ? (
          <DashboardAlert tone="dark" className="mb-5">
            Safe-mode demos should use <span className="font-medium text-white">Build Demo Quote</span>.
            It creates a non-executable preview from live Adrena pool/liquidity context and live token
            pricing when available, so you can show realistic trade math without needing spendable collateral.
          </DashboardAlert>
        ) : null} */}

        {/* <DashboardAlert tone="dark" className="mb-5">
          Live Adrena market symbols currently resolve to custody tokens like
          <span className="font-medium text-white"> JITOSOL</span>,
          <span className="font-medium text-white"> WBTC</span>, and
          <span className="font-medium text-white"> BONK</span>. The launcher now defaults to supported symbols, and battlecard presets map conceptual SOL/BTC cards to live tradable markets.
        </DashboardAlert> */}

        <div className="mb-5 flex flex-wrap gap-2">
          {wallets.map((wallet) => (
            <DashboardPillButton
              key={wallet}
              active={form.account === wallet}
              onClick={() => {
                selectParticipant(wallet);
                setForm((prev) => ({ ...prev, account: wallet }));
              }}
            >
              {wallet === connectedWallet ? `${formatShortWallet(wallet)} • connected` : wallet}
            </DashboardPillButton>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <DashboardField label="Quote Type" htmlFor="quote-kind">
            <DashboardSelect
              id="quote-kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as QuoteKind);
                setPayload(null);
                setError(null);
              }}
            >
              {Object.entries(quoteLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </DashboardSelect>
          </DashboardField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <DashboardField key={key} label={label} htmlFor={key}>
                <DashboardInput
                  id={key}
                  value={form[key] ?? ""}
                  disabled={key === "account" && Boolean(connectedWallet)}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  placeholder={
                    key === "account" && connectedWallet
                      ? connectedWallet
                      : key === "account"
                        ? "Enter a Solana wallet"
                        : undefined
                  }
                />
              </DashboardField>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {liveTradeSubmissionEnabled ? (
              <>
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting && requestMode === "live"
                    ? "Requesting live quote..."
                    : "Build Live Quote"}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => void handleQuoteRequest("simulated")}
                  disabled={submitting}
                >
                  {submitting && requestMode === "simulated"
                    ? "Building demo quote..."
                    : "Build Demo Quote"}
                </SecondaryButton>
              </>
            ) : (
              <>
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting && requestMode === "simulated"
                    ? "Building demo quote..."
                    : "Build Demo Quote"}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => void handleQuoteRequest("live")}
                  disabled={submitting}
                >
                  {submitting && requestMode === "live"
                    ? "Requesting live quote..."
                    : "Build Live Quote"}
                </SecondaryButton>
              </>
            )}
          </div>
        </form>

        {error ? <DashboardAlert className="mt-4" tone="error">{error}</DashboardAlert> : null}

        {payload ? (
          <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-geist text-sm font-medium">Quote payload received</p>
                <p className="font-geist text-xs text-neutral-500">
                  {payloadMode === "simulated"
                    ? "Inspect the demo quote preview and live market context below."
                    : "Inspect the live Adrena quote body and transaction preview below."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DashboardBadge
                  tone={payloadMode === "simulated" ? "blue" : "green"}
                  className="font-medium"
                >
                  {payloadMode === "simulated" ? "Simulated" : "Live"}
                </DashboardBadge>
                <DashboardBadge tone="green" className="font-medium">
                  Success
                </DashboardBadge>
              </div>
            </div>
            {simulatedQuote ? (
              <>
                <DashboardAlert tone="warning" className="mb-4">
                  {simulatedQuote.disclaimer ??
                    "Demo-only preview. This payload is not executable and does not include a serialized transaction."}
                </DashboardAlert>
                <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <DashboardMetric
                    label="Notional"
                    value={currency(simulatedQuote.notionalUsd)}
                  />
                  <DashboardMetric
                    label="Indicative Entry"
                    value={currency(simulatedQuote.entryPriceUsd)}
                  />
                  <DashboardMetric
                    label="Est. Liquidation"
                    value={currency(simulatedQuote.estimatedLiquidationPriceUsd)}
                  />
                  <DashboardMetric
                    label="Est. Open Fee"
                    value={currency(simulatedQuote.estimatedFeeUsd)}
                  />
                </div>
                <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-white p-4 lg:grid-cols-3">
                  <DashboardMetric
                    label="Position Size"
                    value={
                      simulatedQuote.estimatedPositionSize == null
                        ? "N/A"
                        : fixed(simulatedQuote.estimatedPositionSize)
                    }
                  />
                  <DashboardMetric
                    label="Risk Band"
                    value={String(simulatedQuote.risk?.band ?? "N/A").toUpperCase()}
                  />
                  <DashboardMetric
                    label="Target Utilization"
                    value={
                      simulatedQuote.marketContext?.targetUtilizationPct == null
                        ? "N/A"
                        : `${fixed(
                            Number(simulatedQuote.marketContext.targetUtilizationPct)
                          )}%`
                    }
                  />
                </div>
                {Array.isArray(simulatedQuote.risk?.notes) &&
                simulatedQuote.risk.notes.length > 0 ? (
                  <DashboardAlert tone="dark" className="mb-4">
                    {simulatedQuote.risk.notes.map((note, index) => (
                      <p key={`${note}-${index}`}>{String(note)}</p>
                    ))}
                  </DashboardAlert>
                ) : null}
              </>
            ) : null}
            {serializedTransaction ? (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <PrimaryButton
                  onClick={() => void handleSubmitTransaction()}
                  disabled={
                    !connectedWallet ||
                    submittingTransaction ||
                    !liveTradeSubmissionEnabled
                  }
                >
                  {submittingTransaction
                    ? "Submitting..."
                    : !liveTradeSubmissionEnabled
                      ? "Mainnet Submission Disabled"
                      : connectedWallet
                      ? "Sign And Send Transaction"
                      : "Connect Wallet To Submit"}
                </PrimaryButton>
                {submittedSignature ? (
                  <SecondaryButton
                    onClick={() =>
                      window.open(
                        `https://solscan.io/tx/${submittedSignature}?cluster=mainnet-beta`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    View Signature
                  </SecondaryButton>
                ) : null}
              </div>
            ) : null}
            {!liveTradeSubmissionEnabled && serializedTransaction ? (
              <DashboardAlert tone="warning" className="mb-4">
                This quote is real, but send is blocked in safe mode. Enable{" "}
                <span className="font-mono">{liveTradeSubmissionFlagName}=true</span> only if
                you intentionally want to submit live mainnet transactions.
              </DashboardAlert>
            ) : null}
            {submittedSignature ? (
              <DashboardAlert tone="success" className="mb-4">
                Transaction submitted successfully. Signature:{" "}
                <span className="font-mono">{submittedSignature}</span>
              </DashboardAlert>
            ) : null}
            <pre className="overflow-x-auto rounded-xl bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        ) : null}
      </DashboardPanel>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <DashboardLoadingHeader showSubline={false} />
          <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200" />
        </div>
      }
    >
      <TradePageContent />
    </Suspense>
  );
}
