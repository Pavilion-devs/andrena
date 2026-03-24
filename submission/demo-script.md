# Adrena Battlecards Demo Script

## Goal

Use this as a word-for-word 2-3 minute walkthrough for the submission demo. The flow assumes:

- the app is running in safe mode
- the competition-service worker is running
- two wallets are already registered
- no real mainnet trade will be submitted during the demo

## Before Recording

Start the app and worker:

```bash
npm run dev
npm run worker:competition-service
```

Open the app and confirm:

- `Safe Mode` is visible in the dashboard
- the two registered wallets appear in the product
- Admin Ops shows the Adrena competition service as healthy

## Script

### 0:00 - 0:20

Start on the `Pilot Map` page.

Say:

> Adrena Battlecards is a pilot-ready competition layer for Adrena. We built two loops into one system: the trader loop, where participants connect wallets, refresh their Adrena history, complete battlecards, and climb the leaderboard, and the operator loop, where the Adrena team can publish cards, recompute the competition, inspect evidence, and manage the pilot safely.

### 0:20 - 0:40

Go to `Overview`.

Say:

> This is the live competition surface. Instead of a flat volume leaderboard, the product combines weekly rankings, daily battlecards, streaks, raffle tickets, and auditable score state. Right now there are already two registered wallets in the league.

### 0:40 - 1:00

Go to `My History`.

Click `Refresh My Wallet`.

Say:

> On the participant side, the app can pull real Adrena position history for a registered wallet, store it into the competition backend, and then recompute score, battlecard progress, and evidence. This gives traders a personal view of how they are performing inside the league.

If the refreshed wallet has limited activity, say:

> This wallet has limited Adrena history, but the ingestion path is still working and the scoring pipeline remains deterministic.

### 1:00 - 1:20

Go to `Leaderboard`.

Focus one of the two wallets.

Say:

> The leaderboard is not driven by raw size alone. It uses the competition scoring model, battlecard completion, and wallet evidence, so the system is designed to reward skill, discipline, and consistency rather than only whale behavior.

### 1:20 - 1:40

Go to `Battlecards`.

Click one battlecard CTA to route into `Trade`.

Say:

> The battlecards are the core product mechanic. Each day, traders get visible objectives that shape behavior and make the competition feel more like a game and less like passive point farming.

### 1:40 - 2:05

On `Trade`, click `Build Demo Quote`.

Say:

> For demo safety, the app runs in safe mode. That means we do not submit real mainnet trades during review. Instead, we generate a simulated quote that uses live market context and realistic trade parameters, so judges can see the full trader flow without any accidental execution risk.

When the quote appears, say:

> This preview shows indicative entry, notional, fees, liquidation context, and the exact battlecard-to-trade path, but it is clearly labeled non-executable.

Optional proof step:

Click `Build Live Quote` and say:

> We can also hit the live Adrena builder directly. If it succeeds, that proves the live integration is active. If it returns an upstream error, that is still useful because it proves the response is coming from Adrena rather than from mocked frontend data.

### 2:05 - 2:35

Go to `Admin Ops`.

Say:

> This is where the project goes beyond MVP. Operators can sync the Adrena competition service, run the scheduler, recompute the league, inspect participant evidence, review flags and disputes, and manage the competition as a real pilot instead of just watching a frontend demo.

If easy to do in one click, open one participant audit view and say:

> Every participant can be reviewed with score evidence, card evidence, adjustments, and close-event context, which makes the system auditable and operator-friendly.

### 2:35 - 2:50

Return to `Overview` or `Pilot Map`.

Say:

> So the submission is not just a UI prototype. It is a pilot-ready competition system built around real wallet flows, live Adrena integration, deterministic scoring, participant evidence, operator tooling, and a safe demo path for review.

## Fallback Lines

Use these only if something goes slightly off during recording.

- If refresh returns little data:

> This wallet has limited recent activity, but the ingestion and competition pipeline are still working as designed.

- If `Build Live Quote` errors:

> That is the live Adrena response, which is exactly what we want to prove here. The safe-mode demo quote remains the judge-friendly path.

- If a page loads slowly:

> The app is recomputing or waiting on the live service, which is expected because this path is using real backend state rather than static mock data.
