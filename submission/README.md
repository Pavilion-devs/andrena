# Adrena Bounty Submission Package

Prepared on 2026-03-21

## Proposal

Build `Adrena Battlecards Leagues`: a competition module that turns Adrena's existing leaderboard, quests, streaks, raffles, and trader profile systems into a tighter daily game loop.

Instead of another flat volume race, the module combines:

- weekly leagues
- daily battlecards
- realized-performance scoring
- streak progression
- raffle tickets for casual retention
- cosmetic/status rewards for trader identity

## Why this is the right bounty submission

Adrena already has strong primitives:

- Mutagen
- quests
- streaks
- raffles
- achievements
- trader profiles

What is still missing is a more structured, more game-like competition format that:

- creates a reason to return every day
- rewards skill and discipline, not only raw size
- stays fun for smaller traders
- still drives volume and platform engagement

`Battlecards Leagues` is designed to do that without replacing Adrena's current systems.

## Package contents

- [competition-design.md](/Users/favourolaboye/Documents/andrena/submission/competition-design.md): product spec, user flow, reward design, abuse prevention
- [scoring-spec.md](/Users/favourolaboye/Documents/andrena/submission/scoring-spec.md): scoring model, formulas, eligibility rules, worked examples
- [prototype-architecture.md](/Users/favourolaboye/Documents/andrena/submission/prototype-architecture.md): system design, API integration map, data model, deployment shape
- [pilot-and-build-plan.md](/Users/favourolaboye/Documents/andrena/submission/pilot-and-build-plan.md): MVP scope, sprint plan, test competition, feedback loop
- [testing-and-feedback.md](/Users/favourolaboye/Documents/andrena/submission/testing-and-feedback.md): engineering verification, pilot protocol, feedback collection, and honest remaining gap
- [supabase/schema.sql](/Users/favourolaboye/Documents/andrena/supabase/schema.sql): Postgres schema for migrating the local normalized pilot store into Supabase
- [supabase/README.md](/Users/favourolaboye/Documents/andrena/supabase/README.md): handoff note for applying the schema and the next key needed for real migration
- [scoring.example.yaml](/Users/favourolaboye/Documents/andrena/submission/config/scoring.example.yaml): configurable league rules and reward weights
- [battlecards.example.json](/Users/favourolaboye/Documents/andrena/submission/config/battlecards.example.json): example daily card payload

## Research basis

This package was built from:

- the bounty brief in `details.txt`
- Adrena's public docs for Pre-Season, Season 1, Mutagen, Achievements, and Trader Profiles
- Adrena's public Postman collection, published on 2026-03-03
- Adrena's team-provided competition service and GUIDE.md for size multipliers, position schema, and close-position stream payloads
- live checks of Adrena read endpoints on 2026-03-21
- current competitor examples from dYdX and Paradex

## Key implementation assumption

The public Adrena API is strong enough for a pilot, because it exposes:

- quote-and-transaction builders for trading flows
- wallet-level positions and trade history
- liquidity and pool analytics

For full production scale, Adrena team access will still be needed for:

- broader leaderboard ingestion
- resilient always-on event processing
- native integration into existing quest/profile/admin systems

## Current implementation status

The prototype now also integrates the team-provided competition service for:

- health checks
- official size-multiplier tier sync
- position schema metadata
- normalized `close_position` event ingestion
- a standalone WebSocket worker for near-real-time close detection
- participant/admin close-event evidence views

That moves the project beyond a public-endpoint-only prototype and closer to an operator-run pilot stack.

## Recommended next step

The strongest next execution item is to harden the current pilot into an operator-run competition service:

- wallet connect and participant-side history/evidence views
- scheduled runtime deployment using the new tickable scheduler layer
- pilot reporting export and post-league analytics
