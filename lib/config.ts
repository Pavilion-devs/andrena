import type { BattlecardTemplate, CompetitionConfig, DailyBattlecardSet } from "@/lib/types";

export const competitionConfig: CompetitionConfig = {
  id: "battlecards-pilot-week-1",
  name: "Adrena Battlecards League",
  tagline: "Weekly league mechanics on top of the public Adrena API.",
  description:
    "Pilot week locked to March 17, 2026 through March 23, 2026. Register live wallets, ingest Adrena positions, and run a weekly competition loop from a local operator store.",
  startAt: "2026-03-17T00:00:00Z",
  endAt: "2026-03-23T23:59:59Z",
  referenceNow: "2026-03-21T12:00:00Z",
  minTradeVolumeUsd: 250,
  fullSetBonus: 5,
  dailyVolumeBands: [
    { upTo: 100_000, multiplier: 1 },
    { upTo: 200_000, multiplier: 0.25 },
    { upTo: Number.MAX_SAFE_INTEGER, multiplier: 0 }
  ]
};

export const competitionRuntimeConfig = {
  schedulerEnabled: true,
  refreshIntervalMinutes: 15,
  recomputeIntervalMinutes: 5,
  lockTtlSeconds: 180,
  maxJobRuns: 40,
} as const;

const performanceCards: BattlecardTemplate[] = [
  {
    id: "perf-profit-sol-btc",
    category: "performance",
    difficulty: "medium",
    points: 8,
    title: "Green Close",
    description: "Close one profitable SOL or BTC trade worth at least $2,500 volume.",
    rule: {
      type: "profit_trade",
      symbols: ["SOL", "BTC", "WBTC"],
      minVolumeUsd: 2500,
      minPnlVolumeRatio: 0.1
    }
  },
  {
    id: "perf-jito-focus",
    category: "performance",
    difficulty: "hard",
    points: 12,
    title: "Jito Conviction",
    description: "Close one profitable JitoSOL trade above $4,000 volume.",
    rule: {
      type: "profit_trade",
      symbols: ["JITOSOL"],
      minVolumeUsd: 4000,
      minPnlVolumeRatio: 0.15
    }
  },
  {
    id: "perf-double-green",
    category: "performance",
    difficulty: "hard",
    points: 12,
    title: "Two-Step Finish",
    description: "Close two profitable trades in the same day.",
    rule: {
      type: "profit_trade",
      minVolumeUsd: 1500,
      minPnlVolumeRatio: 0,
      minimumCount: 2
    }
  }
];

const disciplineCards: BattlecardTemplate[] = [
  {
    id: "disc-30m-close",
    category: "discipline",
    difficulty: "easy",
    points: 5,
    title: "No Rush",
    description: "Close one eligible trade after holding it for at least 30 minutes.",
    rule: {
      type: "min_duration_trade",
      minDurationSeconds: 1800
    }
  },
  {
    id: "disc-sl-tp",
    category: "discipline",
    difficulty: "hard",
    points: 12,
    title: "Trade With A Plan",
    description: "Close one trade that exits via stop-loss or take-profit.",
    rule: {
      type: "sl_tp_close"
    }
  },
  {
    id: "disc-leverage-band",
    category: "discipline",
    difficulty: "medium",
    points: 8,
    title: "Controlled Heat",
    description: "Close one trade in the 5x to 12x leverage band.",
    rule: {
      type: "leverage_band",
      minLeverage: 5,
      maxLeverage: 12
    }
  }
];

const styleMarketCards: BattlecardTemplate[] = [
  {
    id: "style-long-short",
    category: "style",
    difficulty: "hard",
    points: 12,
    title: "Balanced Book",
    description: "Complete one long and one short on the same day.",
    rule: {
      type: "long_and_short_same_day"
    }
  },
  {
    id: "market-sol-rotation",
    category: "market",
    difficulty: "easy",
    points: 5,
    title: "SOL Rotation",
    description: "Close one SOL trade above $2,000 volume.",
    rule: {
      type: "market_focus",
      symbols: ["SOL"],
      minVolumeUsd: 2000
    }
  },
  {
    id: "market-btc-rotation",
    category: "market",
    difficulty: "medium",
    points: 8,
    title: "BTC Rotation",
    description: "Close one BTC or WBTC trade above $3,000 volume.",
    rule: {
      type: "market_focus",
      symbols: ["BTC", "WBTC"],
      minVolumeUsd: 3000
    }
  }
];

function cloneCard(card: BattlecardTemplate): BattlecardTemplate {
  return {
    ...card,
    rule: { ...card.rule }
  };
}

const battlecardCatalogBase = [
  ...performanceCards,
  ...disciplineCards,
  ...styleMarketCards,
];

export function getBattlecardCatalog() {
  return battlecardCatalogBase.map(cloneCard);
}

export function getBattlecardTemplate(cardId: string) {
  const card = battlecardCatalogBase.find((entry) => entry.id === cardId);
  return card ? cloneCard(card) : null;
}

function hashDay(dayKey: string) {
  return [...dayKey].reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
}

export function getReferenceNow() {
  return new Date(process.env.DEMO_NOW ?? competitionConfig.referenceNow);
}

export function getDayKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function getDayRange(startAt: string, endAt: string) {
  const days: string[] = [];
  const cursor = new Date(startAt);
  const end = new Date(endAt);

  while (cursor <= end) {
    days.push(getDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export function getCardsForDay(dayKey: string): DailyBattlecardSet {
  if (dayKey === "2026-03-21") {
    return {
      dayKey,
      fullSetBonus: competitionConfig.fullSetBonus,
      cards: [
        cloneCard(performanceCards[0]),
        cloneCard(disciplineCards[0]),
        cloneCard(disciplineCards[1])
      ]
    };
  }

  const seed = hashDay(dayKey);

  return {
    dayKey,
    fullSetBonus: competitionConfig.fullSetBonus,
    cards: [
      cloneCard(performanceCards[seed % performanceCards.length]),
      cloneCard(disciplineCards[(seed + 1) % disciplineCards.length]),
      cloneCard(styleMarketCards[(seed + 2) % styleMarketCards.length])
    ]
  };
}

export function getBattlecardSetsUntilReference() {
  const referenceDay = getDayKey(getReferenceNow());
  const allDays = getDayRange(competitionConfig.startAt, competitionConfig.endAt);

  return allDays
    .filter((dayKey) => dayKey <= referenceDay)
    .map((dayKey) => getCardsForDay(dayKey));
}
