# Prototype Architecture

## 1. Technical objective

Ship a pilot-ready competition module that:

- registers participant wallets
- displays daily battlecards
- fetches and scores eligible Adrena trades
- maintains a live leaderboard
- tracks streaks and raffle tickets
- launches trades through Adrena's quote/transaction endpoints

## 2. Proposed stack

Use a simple, deployable TypeScript stack.

### Frontend

- Next.js
- React
- server-side rendering for public leaderboard pages
- wallet connection for participant registration and trade launch

### Backend API

- Node.js + TypeScript
- Fastify or Express
- REST API

### Worker / scheduler

- Node worker process
- cron or queue-driven polling

### Data layer

- PostgreSQL for system state
- Redis for short-lived caching, locks, and job coordination

### Deployment

- frontend on Vercel or equivalent
- API + worker in containers on Fly.io, Railway, Render, ECS, or equivalent
- managed Postgres
- managed Redis

## 3. Adrena integration map

## Public endpoints already available

### Trading / transaction builders

- `GET /open-long`
- `GET /open-short`
- `GET /close-long`
- `GET /close-short`
- `GET /open-limit-long`
- `GET /open-limit-short`
- `GET /add-liquidity`
- `GET /remove-liquidity`

These return:

- quote data
- serialized transaction payload

Competition UI can call these directly through the backend or client-safe proxying layer.

### Read endpoints

- `GET /position`
- `GET /pool-high-level-stats`
- `GET /liquidity-info`
- `GET /apr`

For MVP, `GET /position` is the core scoring source.

## 4. High-level system components

### 4.1 League service

Responsibilities:

- create leagues
- manage registration windows
- store card templates and league config
- expose leaderboard and user state

### 4.2 Card engine

Responsibilities:

- generate daily battlecards
- assign card sets
- evaluate completion conditions
- award points and raffle tickets

### 4.3 Position ingestor

Responsibilities:

- poll Adrena `position` endpoint for registered wallets
- upsert trade state
- detect newly eligible closed trades
- forward them to the scorer

### 4.4 Scoring engine

Responsibilities:

- compute `trade_points`
- compute card rewards
- compute streak rewards
- write an idempotent score ledger
- rebuild leaderboard snapshots

### 4.5 Raffle engine

Responsibilities:

- create ticket entries
- close raffle windows
- pick winners from ticket pools
- provide audit logs

### 4.6 Trade launcher

Responsibilities:

- let users launch card-relevant trades
- prefill order params
- attach metadata for pilot analytics
- keep a record of launcher-originated card attempts

## 5. Suggested frontend routes

- `/competition`
- `/competition/leaderboard`
- `/competition/me`
- `/competition/cards`
- `/competition/history`
- `/competition/admin`

### Main participant UI

Should display:

- current weekly rank
- score breakdown
- today's 3 cards
- streak state
- raffle tickets
- eligible promoted markets
- quick trade actions

## 6. Suggested backend routes

### Public / participant routes

- `POST /api/competitions/:id/register`
- `GET /api/competitions/:id`
- `GET /api/competitions/:id/leaderboard`
- `GET /api/competitions/:id/me`
- `GET /api/competitions/:id/me/cards`
- `GET /api/competitions/:id/me/history`
- `POST /api/trade-quote/open-long`
- `POST /api/trade-quote/open-short`
- `POST /api/trade-quote/open-limit-long`
- `POST /api/trade-quote/open-limit-short`

### Admin routes

- `POST /api/admin/competitions`
- `POST /api/admin/competitions/:id/publish-cards`
- `POST /api/admin/competitions/:id/recompute`
- `POST /api/admin/competitions/:id/raffles/draw`
- `GET /api/admin/competitions/:id/flags`

## 7. Core database tables

### competitions

- `id`
- `name`
- `status`
- `start_at`
- `end_at`
- `config_snapshot`

### participants

- `id`
- `competition_id`
- `wallet`
- `registered_at`
- `status`

### card_templates

- `id`
- `key`
- `category`
- `difficulty`
- `rule_json`
- `active`

### daily_card_sets

- `id`
- `competition_id`
- `day_key`
- `published_at`

### participant_cards

- `id`
- `competition_id`
- `participant_id`
- `card_template_id`
- `day_key`
- `status`
- `completed_at`
- `evidence_json`

### positions

- `id`
- `competition_id`
- `wallet`
- `position_id`
- `symbol`
- `side`
- `status`
- `entry_date`
- `exit_date`
- `volume`
- `duration`
- `pnl_volume_ratio`
- `closed_by_sl_tp`
- `raw_payload`

### score_ledger

- `id`
- `competition_id`
- `participant_id`
- `source_type`
- `source_ref`
- `points_delta`
- `reason`
- `created_at`

### leaderboard_snapshots

- `id`
- `competition_id`
- `captured_at`
- `rankings_json`

### raffle_entries

- `id`
- `competition_id`
- `participant_id`
- `source_type`
- `source_ref`
- `ticket_count`

### review_flags

- `id`
- `competition_id`
- `participant_id`
- `flag_type`
- `details_json`
- `status`

## 8. Position ingestion flow

### Polling model for MVP

1. Every 60 to 120 seconds, fetch participant wallet batches.
2. Call Adrena `GET /position` per wallet.
3. Upsert returned positions.
4. Detect positions whose terminal status changed or were newly discovered.
5. Evaluate eligibility.
6. If eligible and not yet scored, score them.
7. Recalculate participant aggregates.
8. Update leaderboard snapshot cache.

### Why polling is acceptable for MVP

- participant count is small
- bounty explicitly allows a small-group test competition
- public API is wallet-centric

### Production upgrade path

Replace wallet polling with one of:

- internal Adrena event/indexer feed
- event webhooks
- database replication or trusted read API

## 9. Card evaluation model

Card rules should be data-driven.

Example rule types:

- `profit_trade`
- `min_duration_trade`
- `long_and_short_same_day`
- `sl_tp_close`
- `market_focus`
- `limit_order_fill`
- `leverage_band`

Each card stores:

- required conditions
- completion window
- evidence query rules
- point value

This keeps the engine configurable without code changes for every new event.

## 10. Trade launcher integration

The competition frontend should help users complete cards instead of sending them to the generic Adrena experience.

### Examples

- if the card is `close a trade with TP/SL`, prefill the quote call with `takeProfit` and `stopLoss`
- if the card is `complete a limit-order entry`, route through `open-limit-long` or `open-limit-short`
- if the card is `complete one long and one short`, surface both quick actions

### MVP recommendation

Store `launcher_event` rows when users request quotes via the competition UI.

Benefits:

- better analytics
- easier debugging
- future card types can depend on launcher-originated intent

## 11. Leaderboard calculation

Leaderboard can be updated in two layers:

### Real-time cache

- updated whenever new score ledger entries land
- powers the app view

### Durable snapshots

- written every 5 minutes
- powers admin audit and after-action review

## 12. Anti-abuse operational design

### Automated flags

- too many low-volume trades clustered in time
- many wallets using the same pattern set
- unusually synchronized opens/closes
- excessive ratio of volume to card diversity

### Manual review

For pilot scale, manual review is acceptable.

Admin tools should support:

- participant summary
- recent positions
- score ledger
- ticket ledger
- flags

## 13. Deployment and config

### Environment variables

- `DATABASE_URL`
- `REDIS_URL`
- `ADRENA_BASE_URL`
- `COMPETITION_DEFAULT_TIMEZONE`
- `POLL_INTERVAL_MS`
- `LEADERBOARD_SNAPSHOT_MS`
- `ADMIN_WALLETS`

### Operational jobs

- card publish job
- position polling job
- score reconciliation job
- raffle draw job
- leaderboard snapshot job

## 14. Failure modes and mitigations

### Adrena API latency or downtime

- cache last known leaderboard
- backoff and replay polling
- mark stale state in UI

### Double scoring

- use idempotent `score_ledger` keys by `source_type + source_ref`

### Card misconfiguration

- config validation before publish
- dry-run evaluation against sample positions

### Race conditions on daily reset

- day-key based writes
- distributed lock on card publishing and streak rollover

## 15. MVP vs production boundary

### MVP

- wallet registration
- daily cards
- position polling
- scoring ledger
- leaderboard
- raffle tickets
- admin review

### Production

- direct Adrena internal event integration
- native profile reward writes
- fully automated anti-abuse scoring
- richer market-aware dynamic cards
- public-scale concurrency hardening
