# Adrena Battlecards League Pilot

Prototype app for the Adrena bounty research and submission package.

## What it includes

- Next.js MVP frontend
- Supabase-backed pilot database when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured
- local backup mirror in `data/pilot-db.json`
- live wallet registration against Adrena `GET /position`
- injected-wallet connection for Phantom, Backpack, and Solflare-style providers
- Solana wallet-adapter connection and modal-based wallet selection
- anti-whale score engine
- daily battlecards
- leaderboard, streaks, and raffle ticket tracking
- deterministic score ledger and leaderboard snapshot history
- admin ops dashboard with participant audit views
- persisted scheduler runtime, tick logs, and pilot metrics
- official Adrena competition-service sync for health, size-multiplier tiers, and position schema metadata
- close-position event ingestion with persisted realized-PnL evidence
- a standalone competition-service worker that subscribes to Adrena's WebSocket stream and posts normalized events back into the app
- card publishing controls for daily battlecards
- review flags / disputes and manual score-ticket overrides
- participant history/evidence view backed by positions, close events, cards, and ledger records
- trade quote launcher using Adrena public transaction-builder endpoints
- wallet-backed signing and submission of serialized Adrena trade transactions, gated behind an explicit mainnet opt-in

## Run it

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000`

To run the realtime close-event worker alongside the app:

```bash
npm run worker:competition-service
```

## Important prototype notes

- The pilot window is fixed to `March 17, 2026` through `March 23, 2026`.
- The app starts empty on purpose. All participant views are now driven by registered live wallets only.
- When Supabase is configured, it becomes the primary backend automatically.
- If Supabase is empty on first boot, the app seeds it from the local `data/pilot-db.json` snapshot.
- Live wallet refresh uses Adrena's public API and updates the Supabase-backed state plus the local backup mirror.
- The trade launcher now defaults to live-supported Adrena market symbols like `JITOSOL` and `WBTC`.
- Trade quote requests use Adrena's live public builder.
- Real transaction submission is disabled by default. Building a quote is safe; signing and sending is blocked unless you explicitly opt in.
- In safe mode, the trade page also offers `Build Demo Quote`, a non-executable preview derived from live Adrena pool/liquidity context plus live token pricing when available.
- Leaderboard score is `trade points + battlecard points + streak points`.
- Raffle tickets are tracked separately from ranking.
- Runtime ticks can be run from the admin dashboard and are logged with skipped/success/failed status.
- The admin snapshot exposes pilot metrics like score dispersion, top-wallet concentration, full-set rate, and ingestion failures.
- The admin dashboard can sync the team-provided competition service and manually ingest normalized `close_position` events for testing or operator replay.
- The standalone worker connects to the team-provided WebSocket stream and updates admin stream status through the app's service routes.
- Scored trades now record the size-multiplier input and evidence source used during recompute.
- Review items and overrides are stored as explicit records and survive recompute without hidden data edits.

## Mainnet safety

This project currently integrates with Adrena's live public transaction builder. To prevent accidental real-money trades, live submission is off by default.

To keep the app in safe mode:

```bash
npm run dev
```

In that mode:

- `Build Demo Quote` gives you a realistic, non-executable trade preview for demos
- `Build Live Quote` still talks to Adrena's real public builder
- `Sign And Send Transaction` stays disabled

To intentionally enable real mainnet transaction submission:

```bash
NEXT_PUBLIC_ENABLE_MAINNET_TRADES=true npm run dev
```

Only turn that on if you explicitly want the `Sign And Send Transaction` button to submit a live trade.

## Useful files

- `app/page.tsx`
- `app/dashboard/history/page.tsx`
- `app/dashboard/admin/page.tsx`
- `app/dashboard/admin/participants/[wallet]/page.tsx`
- `components/dashboard/wallet-context.tsx`
- `lib/competition.ts`
- `lib/runtime.ts`
- `lib/storage.ts`
- `lib/scoring.ts`
- `lib/adrena.ts`
- `submission/README.md`

## Optional override

To change the reference time for cards and scoring:

```bash
DEMO_NOW="2026-03-21T12:00:00Z" npm run dev
```
