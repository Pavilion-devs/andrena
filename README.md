# Adrena Battlecards League

Adrena Battlecards League is a pilot-ready competition layer for Adrena. It turns a standard trading leaderboard into a weekly league with daily battlecards, deterministic scoring, audit trails, and operator tooling.

The app is built as a working prototype, not just a deck. Traders can connect wallets, register for the league, refresh Adrena history, inspect their score evidence, and launch quotes from battlecards. Operators can publish daily card sets, sync the Adrena competition service, review flags and overrides, recompute the league, and monitor runtime health.

## Features

- wallet connection with Solana wallet adapter
- live wallet registration and Adrena position refresh
- daily battlecards, weekly leaderboard, streaks, and raffle tickets
- deterministic score ledger and leaderboard snapshots
- participant history with trade, card, and close-event evidence
- admin ops dashboard for publishing, review, overrides, and recompute
- Supabase-backed pilot storage with a local JSON mirror
- Adrena competition-service integration for health, size multipliers, schema metadata, and close-position events
- standalone realtime worker for competition-service WebSocket ingestion
- safe-mode demo quotes plus gated live mainnet trade submission

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Solana wallet adapter
- Supabase REST-backed persistence
- Adrena public trading APIs
- Adrena competition-service REST and WebSocket feeds

## Getting Started

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To run the realtime worker alongside the app:

```bash
npm run worker:competition-service
```

## Environment

Copy `.env.example` to `.env` and fill in the values you need.

Important variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADRENA_COMPETITION_SERVICE_BASE_URL`
- `ADRENA_COMPETITION_SERVICE_WS_BASE_URL`
- `ADRENA_COMPETITION_SERVICE_API_KEY`
- `COMPETITION_SERVICE_WORKER_APP_URL`
- `NEXT_PUBLIC_ENABLE_MAINNET_TRADES`

## Runtime Notes

- The prototype is currently configured around a fixed pilot week in [lib/config.ts](lib/config.ts).
- The app starts empty on purpose and expects real registered wallets.
- When Supabase is configured, it becomes the primary backend automatically.
- If Supabase is empty on first boot, the app seeds it from the local `data/pilot-db.json` mirror.
- Runtime ticks, service sync state, refresh runs, and leaderboard snapshots are all persisted.

## Safe Mode

The project talks to Adrena's live public transaction builder, so live transaction submission is disabled by default.

Default behavior:

- `Build Demo Quote` returns a non-executable preview for demos
- `Build Live Quote` still proves the live Adrena integration
- `Sign And Send Transaction` stays disabled

To intentionally enable real mainnet trade submission:

```bash
NEXT_PUBLIC_ENABLE_MAINNET_TRADES=true npm run dev
```

Only enable that if you explicitly want to send live trades from the connected wallet.

## Project Structure

- `app/` - routes, pages, and API handlers
- `components/` - dashboard and landing-page UI
- `hooks/` - client-side data and wallet hooks
- `lib/` - scoring, storage, Adrena integrations, runtime, and admin logic
- `scripts/` - standalone worker processes
- `submission/` - public-facing bounty submission materials
- `supabase/` - schema and migration notes

## Submission Docs

The public submission materials are indexed in [submission/README.md](submission/README.md).

## Useful Commands

```bash
npm run dev
npm run worker:competition-service
npm run lint
npm run typecheck
npm run build
```

To override the scoring reference time during demos:

```bash
DEMO_NOW="2026-03-21T12:00:00Z" npm run dev
```
