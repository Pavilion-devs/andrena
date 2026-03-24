import type {
  AdrenaPosition,
  MarketPulse,
  QuoteKind,
  QuoteRequestMode,
} from "@/lib/types";

const ADRENA_BASE_URL = process.env.ADRENA_BASE_URL ?? "https://datapi.adrena.trade";
const COINGECKO_BASE_URL = "https://api.coingecko.com";
const coingeckoIdsBySymbol = {
  BONK: "bonk",
  JITOSOL: "jito-staked-sol",
  USDC: "usd-coin",
  WBTC: "wrapped-bitcoin",
} as const;
const fallbackTokenPricesUsd: Record<string, number> = {
  BONK: 0.00002,
  JITOSOL: 200,
  USDC: 1,
  WBTC: 90000,
};

interface CustodySnapshot {
  symbol: string;
  mint: string | null;
  utilizationPct: number | null;
  currentWeightagePct: number | null;
  targetWeightagePct: number | null;
}

interface TokenPriceSnapshot {
  priceUsd: number;
  source: "coingecko" | "fallback";
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundTo(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function upperCaseValue(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function readRequiredString(body: Record<string, unknown>, key: string, label: string) {
  const value = String(body[key] ?? "").trim();

  if (!value) {
    throw new Error(`A ${label} is required to build a quote preview.`);
  }

  return value;
}

function readRequiredPositiveNumber(
  body: Record<string, unknown>,
  key: string,
  label: string
) {
  const value = toOptionalNumber(body[key]);

  if (value == null || value <= 0) {
    throw new Error(`A valid ${label} is required to build a quote preview.`);
  }

  return value;
}

function readOptionalPositiveNumber(body: Record<string, unknown>, key: string) {
  const value = toOptionalNumber(body[key]);
  return value != null && value > 0 ? value : null;
}

function normalizePosition(position: Record<string, unknown>): AdrenaPosition {
  return {
    position_id: toNumber(position.position_id),
    symbol: String(position.symbol ?? "UNKNOWN"),
    side: String(position.side ?? "long").toLowerCase() === "short" ? "short" : "long",
    status: String(position.status ?? "unknown"),
    entry_price: position.entry_price == null ? null : toNumber(position.entry_price),
    exit_price: position.exit_price == null ? null : toNumber(position.exit_price),
    pnl: position.pnl == null ? null : toNumber(position.pnl),
    entry_leverage: position.entry_leverage == null ? null : toNumber(position.entry_leverage),
    entry_date: String(position.entry_date ?? new Date().toISOString()),
    exit_date: position.exit_date == null ? null : String(position.exit_date),
    fees: position.fees == null ? null : toNumber(position.fees),
    borrow_fees: position.borrow_fees == null ? null : toNumber(position.borrow_fees),
    closed_by_sl_tp: Boolean(position.closed_by_sl_tp),
    volume: toNumber(position.volume),
    duration: toNumber(position.duration),
    pnl_volume_ratio: toNumber(position.pnl_volume_ratio),
    source: "live"
  };
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Remote service returned non-JSON content: ${text.slice(0, 120)}`);
  }
}

function describeAdrenaError(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : null;

  if (code && message) {
    return `${code}: ${message}`;
  }

  if (message) {
    return message;
  }

  if (code) {
    return code;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function fetchPoolHighLevelStatsPayload() {
  const response = await fetch(new URL("/pool-high-level-stats", ADRENA_BASE_URL), {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload.success === false) {
    throw new Error(
      describeAdrenaError(payload.error) ?? "Failed to fetch Adrena pool stats."
    );
  }

  return payload?.data && typeof payload.data === "object"
    ? (payload.data as Record<string, unknown>)
    : null;
}

async function fetchLiquidityInfoPayload() {
  const response = await fetch(new URL("/liquidity-info", ADRENA_BASE_URL), {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload.success === false) {
    throw new Error(
      describeAdrenaError(payload.error) ?? "Failed to fetch Adrena liquidity info."
    );
  }

  return payload?.data && typeof payload.data === "object"
    ? (payload.data as Record<string, unknown>)
    : null;
}

function normalizeCustodies(payload: Record<string, unknown> | null) {
  const custodies = payload?.custodies;

  if (!Array.isArray(custodies)) {
    return [] as CustodySnapshot[];
  }

  return custodies.map((custody) => {
    const record =
      custody && typeof custody === "object"
        ? (custody as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    return {
      symbol: upperCaseValue(record.symbol) || "UNKNOWN",
      mint: record.mint == null ? null : String(record.mint),
      utilizationPct:
        record.utilizationPct == null ? null : toNumber(record.utilizationPct),
      currentWeightagePct:
        record.currentWeightagePct == null
          ? null
          : toNumber(record.currentWeightagePct),
      targetWeightagePct:
        record.targetWeightagePct == null ? null : toNumber(record.targetWeightagePct),
    };
  });
}

async function fetchTokenPrices(symbols: string[]) {
  const ids = Array.from(
    new Set(
      symbols
        .map((symbol) => coingeckoIdsBySymbol[symbol as keyof typeof coingeckoIdsBySymbol])
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return {} as Record<string, TokenPriceSnapshot>;
  }

  const url = new URL("/api/v3/simple/price", COINGECKO_BASE_URL);
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`CoinGecko returned ${response.status} while fetching token prices.`);
  }

  const payload = (await parseJsonResponse(response)) as Record<
    string,
    { usd?: number }
  >;
  const prices: Record<string, TokenPriceSnapshot> = {};

  for (const symbol of symbols) {
    const id = coingeckoIdsBySymbol[symbol as keyof typeof coingeckoIdsBySymbol];

    if (!id) {
      continue;
    }

    const usdPrice = payload[id]?.usd;

    if (typeof usdPrice === "number" && Number.isFinite(usdPrice) && usdPrice > 0) {
      prices[symbol] = {
        priceUsd: usdPrice,
        source: "coingecko",
      };
    }
  }

  return prices;
}

function resolveTokenPrice(
  symbol: string,
  livePrices: Record<string, TokenPriceSnapshot>
): TokenPriceSnapshot {
  if (livePrices[symbol]) {
    return livePrices[symbol];
  }

  const fallbackPrice = fallbackTokenPricesUsd[symbol];

  if (fallbackPrice) {
    return {
      priceUsd: fallbackPrice,
      source: "fallback",
    };
  }

  throw new Error(`No demo price source is available yet for ${symbol}.`);
}

function getQuoteShape(kind: QuoteKind) {
  const side = kind.includes("short") ? "short" : "long";
  const orderType = kind.includes("limit") ? "limit" : "market";

  return { orderType, side };
}

function buildRiskBand(
  leverage: number,
  utilizationPct: number | null,
  hasStopLoss: boolean
) {
  let score = 0;

  if (leverage >= 10) {
    score += 2;
  } else if (leverage >= 5) {
    score += 1;
  }

  if (utilizationPct != null && utilizationPct >= 60) {
    score += 2;
  } else if (utilizationPct != null && utilizationPct >= 25) {
    score += 1;
  }

  if (!hasStopLoss) {
    score += 1;
  }

  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "controlled";
}

export async function fetchPositions(wallet: string) {
  const url = new URL("/position", ADRENA_BASE_URL);
  url.searchParams.set("user_wallet", wallet);
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload.success === false) {
    throw new Error(
      describeAdrenaError(payload.error) ?? `Failed to fetch positions for ${wallet}`
    );
  }

  return Array.isArray(payload.data)
    ? payload.data.map((position: Record<string, unknown>) => normalizePosition(position))
    : [];
}

export async function fetchMarketPulse(): Promise<MarketPulse | null> {
  const poolRequest = fetchPoolHighLevelStatsPayload();
  const liquidityRequest = fetchLiquidityInfoPayload();

  const [poolResult, liquidityResult] = await Promise.allSettled([poolRequest, liquidityRequest]);

  if (poolResult.status !== "fulfilled" && liquidityResult.status !== "fulfilled") {
    return null;
  }

  let dailyVolumeUsd: number | null = null;
  let dailyFeesUsd: number | null = null;
  let poolName = "main";

  if (poolResult.status === "fulfilled") {
    const payload = poolResult.value;

    if (payload) {
      dailyVolumeUsd = payload.daily_volume_usd == null ? null : Number(payload.daily_volume_usd);
      dailyFeesUsd = payload.daily_fee_usd == null ? null : Number(payload.daily_fee_usd);
      poolName = String(payload.pool_name ?? "main");
    }
  }

  let topCustodySymbol: string | null = null;
  let topCustodyUtilizationPct: number | null = null;

  if (liquidityResult.status === "fulfilled") {
    const custodies = normalizeCustodies(liquidityResult.value);

    if (custodies.length > 0) {
      const topCustody = custodies
        .sort(
          (left, right) =>
            (right.utilizationPct ?? 0) - (left.utilizationPct ?? 0)
        )[0];

      topCustodySymbol = topCustody.symbol;
      topCustodyUtilizationPct = topCustody.utilizationPct ?? null;
    }
  }

  return {
    poolName,
    dailyVolumeUsd,
    dailyFeesUsd,
    topCustodySymbol,
    topCustodyUtilizationPct
  };
}

const quoteParameterMap: Record<QuoteKind, string[]> = {
  "open-long": [
    "account",
    "collateralAmount",
    "collateralTokenSymbol",
    "tokenSymbol",
    "leverage",
    "takeProfit",
    "stopLoss"
  ],
  "open-short": [
    "account",
    "collateralAmount",
    "collateralTokenSymbol",
    "tokenSymbol",
    "leverage",
    "takeProfit",
    "stopLoss"
  ],
  "open-limit-long": [
    "account",
    "collateralTokenSymbol",
    "tokenSymbol",
    "collateralAmount",
    "leverage",
    "triggerPrice",
    "limitPrice"
  ],
  "open-limit-short": [
    "account",
    "collateralTokenSymbol",
    "tokenSymbol",
    "collateralAmount",
    "leverage",
    "triggerPrice",
    "limitPrice"
  ]
};

export async function buildTradeQuote(kind: QuoteKind, body: Record<string, unknown>) {
  const allowedParameters = quoteParameterMap[kind];
  const url = new URL(`/${kind}`, ADRENA_BASE_URL);

  for (const parameter of allowedParameters) {
    const value = body[parameter];

    if (value != null && String(value).trim() !== "") {
      url.searchParams.set(parameter, String(value).trim());
    }
  }

  if (!url.searchParams.get("account")) {
    throw new Error("An account wallet is required to request an Adrena quote.");
  }

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload.success === false) {
    throw new Error(describeAdrenaError(payload.error) ?? `Failed to build ${kind} quote.`);
  }

  return payload;
}

export async function buildSimulatedTradeQuote(
  kind: QuoteKind,
  body: Record<string, unknown>
) {
  const mode: QuoteRequestMode = "simulated";
  const account = readRequiredString(body, "account", "wallet");
  const collateralAmount = readRequiredPositiveNumber(
    body,
    "collateralAmount",
    "collateral amount"
  );
  const leverage = readRequiredPositiveNumber(body, "leverage", "leverage");
  const collateralTokenSymbol = upperCaseValue(
    readRequiredString(body, "collateralTokenSymbol", "collateral token")
  );
  const tokenSymbol = upperCaseValue(readRequiredString(body, "tokenSymbol", "target token"));
  const takeProfit = readOptionalPositiveNumber(body, "takeProfit");
  const stopLoss = readOptionalPositiveNumber(body, "stopLoss");
  const triggerPrice = readOptionalPositiveNumber(body, "triggerPrice");
  const limitPrice = readOptionalPositiveNumber(body, "limitPrice");
  const { orderType, side } = getQuoteShape(kind);

  const [poolStats, liquidityPayload, livePrices] = await Promise.all([
    fetchPoolHighLevelStatsPayload().catch(() => null),
    fetchLiquidityInfoPayload().catch(() => null),
    fetchTokenPrices([collateralTokenSymbol, tokenSymbol]).catch(
      () => ({} as Record<string, TokenPriceSnapshot>)
    ),
  ]);
  const marketPulse: MarketPulse | null = poolStats
    ? {
        poolName: String(poolStats.pool_name ?? "main"),
        dailyVolumeUsd:
          poolStats.daily_volume_usd == null ? null : Number(poolStats.daily_volume_usd),
        dailyFeesUsd:
          poolStats.daily_fee_usd == null ? null : Number(poolStats.daily_fee_usd),
        topCustodySymbol: null,
        topCustodyUtilizationPct: null,
      }
    : null;

  const custodies = normalizeCustodies(liquidityPayload);
  const collateralCustody =
    custodies.find((custody) => custody.symbol === collateralTokenSymbol) ?? null;
  const targetCustody = custodies.find((custody) => custody.symbol === tokenSymbol) ?? null;
  const collateralPrice = resolveTokenPrice(collateralTokenSymbol, livePrices);
  const targetPrice = resolveTokenPrice(tokenSymbol, livePrices);
  const referenceEntryPriceUsd =
    orderType === "limit" ? limitPrice ?? triggerPrice ?? targetPrice.priceUsd : targetPrice.priceUsd;
  const notionalUsd = collateralAmount * collateralPrice.priceUsd * leverage;
  const estimatedPositionSize =
    referenceEntryPriceUsd > 0 ? notionalUsd / referenceEntryPriceUsd : null;
  const effectiveFeeRatePct =
    marketPulse?.dailyFeesUsd != null &&
    marketPulse.dailyVolumeUsd != null &&
    marketPulse.dailyVolumeUsd > 0
      ? (marketPulse.dailyFeesUsd / marketPulse.dailyVolumeUsd) * 100
      : null;
  const estimatedFeeUsd =
    effectiveFeeRatePct == null ? null : notionalUsd * (effectiveFeeRatePct / 100);
  const liquidationDistancePct = Math.min(95, Math.max(2, 88 / leverage));
  const estimatedLiquidationPriceUsd =
    side === "long"
      ? referenceEntryPriceUsd * (1 - liquidationDistancePct / 100)
      : referenceEntryPriceUsd * (1 + liquidationDistancePct / 100);
  const riskBand = buildRiskBand(
    leverage,
    targetCustody?.utilizationPct ?? null,
    stopLoss != null
  );
  const riskNotes = [
    `Indicative ${side} ${orderType} preview only.`,
    stopLoss
      ? "Stop loss is present, which lowers modeled demo risk."
      : "No stop loss set, so downside discipline is modeled as weaker.",
    targetCustody?.utilizationPct != null
      ? `${tokenSymbol} utilization is ${roundTo(targetCustody.utilizationPct, 2)}% in live Adrena liquidity.`
      : `Live utilization for ${tokenSymbol} was unavailable, so only leverage drove the risk band.`,
  ];

  return {
    success: true,
    mode,
    error: null,
    data: {
      executable: false,
      transaction: null,
      quoteKind: kind,
      orderType,
      side,
      account,
      collateralTokenSymbol,
      tokenSymbol,
      collateralAmount: roundTo(collateralAmount, 4),
      leverage: roundTo(leverage, 2),
      collateralPriceUsd: roundTo(collateralPrice.priceUsd, 6),
      targetPriceUsd: roundTo(targetPrice.priceUsd, 6),
      entryPriceUsd: roundTo(referenceEntryPriceUsd, 6),
      notionalUsd: roundTo(notionalUsd, 2),
      estimatedPositionSize:
        estimatedPositionSize == null ? null : roundTo(estimatedPositionSize, 6),
      estimatedLiquidationPriceUsd: roundTo(estimatedLiquidationPriceUsd, 6),
      estimatedFeeUsd: estimatedFeeUsd == null ? null : roundTo(estimatedFeeUsd, 4),
      takeProfit,
      stopLoss,
      triggerPrice,
      limitPrice,
      marketContext: {
        poolName: marketPulse?.poolName ?? "main",
        dailyVolumeUsd: marketPulse?.dailyVolumeUsd ?? null,
        dailyFeesUsd: marketPulse?.dailyFeesUsd ?? null,
        effectiveFeeRatePct:
          effectiveFeeRatePct == null ? null : roundTo(effectiveFeeRatePct, 4),
        collateralUtilizationPct:
          collateralCustody?.utilizationPct == null
            ? null
            : roundTo(collateralCustody.utilizationPct, 2),
        targetUtilizationPct:
          targetCustody?.utilizationPct == null
            ? null
            : roundTo(targetCustody.utilizationPct, 2),
        targetCurrentWeightPct:
          targetCustody?.currentWeightagePct == null
            ? null
            : roundTo(targetCustody.currentWeightagePct, 2),
        targetWeightTargetPct:
          targetCustody?.targetWeightagePct == null
            ? null
            : roundTo(targetCustody.targetWeightagePct, 2),
      },
      pricing: {
        collateral: {
          symbol: collateralTokenSymbol,
          mint: collateralCustody?.mint ?? null,
          priceUsd: roundTo(collateralPrice.priceUsd, 6),
          source: collateralPrice.source,
        },
        target: {
          symbol: tokenSymbol,
          mint: targetCustody?.mint ?? null,
          priceUsd: roundTo(targetPrice.priceUsd, 6),
          source: targetPrice.source,
        },
      },
      risk: {
        band: riskBand,
        notes: riskNotes,
        model: "indicative-demo-quote",
      },
      disclaimer:
        "Simulated preview only. Uses live Adrena liquidity and pool context, plus live token pricing when available. No executable transaction is generated.",
    },
  };
}
