# Pilot And Build Plan

## 1. Delivery objective

Ship a working pilot of `Adrena Battlecards Leagues` that Adrena can:

- review
- deploy
- configure
- run with a small invited group

## 2. MVP scope

The MVP should include:

- competition registration
- one active weekly league
- 3 daily cards
- live leaderboard
- score breakdown per participant
- streak tracking
- raffle ticket tracking
- trade launcher integration for core Adrena endpoints
- admin config for card publishing and score recompute

## 3. Explicitly out of MVP

- global open registration at large scale
- production-grade sybil detection
- direct writes into Adrena's profile or badge systems without team integration support
- native mobile app integration
- on-chain reward distribution

## 4. Pilot format

### Participant count

- 20 to 50 wallets

### Duration

- 7 days

### Daily content

- 3 battlecards per day

### Reward format

- small weekly top-rank rewards
- one daily raffle
- one perfect-week consistency reward

### Why this pilot size is right

- enough diversity to reveal exploit patterns
- enough volume to test scoreboard behavior
- small enough for manual review and fast iteration

## 5. Success metrics

### Product metrics

- registration conversion
- daily active participants
- average eligible trades per active day
- day-2 retention
- day-7 retention
- average cards completed per active day
- full-set completion rate

### Competition metrics

- leaderboard score dispersion
- top-10 wallet concentration
- share of total score from cards vs trades vs streaks
- raffle participation rate

### Quality metrics

- number of scoring disputes
- number of flagged abuse cases
- number of failed ingestion/scoring events

## 6. Feedback collection

At league end, ask every pilot participant:

- Was the competition easy to understand?
- Did the battlecards make you trade more often?
- Did the scoring feel fair relative to wallet size?
- Which cards felt good?
- Which cards felt annoying or gameable?
- Did the streak and raffle systems make you return?
- What would make you play the next league?

## 7. Build sequence

## Phase 0: Alignment

Output:

- final rules snapshot
- API and integration confirmation with Adrena team
- approved scoring config

Tasks:

- confirm public vs private data sources
- confirm timezone, reset time, and prize handling
- confirm whether pilot requires trader profile creation

## Phase 1: Core foundation

Output:

- competition service skeleton
- database schema
- participant registration

Tasks:

- create core tables
- add wallet registration flow
- add league config loader
- add admin-only competition creation

## Phase 2: Ingestion and scoring

Output:

- position polling
- score ledger
- streak logic
- recompute command

Tasks:

- integrate `GET /position`
- write eligibility filters
- write idempotent scoring pipeline
- implement streak accrual
- write leaderboard aggregation

## Phase 3: Cards and raffle engine

Output:

- daily card publisher
- card evaluation
- raffle entries and draw flow

Tasks:

- card template storage
- participant card assignment
- evidence evaluation against positions
- ticket ledger
- daily full-set bonus

## Phase 4: Frontend and trade launcher

Output:

- participant dashboard
- leaderboard view
- quick trade actions

Tasks:

- show current score and rank
- show today's cards
- show streak and tickets
- integrate quote endpoints for open long/short and limit orders

## Phase 5: Admin and pilot ops

Output:

- admin review dashboard
- flag handling
- observability

Tasks:

- recompute and manual override tools
- participant detail view
- abuse flags page
- logs and alerts

## 8. Suggested sprint timeline

### Week 1

- finalize rules
- create backend skeleton
- schema and registration
- base leaderboard model

### Week 2

- position ingestion
- score ledger
- streak logic
- leaderboard updates

### Week 3

- battlecards engine
- raffle tickets
- admin config
- recompute tooling

### Week 4

- frontend polish
- trade launcher integration
- QA
- pilot dry run

### Week 5

- live pilot
- collect metrics and user feedback
- adjust weights and card mix
- produce final post-pilot report

## 9. Testing plan

### Unit tests

- trade eligibility
- daily cap handling
- trade score calculation
- streak calculation
- card completion evaluation
- raffle ticket creation

### Integration tests

- position polling against mocked Adrena responses
- idempotent rescoring
- leaderboard rebuild from ledger
- daily reset behavior

### Manual QA scenarios

- register late in the week
- complete one card but not others
- exceed daily scoring cap
- open trade before join time and close after join time
- close by TP/SL
- miss a streak day
- rerun recompute with no double-counting

## 10. Operational checklist before pilot

- freeze scoring config
- preload participant allowlist
- verify reset time
- verify leaderboard snapshot cadence
- verify raffle close/draw times
- run full backfill dry run on test wallets
- define dispute process and manual review owner

## 11. Recommended pilot rewards

The pilot does not need a huge pool. It needs believable incentives.

Suggested pilot structure:

- top 3 leaderboard rewards
- one daily raffle winner
- one perfect-week consistency reward
- one cosmetic or honorary title for the pilot winner

## 12. Post-pilot iteration plan

After the pilot, sort findings into:

### Keep

- cards that drove repeat engagement
- score components that users understood
- reward types users found motivating

### Tune

- point weights
- daily cap thresholds
- card difficulty mix
- full-set bonus

### Remove

- confusing cards
- easily gamed rules
- features that added operational load without clear engagement lift

## 13. Final submission package to Adrena after pilot

After the pilot, the final handoff should include:

- shipped code
- deployment instructions
- league config examples
- pilot results summary
- exploit notes
- iteration recommendations

## 14. Adrena team dependencies

These should be requested early:

- confirmation of preferred integration path for production
- access to any internal event feed or leaderboard service if available
- guidance on profile/badge write paths
- prize handling expectations
- competition admin ownership on their side

## 15. What makes this submission credible

This plan is credible because it is:

- narrower than a full seasonal rebuild
- richer than a slide-deck concept
- directly grounded in the public Adrena API surface
- structured around the bounty's explicit pilot requirement
