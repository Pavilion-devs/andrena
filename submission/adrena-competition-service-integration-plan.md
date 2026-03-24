# Adrena Competition Service Integration Plan

## 1. Why this matters

The admin-provided competition service changes the submission from:

- a strong public-API prototype

to:

- a prototype with an official, team-provided integration path for scoring and event ingestion

This is important for the bounty because it directly improves coverage on:

- coordination with the Adrena team
- integration with Adrena's existing systems
- clean and reviewable implementation
- pilot-readiness

## 2. New inputs we now have

### REST

- `GET /<API_KEY>/`
- `GET /<API_KEY>/health`
- `GET /<API_KEY>/size-multiplier`
- `GET /<API_KEY>/size-multiplier/calculate?size=<usd>`
- `GET /<API_KEY>/position-schema`

### WebSocket

- `wss://adrena-competition-service.onrender.com/<API_KEY>`

### Close event shape

We now have a normalized `close_position` event shape with:

- owner
- position
- custodyMint
- side
- sizeUsd
- price
- collateralAmountUsd
- profitUsd
- lossUsd
- netPnl
- borrowFeeUsd
- exitFeeUsd
- positionId
- percentageClosed

That is much more useful for competition scoring than relying only on wallet polling.

## 3. What this unlocks in the product

### 3.1 Official size multiplier logic

The size multiplier table is now explicit and machine-readable.

That means we can stop treating size weighting as a design-only rule and start using the official off-chain lookup in the scoring engine.

### 3.2 Real-time close detection

The WebSocket stream gives us close events in near real time.

That means we can:

- score trades when they close
- update leaderboard state faster
- attach better evidence to participant history
- reduce reliance on periodic polling alone

### 3.3 Better scoring evidence

The close event already carries realized:

- size
- exit price
- net PnL
- borrow fees
- exit fees

This is much stronger evidence for a competition system than only reading position snapshots after the fact.

### 3.4 Better ops

The health endpoint gives us something concrete to surface in admin tooling:

- service health
- stream health
- event-ingestion readiness

## 4. What we should implement next

## 4.1 Add a dedicated competition-service client

Create a new server-side integration layer for the admin-provided service.

Suggested file:

- `lib/adrena-competition-service.ts`

Responsibilities:

- build authenticated REST URLs with the API key in the path
- fetch health
- fetch full size-multiplier table
- calculate multiplier for a given close size
- fetch position schema metadata if needed for docs/debug/admin
- create a WebSocket connection helper for live event ingestion

## 4.2 Add close-event persistence

The live stream has no replay and no server-side backfill.

That means we need our own persistence layer for every event we care about.

We should store:

- raw event envelope
- decoded close event fields
- signature
- slot
- owner
- position PDA
- position ID
- custody mint
- side
- close size USD
- net PnL
- fees
- percentage closed
- timestamp

Suggested new record type:

- `CompetitionCloseEventRecord`

Suggested persistence target:

- local pilot store for now
- later easy migration to Postgres/Supabase

## 4.3 Integrate the size multiplier into scoring

Current scoring is already deterministic, but this service lets us align it more tightly with Adrena's competition math.

We should:

- parse `decoded.sizeUsd`
- normalize it to numeric USD
- call the multiplier service or local cached table
- write the multiplier used into score ledger metadata

This matters because it improves:

- scoring transparency
- auditability
- alignment with team-provided competition logic

## 4.4 Add a live event ingestor into runtime

Current runtime already supports refresh and recompute.

We should extend it with:

- WebSocket connect
- reconnect strategy
- heartbeat / last event timestamp
- event persistence
- close-event-to-ledger pipeline
- fallback to polling when stream is unavailable

Important constraint from the guide:

- the stream has no replay
- missed events are gone if we disconnect

So the correct architecture is:

- WebSocket for low-latency updates
- periodic refresh for recovery/backfill

Not:

- WebSocket only

## 4.5 Expose stream and service status in Admin Ops

Admin should show:

- REST health status
- WebSocket connected / disconnected
- last event received at
- ingested event count
- failed event decode count
- fallback refresh status

This makes the prototype look much more like a pilot system and less like a one-off demo.

## 4.6 Improve participant evidence views

Participant detail and admin detail should eventually show:

- close event source
- position ID
- position PDA
- exact realized PnL from close event
- exact multiplier applied
- exact score contribution

That is the clearest answer to:

"Why did this wallet get this score?"

## 5. Concrete file areas to touch

These are the main implementation targets.

### New files

- `lib/adrena-competition-service.ts`
- `lib/adrena-close-events.ts`

### Likely updated files

- `lib/types.ts`
- `lib/storage.ts`
- `lib/scoring.ts`
- `lib/competition.ts`
- `lib/runtime.ts`
- `app/dashboard/admin/page.tsx`
- `app/dashboard/admin/participants/[wallet]/page.tsx`
- `app/dashboard/history/page.tsx`

## 6. Data-model additions

We should add records for:

- close events
- event-ingestion runs or stream state
- service health snapshots
- multiplier metadata on score ledger entries

This can stay file-backed in the short term as long as the schema is normalized and explicit.

## 7. Scoring changes to make

We should move the scoring system toward this flow:

1. close event is received
2. close size USD is read from event
3. multiplier is fetched or calculated
4. realized net PnL is read from event
5. score contribution is computed
6. ledger entry is written with:
   - event signature
   - position ID
   - size multiplier
   - net PnL
   - fees
   - scoring breakdown

This is stronger than deriving everything from post-hoc position snapshots.

## 8. Operational constraints from the guide

These need to be respected in the implementation.

### No replay

If the stream disconnects, missed events are lost.

Response:

- persist events immediately
- maintain reconnect logic
- keep polling fallback

### Off-chain multiplier

The size multiplier is not on-chain.

Response:

- treat it as an external scoring dependency
- cache the table locally
- write the exact multiplier used into ledger metadata

### PnL is emitted on close, not stored on position

Response:

- use close events as the authoritative realized-PnL source
- use position snapshots for context, not as the only realized-PnL input

## 9. What this improves in the bounty coverage

If we implement this block, we materially improve these `details.txt` areas:

### Stronger

- integration with Adrena's existing systems
- coordination with the Adrena team
- functional code that can be reviewed and tested
- understanding of perps / trading mechanics

### Still missing afterward

Even after this integration, these items will still not be fully complete:

- run a real test competition with a small group
- collect feedback and document actual results
- ship a true post-pilot iteration report

So this block is not the end of the bounty, but it is the correct next upgrade.

## 10. Recommended implementation order

1. Add the server-side competition-service client
2. Add size-multiplier support and cache
3. Add close-event persistence types and storage
4. Add WebSocket ingestion into runtime
5. Expose health and stream state in admin
6. Attach close-event evidence to participant and ledger views
7. Re-test demo flow and update submission docs

## 11. Demo and submission impact

After this work, the demo gets much stronger because we can say:

- this is not only using public endpoints
- this is using admin-provided competition infrastructure
- scoring is moving closer to Adrena's own competition model
- close events are handled in near real time

That is a much better submission story than "we built a competition UI on top of generic wallet polling."

## 12. Final recommendation

This should be the next major implementation block before claiming broader bounty coverage.

It is the clearest path from:

- strong prototype

to:

- more official, team-aligned pilot system
