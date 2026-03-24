import Link from "next/link";

const traderSteps = [
  {
    label: "1. Connect & Register",
    copy: "Connect a Solana wallet and join the weekly league as a tracked participant.",
    route: "/dashboard/register",
  },
  {
    label: "2. Refresh Trading History",
    copy: "Fetch live Adrena position history for the registered wallet and store it for scoring.",
    route: "/dashboard/history",
  },
  {
    label: "3. Receive Daily Battlecards",
    copy: "Each day brings a fresh set of cards spanning performance, discipline, and style — turning trading into visible daily objectives.",
    route: "/dashboard/battlecards",
  },
  {
    label: "4. Build a Trade Setup",
    copy: "Battlecards push into the launcher with relevant presets. Safe mode generates realistic demo quotes without mainnet submission.",
    route: "/dashboard/trade",
  },
  {
    label: "5. Earn Score, Streaks & Tickets",
    copy: "Closed trades, completed cards, full-set bonuses, and streak logic feed into deterministic scoring. Raffle tickets tracked separately.",
    route: "/dashboard",
  },
  {
    label: "6. Inspect Personal Evidence",
    copy: "Open history to inspect positions, completed cards, and ledger entries. No black-box leaderboard.",
    route: "/dashboard/history",
  },
];

const operatorSteps = [
  {
    label: "1. Publish Card Set",
    copy: "Define and publish daily battlecards, set the full-set bonus, and attach notes for the active league day.",
    route: "/dashboard/admin",
  },
  {
    label: "2. Refresh Wallet Data",
    copy: "Refresh registered wallets from Adrena and store position updates for scoring — a real ingestion layer, not a static snapshot.",
    route: "/dashboard/admin",
  },
  {
    label: "3. Recompute the League",
    copy: "Rebuild the leaderboard from persisted positions, card records, and ledger logic. Explicit and deterministic.",
    route: "/dashboard/admin",
  },
  {
    label: "4. Review Participant Evidence",
    copy: "Inspect any wallet's positions, card evidence, score ledger, review flags, and manual adjustments.",
    route: "/dashboard/admin",
  },
  {
    label: "5. Handle Flags & Adjustments",
    copy: "Dispute flow, abuse flags, and reversible manual overrides give operators a practical control surface.",
    route: "/dashboard/admin",
  },
  {
    label: "6. Monitor Runtime Health",
    copy: "Scheduler state, refresh runs, recompute runs, and pilot metrics — all visible in one admin surface.",
    route: "/dashboard/admin",
  },
];

const proofBlocks = [
  { label: "Live Adrena Integration", copy: "Real endpoint reads, not mock data" },
  { label: "Safe Demo Path", copy: "Mainnet blocked by default, demo quotes still work" },
  { label: "Deterministic Ledger", copy: "Explicit entries, inspectable, recomputable" },
  { label: "Participant Evidence", copy: "Positions, cards, and history per wallet" },
  { label: "Operator Controls", copy: "Publish, tick, recompute, flag, adjust" },
  { label: "Pilot Metrics", copy: "Dispersion, concentration, completion, failures" },
];

const badges = [
  "Live Adrena Reads",
  "Safe Demo Quotes",
  "Deterministic Scoring",
  "Admin Ops Ready",
];

export default function PilotMapPage() {
  return (
    <div className="font-geist">
      {/* Top summary band */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-neutral-400">
          Pilot System Map
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">
          How Adrena Battlecards Leagues Actually Runs
        </h1>
        <p className="text-sm text-neutral-500 max-w-2xl mt-3">
          This prototype is not just a leaderboard UI. It connects wallet
          registration, live Adrena data, daily battlecards, deterministic
          scoring, audit history, and operator controls into a competition module
          Adrena could pilot with a small invited group.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {badges.map((badge) => (
            <span
              key={badge}
              className="bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-neutral-200"
            >
              {badge}
            </span>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Built for a 7-day pilot with real wallet registration, review tooling,
          and a score ledger that can be recomputed without hidden state.
        </p>
      </div>

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        {/* Trader Loop */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Trader Loop</h2>
          <p className="text-sm text-neutral-500 mt-1">
            The participant side feels like a game but stays grounded in real
            wallet state and real Adrena market integration.
          </p>
          <div className="space-y-2 mt-4">
            {traderSteps.map((step) => (
              <Link
                key={step.label}
                href={step.route}
                className="block border-l-2 border-neutral-200 pl-4 py-2 hover:border-neutral-900 transition-colors"
              >
                <p className="text-sm font-semibold text-neutral-900">
                  {step.label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{step.copy}</p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  {step.route}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Operator Loop */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Operator Loop
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            The competition is built to be run, not just viewed. Operators get
            controls to publish content, recompute scores, and review edge cases.
          </p>
          <div className="space-y-2 mt-4">
            {operatorSteps.map((step) => (
              <Link
                key={step.label}
                href={step.route}
                className="block border-l-2 border-neutral-300 pl-4 py-2 hover:border-neutral-900 transition-colors"
              >
                <p className="text-sm font-semibold text-neutral-900">
                  {step.label}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{step.copy}</p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  {step.route}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom proof strip */}
      <div className="border-t border-neutral-200 pt-6 mt-8">
        <h3 className="text-sm font-semibold tracking-tight">
          Why This Is Pilot-Ready
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          The prototype includes the trust and operations layer needed for a
          controlled Adrena pilot.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
          {proofBlocks.map((block) => (
            <div key={block.label}>
              <p className="text-xs font-semibold text-neutral-700">
                {block.label}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {block.copy}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer line */}
      <p className="mt-6 text-xs text-neutral-300">
        This is the shape of a competition Adrena could run with 20–50 invited
        wallets over a 7-day pilot window.
      </p>
    </div>
  );
}
