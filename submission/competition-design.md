# Competition Design

## 1. Name

`Adrena Battlecards Leagues`

## 2. One-line concept

A weekly trading league where every day gives traders a fresh set of battlecards to complete, combining realized trading performance with dynamic objectives, streak progression, and raffle upside.

## 3. Problem statement

Most perp DEX competitions still collapse into one of four formats:

- top volume
- top PnL
- points per notional
- capped daily points plus raffle

Those formats work for short-term volume, but they have recurring weaknesses:

- whales dominate unless heavily capped
- users optimize for repetitive behavior
- casual traders disengage after falling behind
- social/game feel is weak

Adrena already improved on raw PnL by moving to Mutagen, plus quests, streaks, and daily mutations. The next step is not another scoring tweak. The next step is to package those mechanics into a clearer competition mode.

## 4. Product goals

- increase repeat daily participation
- improve competition fairness for non-whale traders
- preserve strong incentives for real trading activity
- create a mode that feels different from other perp DEX leaderboards
- fit into Adrena's current systems instead of replacing them

## 5. Non-goals

- replacing Adrena's full seasonal Mutagen system
- moving competition logic fully on-chain
- supporting global public scale on day one without Adrena integration help
- introducing social trading or copy trading in MVP

## 6. Who it is for

### Core user segments

- competitive active traders
- medium-volume traders who want a fairer chance to place
- casual but returning traders who respond to streaks and lotteries
- achievement/profile collectors

### Why each segment stays engaged

- high-skill traders: optimize score, cards, and placements
- mid-tier traders: can win through consistency and execution, not just raw size
- casual traders: still get raffle tickets, streak progress, and visible milestones
- cosmetic/status users: unlock profile badges and seasonal identity

## 7. Competition format

### League cadence

- one weekly league
- daily reset at a fixed UTC time
- each league lasts 7 days

### Daily content

Every participant receives 3 battlecards per day:

- 1 performance card
- 1 discipline card
- 1 style or market card

Cards are visible at day start and remain active until daily reset.

### Entry

- trader registers their wallet for the league
- registration can be open all week for MVP, but score only starts after join time
- production mode can require registration before day start or before week start

### How score is earned

- closed eligible trades generate league points
- completed battlecards generate bonus points
- consecutive active days generate streak bonuses
- raffle tickets are earned separately and do not distort leaderboard integrity

## 8. Why this improves on current Adrena

Adrena's current stack already has the raw pieces:

- leaderboard
- quests
- streaks
- raffles
- profile rewards

`Battlecards Leagues` upgrades the user experience by making those pieces coherent:

- quests become visible daily "missions" instead of a background checklist
- streaks become a meaningful return loop
- raffles become consolation upside for non-top users
- leaderboard score becomes more readable and more intentional

This is not a rebrand. It is a new competition presentation and rules engine on top of proven Adrena primitives.

## 9. Example battlecard categories

### Performance cards

- close one profitable trade
- close two trades with combined positive net score
- close a trade with at least 1% positive `pnl_volume_ratio`

### Discipline cards

- close a trade via stop-loss or take-profit
- keep one trade open for at least 30 minutes before closing
- avoid any liquidation for the day while completing two eligible trades

### Style cards

- complete one long and one short in the same day
- complete a limit-order entry trade
- trade within a target leverage band such as 5x to 20x

### Market cards

- trade one of the promoted markets today
- complete one trade in a rotating custody/asset focus
- complete one trade tied to a special league theme

### Event cards

- weekend endurance card
- new listing card
- volatility day card
- sponsored campaign card

## 10. Example daily set

Example day:

- Card 1: Close one profitable SOL or BTC trade worth at least $2,500 volume
- Card 2: Close one trade after at least 30 minutes duration
- Card 3: Open and close one trade with an attached TP or SL

Full-set completion unlocks:

- bonus league points
- extra raffle tickets
- cosmetic progress

## 11. Reward structure

## Weekly reward stack

Split the weekly reward budget into four buckets:

- 60% leaderboard placement rewards
- 20% completion raffle rewards
- 10% consistency rewards
- 10% cosmetic / profile rewards / sponsored extras

### Leaderboard placement rewards

Designed for the highest scorers in the weekly league.

Suggested structure:

- top 10 or top 5% receive fixed placement rewards
- top 25% receive smaller pro-rata or stepped rewards

### Completion raffle rewards

Designed to keep smaller traders engaged.

Entry rules:

- first eligible trade of the day
- each completed card
- daily full-set completion

### Consistency rewards

Designed for return behavior, not just burst volume.

Examples:

- 5-of-7 active days reward
- 7-of-7 perfect attendance reward
- no-liquidation weekly consistency reward

### Cosmetic and status rewards

These fit Adrena particularly well because the trader profile system already exists.

Examples:

- weekly league badge
- seasonal title
- card mastery badge
- profile border / wallpaper / PFP unlock

## 12. Integration with existing Adrena systems

### Leaderboard

- `Battlecards Leagues` becomes a new competition tab or mode
- existing ranking infrastructure can still ingest and display weekly scores

### Quests

- battlecards are effectively the next quest layer
- card completion can be recorded as daily quest completion

### Streaks

- use daily league participation as streak input
- optionally create a dedicated battlecards streak

### Raffles

- use a ticket ledger generated by card completions and daily activity
- can feed existing raffle infrastructure

### Trader Profiles and Achievements

- award badges and titles through current profile systems
- reuse existing identity/status surfaces instead of inventing new ones

## 13. Abuse prevention design

This section is critical. Competitions fail when the dominant strategy is low-signal spam.

### Main abuse vectors

- multi-wallet sybil participation
- micro-trade farming
- wash-like high-volume low-conviction behavior
- flat-reward farming
- pre-positioning outside the event window

### Rules to reduce abuse

- registration required
- only trades opened and closed within the league window count
- minimum eligible trade volume
- daily scoring cap with diminishing returns
- daily card completion limited to once per card
- low-duration spam trades produce little or no duration score
- liquidations reduce score and can void certain cards
- suspicious wallet clusters flagged for review in pilot mode

### Strategic principle

The winning strategy should be:

- trade intentionally
- close real positions
- manage risk
- return consistently

not:

- machine-gun tiny trades
- brute-force notional
- split volume across wallets

## 14. Why this is better than competitor patterns

Compared with standard dYdX-style volume campaigns:

- stronger daily return loop
- more skill expression
- less flat leaderboard fatigue

Compared with OI/TVL point boosts such as Paradex campaigns:

- more active gameplay
- faster gratification
- clearer connection between user action and score

Compared with Adrena's previous seasons:

- more guided daily experience
- more visible structure
- easier to market and explain

## 15. Pilot version

The MVP pilot should be intentionally tight:

- 20 to 50 invited wallets
- 7-day duration
- 3 cards per day
- one weekly leaderboard
- one daily raffle

This is enough to validate:

- retention
- fairness
- clarity
- exploit resistance
- overall fun

## 16. Success criteria

- day-7 participation rate above current comparable campaigns
- battlecard completion on at least 40% of active user-days
- clear evidence that mid-tier traders stay engaged deeper into the week
- positive user feedback on fairness and fun
- no major exploit discovered during the pilot

## 17. Recommended production extensions after MVP

- squad leagues
- head-to-head rivalries
- sponsored market weeks
- stream/spectator mode
- pool-aware promoted cards driven by internal risk or liquidity goals
- direct Mutagen emission from battlecard logic
