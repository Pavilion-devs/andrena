# Scoring Specification

## 1. Scoring philosophy

The scoring model should reward:

- realized trading quality
- consistent participation
- deliberate execution
- variety of behavior

The model should not reward:

- pure size without quality
- spammy micro-trades
- parking large positions outside the competition window
- brute-force point farming through flat reward loops

## 2. Score components

Weekly league ranking is based on:

`league_score = trade_points + battlecard_points + streak_points`

Raffle tickets are tracked separately and do not affect ranking.

## 3. Eligibility rules

A trade counts only if all of the following are true:

- wallet is registered for the league
- trade was opened after the wallet joined the league
- trade was opened and closed within the current weekly league window
- trade has a terminal state: closed or liquidated
- trade volume meets the minimum eligible threshold
- `position_id` has not already been scored

### MVP thresholds

- minimum eligible trade volume: `$250`
- scoring week: `7 days`
- card reset: `daily`

## 4. Daily scoring cap

To reduce whale dominance while preserving volume incentives:

- first `$100,000` of daily closed-trade volume counts at `1.00x`
- next `$100,000` counts at `0.25x`
- any daily volume above `$200,000` counts at `0.00x`

This cap applies to score contribution, not to actual trading.

Traders can still trade more. They just do not gain unlimited ranking power from it.

## 5. Effective volume

For each eligible trade, compute:

- `raw_volume_usd`
- `effective_volume_usd`

`effective_volume_usd` is the portion of that trade's volume that still fits inside the trader's daily scoring bands after applying the daily cap above.

This is important because trade size should matter, but only up to a point.

## 6. Per-trade score

`trade_points = clamp(size_score + quality_score + duration_score + discipline_score - liquidation_penalty, 0, 25)`

### 6.1 Size score

`size_score = min(8, sqrt(effective_volume_usd / 500))`

Interpretation:

- bigger trades matter
- score increases with diminishing returns
- giant trades do not linearly dominate

Example:

- `$500` effective volume -> `1.0`
- `$8,000` effective volume -> `4.0`
- `$32,000` effective volume -> `8.0` cap

### 6.2 Quality score

Use Adrena's `pnl_volume_ratio` field when available.

`quality_score = clamp(pnl_volume_ratio * 4, -8, 16)`

Interpretation:

- positive realized quality matters a lot
- negative performance can hurt the score
- extreme outliers are capped

Examples:

- `pnl_volume_ratio = -1.0` -> `-4`
- `pnl_volume_ratio = 0.5` -> `2`
- `pnl_volume_ratio = 2.0` -> `8`
- `pnl_volume_ratio = 5.0` -> `16` cap

### 6.3 Duration score

Use trade `duration` in seconds.

Suggested MVP buckets:

- under `120s` -> `0`
- `120s` to `599s` -> `1`
- `600s` to `1799s` -> `2`
- `1800s` to `14399s` -> `3`
- `14400s` and above -> `4`

Interpretation:

- instant churn gives little value
- deliberate trades earn more
- long holding is rewarded, but not overwhelmingly

### 6.4 Discipline score

Use signals that indicate deliberate execution.

MVP:

- `+2` if `closed_by_sl_tp = true`

Phase 2 additions:

- `+1` if trade originated from a limit-order card
- `+1` if trade remained within target leverage band for the card

### 6.5 Liquidation penalty

- `5` points if the trade was liquidated
- `0` otherwise

If liquidation state is not explicitly available from the public API in pilot mode:

- infer from internal event logs if Adrena provides them
- otherwise leave as `0` for MVP and rely on negative `quality_score`

## 7. Battlecard points

Every day, each trader receives 3 cards.

Each card belongs to one of three point tiers:

- easy: `5`
- medium: `8`
- hard: `12`

Daily full-set bonus:

- complete all 3 cards in one day -> `+5`

### Card design rules

- each card can complete at most once per day
- no duplicate card category on the same day
- no card should require impossible platform state or insider knowledge
- at least one card per day should be realistically accessible to mid-tier traders

## 8. Streak points

Daily activity streak:

- day 1 active: `0`
- day 2 active: `+2`
- day 3 active: `+2`
- day 4 active: `+2`
- day 5 active: `+2`
- day 6 active: `+2`
- day 7 active: `+2`

Perfect-week bonus:

- 7 active days in the week -> `+10`

An active day is any day where the trader does at least one of:

- earns trade points from an eligible trade
- completes at least one battlecard

## 9. Raffle ticket rules

Raffle tickets are separate from `league_score`.

Suggested ticket grants:

- first eligible trade of the day -> `1 ticket`
- each completed card -> `1 ticket`
- daily full-set completion -> `2 tickets`
- perfect 7-day streak -> `3 tickets`

This keeps lower-ranked users engaged without making ranking luck-based.

## 10. Worked example

Trader A closes one trade with:

- effective volume: `$8,000`
- `pnl_volume_ratio = 1.5`
- duration: `2,400s`
- `closed_by_sl_tp = true`
- not liquidated

Scores:

- size score = `sqrt(8000 / 500) = 4`
- quality score = `1.5 * 4 = 6`
- duration score = `3`
- discipline score = `2`
- liquidation penalty = `0`

`trade_points = 4 + 6 + 3 + 2 = 15`

If the same trader also completes:

- one easy card: `5`
- one medium card: `8`
- one hard card: `12`
- full-set bonus: `5`

and is on day 4 of a streak:

- streak points today: `2`

Daily total added:

- trade points: `15`
- battlecard points: `30`
- streak points: `2`

Total added today:

- `47 league points`

## 11. Card generation rules

Card generation must be deterministic enough to audit and random enough to stay fresh.

Daily generator constraints:

- 1 card from `performance`
- 1 card from `discipline`
- 1 card from `style` or `market`
- no exact duplicate within 7 days for the same trader
- honor league config switches

Optional weighted inputs:

- promoted markets
- sponsored campaigns
- platform goals
- utilization-aware house pushes from Adrena team

## 12. Anti-gaming notes

### Why micro-trade spam is weak here

- minimum volume threshold
- duration buckets give near-zero points to instant churn
- card completions are capped
- daily effective volume cap reduces brute-force scaling

### Why whale dominance is reduced

- diminishing returns on size
- daily effective volume cap
- cards and streaks matter materially

### Why pure gambling is discouraged

- negative quality can hurt score
- liquidation can hurt score
- consistency beats one-off burst behavior

## 13. Configurability

All thresholds and weights should be admin-configurable per league:

- min trade volume
- daily volume bands
- score caps
- card point values
- streak schedule
- raffle ticket multipliers

See:

- [scoring.example.yaml](/Users/favourolaboye/Documents/andrena/submission/config/scoring.example.yaml)

## 14. Recommended MVP simplifications

To ship fast, MVP can omit:

- liquidation-specific penalties if liquidation signal is unavailable
- pool-aware dynamic cards
- advanced leverage-path scoring
- cross-wallet sybil heuristics beyond manual review

The MVP should keep:

- eligibility rules
- daily caps
- trade scoring
- battlecards
- streaks
- raffle tickets

Those are enough to prove the concept.
