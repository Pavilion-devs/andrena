# Pilot Map Page Outline

## 1. Purpose

This page should act as a one-screen system map for the demo and submission.

It is not:

- a marketing landing page
- a raw ERD
- a generic architecture diagram
- a pitch deck slide

It is:

- a visual explanation of what the product does
- a clear map of the participant flow and operator flow
- a fast way to explain why the prototype is pilot-ready

The main goal is to make the rest of the demo easier to follow.

## 2. Recommended route

- `/dashboard/pilot-map`

Alternative labels if needed:

- `How It Works`
- `Pilot Map`
- `League Map`

My recommendation: use `Pilot Map`.

It sounds operational, not promotional.

## 3. Audience and tone

Audience:

- hackathon judges
- Adrena team reviewers
- anyone trying to understand the system in under 30 seconds

Tone:

- clear
- product-operational
- confident
- not hype-heavy

The copy should sound like:

"Here is the system we built, how it runs, and why it is credible."

## 4. Page structure

Keep the page to three parts:

1. top summary band
2. two-column system map
3. proof layer strip

That gives enough structure without turning the page into a diagram swamp.

## 5. Top summary band

### Eyebrow

`Pilot System Map`

### Title

`How Adrena Battlecards Leagues Actually Runs`

### Body copy

`This prototype is not just a leaderboard UI. It connects wallet registration, live Adrena data, daily battlecards, deterministic scoring, audit history, and operator controls into a competition module Adrena could pilot with a small invited group.`

### Supporting badges

Use four short badges:

- `Live Adrena Reads`
- `Safe Demo Quotes`
- `Deterministic Scoring`
- `Admin Ops Ready`

### Optional micro-copy under badges

`Built for a 7-day pilot with real wallet registration, review tooling, and a score ledger that can be recomputed without hidden state.`

## 6. Main section A: Trader Loop

This should be the left column.

### Section title

`Trader Loop`

### Section intro

`The participant side is designed to feel like a game, but it stays grounded in real wallet state and real Adrena market integration.`

### Block 1

#### Label

`1. Connect And Register`

#### Copy

`A trader connects a Solana wallet, joins the weekly league, and becomes a tracked participant. Registration is wallet-native, not an abstract demo profile.`

#### Suggested route tag

`/dashboard/register`

### Block 2

#### Label

`2. Refresh Live Trading History`

#### Copy

`The app fetches live Adrena position history for the registered wallet and stores it in the pilot competition state. If the wallet has no qualifying history yet, it still becomes a valid participant in the league.`

#### Suggested route tag

`/dashboard/history`

### Block 3

#### Label

`3. Receive Daily Battlecards`

#### Copy

`Each day the trader sees a fresh set of battlecards spanning performance, discipline, and style. These cards turn trading from passive point farming into visible daily objectives.`

#### Suggested route tag

`/dashboard/battlecards`

### Block 4

#### Label

`4. Build A Trade Setup`

#### Copy

`Battlecards can push the trader into the launcher with relevant market presets. In safe mode, the app can generate a realistic demo quote preview without sending a mainnet transaction.`

#### Suggested route tag

`/dashboard/trade`

### Block 5

#### Label

`5. Earn Score, Streaks, And Tickets`

#### Copy

`Closed eligible trades, completed cards, full-set bonuses, and streak logic all feed into the same deterministic scoring system. Raffle tickets are tracked separately so leaderboard integrity stays clean.`

#### Suggested route tag

`/dashboard`

### Block 6

#### Label

`6. Inspect Personal Evidence`

#### Copy

`The trader can open a history view to inspect positions, completed cards, and ledger entries. The product does not ask users to trust a black-box leaderboard.`

#### Suggested route tag

`/dashboard/history`

## 7. Main section B: Operator Loop

This should be the right column.

### Section title

`Operator Loop`

### Section intro

`The competition is built to be run, not just viewed. Operators get the controls needed to publish content, recompute scores, investigate wallets, and review edge cases.`

### Block 1

#### Label

`1. Publish The Day's Card Set`

#### Copy

`Operators can define and publish daily battlecards, set the full-set bonus, and attach notes for the active league day.`

#### Suggested route tag

`/dashboard/admin`

### Block 2

#### Label

`2. Refresh Wallet Data`

#### Copy

`The runtime can refresh registered wallets from Adrena and store the resulting position updates for scoring. This creates a real ingestion layer instead of a static leaderboard snapshot.`

#### Suggested route tag

`/dashboard/admin`

### Block 3

#### Label

`3. Recompute The League`

#### Copy

`The leaderboard can be rebuilt from persisted positions, card records, and ledger logic. Recompute is explicit and deterministic, which matters for disputes and pilot trust.`

#### Suggested route tag

`/dashboard/admin`

### Block 4

#### Label

`4. Review Participant Evidence`

#### Copy

`Operators can inspect one wallet in detail, including positions, card evidence, score ledger entries, review flags, and manual adjustments.`

#### Suggested route tag

`/dashboard/admin/participants/[wallet]`

### Block 5

#### Label

`5. Handle Flags And Adjustments`

#### Copy

`The pilot includes dispute flow, abuse flags, and reversible manual overrides. That gives Adrena a practical control surface for a small invite-only competition.`

#### Suggested route tag

`/dashboard/admin/participants/[wallet]`

### Block 6

#### Label

`6. Monitor Runtime Health`

#### Copy

`Scheduler state, refresh runs, recompute runs, and pilot metrics are visible in one admin surface so operators can judge stability, fairness, and engagement.`

#### Suggested route tag

`/dashboard/admin`

## 8. Bottom proof layer

This should be a horizontal strip connecting both columns.

### Section title

`Why This Is Pilot-Ready`

### Intro line

`The prototype already includes the trust and operations layer needed for a controlled Adrena pilot.`

### Proof blocks

Use six compact proof blocks.

#### Proof block 1

##### Label

`Live Adrena Integration`

##### Copy

`Wallet refresh and live quote requests use Adrena's public endpoints rather than mock market data.`

#### Proof block 2

##### Label

`Safe Demo Path`

##### Copy

`Safe mode blocks mainnet submission by default while still allowing realistic demo quotes and real API validation.`

#### Proof block 3

##### Label

`Deterministic Score Ledger`

##### Copy

`Trade points, card rewards, streak bonuses, and tickets are written as explicit ledger entries that can be inspected and recomputed.`

#### Proof block 4

##### Label

`Participant Evidence`

##### Copy

`Every scored participant can be inspected through positions, card completion evidence, and wallet-level history views.`

#### Proof block 5

##### Label

`Operator Controls`

##### Copy

`Daily card publishing, scheduler tick, recompute, review flags, and manual adjustments are already part of the admin surface.`

#### Proof block 6

##### Label

`Pilot Metrics`

##### Copy

`The system tracks score dispersion, concentration, completion rate, and ingestion failures so the pilot can be evaluated, not just displayed.`

## 9. Optional footer line

If a footer line is needed, use:

`This is the shape of a competition Adrena could actually run with 20 to 50 invited wallets over a 7-day pilot window.`

## 10. Demo use order

This page should be the opening screen in the video.

Suggested walkthrough:

1. Start on `Pilot Map`
2. Explain the trader loop in 20 to 30 seconds
3. Explain the operator loop in 20 to 30 seconds
4. Call out the proof layer in 10 to 15 seconds
5. Click into the real product pages:
   - `Register Wallet`
   - `My History`
   - `Battlecards`
   - `Trade`
   - `Admin Ops`

This keeps the demo narrative clear:

- what the product is
- how it works for traders
- how it works for operators
- why it is credible

## 11. Interaction recommendation

Every block should be clickable and route into the corresponding real screen.

That matters because the page should feel like:

- a system map
- a demo control center

Not like:

- a dead explanatory poster

## 12. What not to do

Avoid these mistakes:

- do not show raw table names as the main content
- do not use long paragraphs
- do not turn it into a generic cloud architecture diagram
- do not write marketing-sounding claims with no product grounding
- do not repeat the landing page

## 13. Why this strengthens the submission

This page helps in two ways:

### Demo clarity

It gives the video a clean first frame and makes the rest of the walkthrough easier to understand.

### Submission credibility

It makes the project read as a complete pilot system:

- participant experience
- scoring model
- auditability
- operator controls
- runtime logic

That is stronger than submitting only a set of screens without an explicit system explanation.
