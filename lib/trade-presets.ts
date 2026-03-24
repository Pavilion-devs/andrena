import type { BattlecardTemplate, QuoteKind } from "@/lib/types";

export interface BattlecardTradePreset {
  kind: QuoteKind;
  tokenSymbol: string;
  collateralTokenSymbol: string;
  collateralAmount: string;
  leverage: string;
  headline: string;
  note: string;
}

function normalizeCardTokenSymbol(symbol?: string) {
  if (!symbol) {
    return "JITOSOL";
  }

  if (symbol === "WBTC") {
    return "WBTC";
  }

  if (symbol === "BTC") {
    return "WBTC";
  }

  if (symbol === "SOL") {
    return "JITOSOL";
  }

  return symbol;
}

export function buildBattlecardTradePreset(card: BattlecardTemplate): BattlecardTradePreset {
  const baseSymbol =
    normalizeCardTokenSymbol("symbols" in card.rule ? card.rule.symbols?.[0] : undefined) ?? "SOL";

  switch (card.rule.type) {
    case "profit_trade":
      return {
        kind: "open-long",
        tokenSymbol: normalizeCardTokenSymbol(card.rule.symbols?.[0]),
        collateralTokenSymbol: "USDC",
        collateralAmount: String(Math.max(25, Math.round((card.rule.minVolumeUsd ?? 2500) / 100))),
        leverage: "5",
        headline: `Set up a ${baseSymbol} long`,
        note: "The card needs a profitable close, so this launches the setup rather than marking the card complete.",
      };
    case "market_focus":
      return {
        kind: "open-long",
        tokenSymbol: baseSymbol,
        collateralTokenSymbol: "USDC",
        collateralAmount: String(Math.max(25, Math.round((card.rule.minVolumeUsd ?? 2000) / 100))),
        leverage: "4",
        headline: `Rotate into ${baseSymbol}`,
        note: "This preset lines up the market focus. Completion still depends on the eventual close matching the card rule.",
      };
    case "leverage_band": {
      const targetLeverage = Math.max(
        card.rule.minLeverage,
        Math.round((card.rule.minLeverage + card.rule.maxLeverage) / 2)
      );

      return {
        kind: "open-long",
        tokenSymbol: normalizeCardTokenSymbol(card.rule.symbols?.[0]),
        collateralTokenSymbol: "USDC",
        collateralAmount: "25",
        leverage: String(targetLeverage),
        headline: `Trade inside the ${card.rule.minLeverage}x-${card.rule.maxLeverage}x band`,
        note: "This preset only targets the leverage band. Card completion still depends on the close landing inside the allowed range.",
      };
    }
    case "sl_tp_close":
      return {
        kind: "open-long",
        tokenSymbol: "SOL",
        collateralTokenSymbol: "USDC",
        collateralAmount: "25",
        leverage: "5",
        headline: "Launch with a take-profit or stop-loss plan",
        note: "Set TP or SL before requesting the quote so the eventual close can satisfy the discipline rule.",
      };
    case "min_duration_trade":
      return {
        kind: "open-long",
        tokenSymbol: normalizeCardTokenSymbol(card.rule.symbols?.[0]),
        collateralTokenSymbol: "USDC",
        collateralAmount: "25",
        leverage: "4",
        headline: "Open a position you intend to hold",
        note: "The card only completes after the close, once the minimum hold duration is met.",
      };
    case "long_and_short_same_day":
      return {
        kind: "open-short",
        tokenSymbol: "SOL",
        collateralTokenSymbol: "USDC",
        collateralAmount: "25",
        leverage: "5",
        headline: "Start the paired long/short day",
        note: "This preset opens the short leg first. You will still need the opposite side on the same day to complete the card.",
      };
  }
}
