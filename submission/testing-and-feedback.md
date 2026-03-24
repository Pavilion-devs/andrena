# Testing And Feedback

Prepared on 2026-03-24

## 1. Purpose

This document closes the final submission gap in `details.txt` by making three things explicit:

- what has already been verified in the prototype
- how a real small-group pilot should be run
- how feedback should be collected and turned into the next iteration

This is intentionally honest. The project is now strongly validated as an engineering prototype and pilot system, but a live multi-user pilot has not yet been run.

## 2. What has already been tested

### Static verification

The project passed the following engineering checks on 2026-03-24:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

These checks passed after the following major capability blocks were integrated:

- wallet adapter connection
- safe-mode demo trading flow
- auditable score ledger and deterministic recompute
- admin review and override tooling
- Adrena competition-service REST integration
- Adrena competition-service WebSocket worker

### Route and backend smoke tests

The following routes and flows were exercised during implementation between 2026-03-22 and 2026-03-24:

- `GET /api/competition/state`
- `GET /api/competition/participants/[wallet]`
- `POST /api/competition/register`
- `POST /api/competition/refresh`
- `POST /api/competition/quote/[kind]`
- `POST /api/admin/competition/recompute`
- `POST /api/admin/competition/runtime/tick`
- `POST /api/admin/competition/runtime/scheduler`
- `POST /api/admin/competition/cards/publish`
- `POST /api/admin/competition/participants/[wallet]/flags`
- `POST /api/admin/competition/participants/[wallet]/adjustments`
- `POST /api/admin/competition/service/sync`
- `POST /api/admin/competition/service/close-events`
- `POST /api/admin/competition/service/stream`

Verified behaviors:

- live Adrena quote requests return real upstream success or real upstream errors
- unsupported asset symbols fail clearly
- simulated demo quotes work without requiring live collateral
- recompute is deterministic and idempotent
- manual adjustments survive recompute and can be voided
- duplicate close-event ingestion is ignored safely
- competition-service sync returns healthy status, size tiers, and position schema metadata
- the standalone worker connects to the Adrena WebSocket service and reports connection state back into the app

### Manual product QA

The following user-facing flows were manually exercised during development:

- connect wallet
- register connected wallet
- refresh registered wallet against Adrena
- inspect participant history
- inspect battlecard evidence
- route from battlecard CTA into the trade form
- build demo quote in safe mode
- build live quote and surface upstream collateral/token errors
- inspect admin review queue
- inspect participant audit detail
- publish card sets
- run scheduler tick and recompute from Admin Ops

## 3. Results summary

### What is strong now

- The competition concept is fully specified.
- The score engine is ledger-backed and auditable.
- The prototype has both participant and operator surfaces.
- The app integrates both public Adrena endpoints and the team-provided competition service.
- The project now has a realtime worker instead of only manual refresh logic.

### What is still not fully proven

- no live small-group pilot has been executed yet
- no real participant feedback has been collected yet
- no production persistence layer is wired yet, although the data model is ready for Postgres/Supabase

That means the project is best described as:

- pilot-ready

not:

- already pilot-proven

## 4. Small-group pilot plan

### Recommended pilot shape

- 20 to 50 invited wallets
- 7-day league
- 3 battlecards per day
- one daily raffle
- one weekly leaderboard reward
- one perfect-week reward

### Operator checklist before pilot start

- freeze scoring config
- freeze battlecard catalog for the week
- publish the first daily card set
- confirm reset time and timezone
- confirm who owns abuse review and disputes
- verify the WebSocket worker is connected
- run one dry-run recompute on test wallets
- verify leaderboard snapshot and refresh cadence

### Daily operator checklist during pilot

- confirm competition-service health is healthy
- confirm worker stream status is connected or idle by design
- review open flags and disputes
- review ingestion failures or partial refresh runs
- publish next day card set if manually controlled
- spot-check top leaderboard wallets for suspicious activity

### End-of-pilot checklist

- freeze further manual adjustments unless dispute-related
- export leaderboard snapshot
- export score ledger
- export review flags and resolutions
- export pilot metrics
- send participant feedback form

## 5. Feedback collection plan

### Format

Use a lightweight post-pilot survey plus 10-15 minute follow-up calls with the most active traders.

Suggested response groups:

- top 5 leaderboard wallets
- mid-table active wallets
- wallets that dropped off after day 1 or day 2

### Core participant questions

See [pilot-feedback-template.md](/Users/favourolaboye/Documents/andrena/submission/pilot-feedback-template.md) for a ready-to-use version.

Questions to preserve:

- Was the competition easy to understand?
- Did the battlecards make you trade more often?
- Did the scoring feel fair relative to position size?
- Which cards felt motivating?
- Which cards felt annoying or gameable?
- Did streaks or raffles actually bring you back?
- Would you join the next league?

### Operator feedback questions

Ask the internal operator or reviewer:

- Was it easy to run daily card publishing?
- Was participant evidence sufficient to resolve disputes?
- Did admin overrides feel safe and auditable?
- Did the stream worker and refresh fallback feel reliable?
- Which metrics or logs were missing during review?

## 6. Proposed pilot success criteria

### Product

- at least 60% of registered wallets trade on 2 or more days
- at least 35% of active wallets complete 1 or more daily cards
- at least 20% of active wallets complete a full set during the week

### Fairness

- no single wallet captures more than 35% of total score
- dispute count remains low relative to participant count
- operators can explain any top-wallet score using ledger plus close-event evidence

### Reliability

- no unrecoverable recompute failures
- no double-counting from duplicate close events
- refresh fallback can recover from a worker disconnect

## 7. Iteration triggers

After the pilot, adjust the system if any of these happen:

- top-wallet concentration is too high
- battlecards are completed too easily or almost never completed
- disputes cluster around one score rule
- refresh fallback is doing too much recovery work
- casual wallets earn too few points to stay interested

## 8. Recommendations for iteration

### If fairness is weak

- reduce size weighting further
- increase card and streak share of total score
- add stricter daily score caps

### If activity is weak

- make daily cards easier on days 1 and 2
- increase raffle value for participation-focused cards
- improve leaderboard and history explanations

### If operators are overloaded

- add more automatic abuse heuristics
- add worker log history to admin
- add one-click recovery actions after disconnects

## 9. Honest final status against the bounty brief

### Fully covered

- competition design
- rules, scoring, and rewards
- prototype implementation
- integration planning and team-coordinated service integration
- deploy/config docs

### Strongly covered but not fully closed

- testing and feedback

Reason:

- engineering validation is complete enough for a pilot
- the actual live small-group pilot and real participant feedback are still the last real-world step

## 10. Recommended submission wording

If this is referenced in the final bounty submission, the accurate claim is:

> The project is pilot-ready, with documented engineering validation, operator tooling, realtime ingestion, and a prepared pilot feedback process. The remaining step is executing the invited-group pilot and collecting live participant feedback.
