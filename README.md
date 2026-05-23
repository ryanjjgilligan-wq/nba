# Game 3 Oracle

A single-game NBA analysis engine for **New York Knicks @ Cleveland Cavaliers,
Game 3 of the 2026 Eastern Conference Finals.** It is not a league-wide tool —
every model, screen, and number in the app is about this one game.

The app pulls real lines for the matchup, runs a Monte Carlo + regression
ensemble + per-player Bayesian-style projections, compares model probabilities
to the de-vigged market, and surfaces ranked positive-EV plays with fractional
Kelly stake sizing.

## Why "Oracle"

The engine surfaces *edges*, not certainties. Every projection ships with a
credible interval, every bet shows its confidence tier, and every number is
decomposable into the factors that produced it (the Factor Attribution
waterfall panel). The market is treated as a strong prior; the model only
disagrees when it has identifiable, attributable reason to.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React + Vite + Tailwind + Recharts (browser SPA)           │
│  ↑ fetches /api/* (Vercel edge functions)                   │
├─────────────────────────────────────────────────────────────┤
│  api/                                                        │
│  ├── game.ts          ← Knicks @ Cavs Game 3 context        │
│  ├── odds.ts          ← live (The Odds API) or fixture      │
│  └── simulate.ts      ← edge Monte Carlo                    │
├─────────────────────────────────────────────────────────────┤
│  src/models/                                                 │
│  ├── monteCarlo.ts        possession-level simulator        │
│  ├── playerProjection.ts  Bayesian per-player projections   │
│  ├── matchup.ts           DvP + individual defender model   │
│  ├── regression.ts        market-anchored regression        │
│  ├── ensemble.ts          weighted blend                    │
│  └── marketComparison.ts  EV / de-vig / Kelly               │
├─────────────────────────────────────────────────────────────┤
│  src/data/providers/                                         │
│  ├── fixture.ts       bundled real-game baselines           │
│  ├── live.ts          live integrations behind env flags    │
│  └── index.ts         smart factory (LIVE → FIXTURE fall)   │
└─────────────────────────────────────────────────────────────┘
```

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build (outputs to dist/)
npm test             # vitest suite
npm run typecheck
```

## Deploy to Vercel

The project is configured as a Vite framework preset (`vercel.json`). Two
ways to deploy:

### Option A — Vercel CLI (one-time)

```bash
npm i -g vercel
vercel login
vercel link            # answer 'y' to "set up and link"
vercel --prod
```

### Option B — Vercel + GitHub integration

1. Push the repository (already pushed to
   `ryanjjgilligan-wq/nba`, branch `claude/gallant-rubin-maFr7`).
2. In Vercel: **Add New → Project → Import Git Repository → ryanjjgilligan-wq/nba**.
3. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
4. Add env vars (next section), then **Deploy**.

The included `.github/workflows/ci.yml` runs typecheck + tests + build on every
push, so any auto-deploy ships a green build.

## Environment variables — fixtures → live

The app deploys and runs with **zero env vars**, serving bundled fixtures
seeded with the real Game 3 baseline. Add any of these in Vercel
(`Project → Settings → Environment Variables`) to flip the corresponding data
source to LIVE — the UI updates its provenance badge automatically.

| Variable               | Effect                                                                                  |
|------------------------|-----------------------------------------------------------------------------------------|
| `ODDS_API_KEY`         | Pulls live spreads / moneylines / totals for this game from [the-odds-api.com](https://the-odds-api.com). Player props remain on fixture (paid tier). |
| `BALLDONTLIE_API_KEY`  | Reserved — wires the stats provider to live game logs when set.                         |
| `SPORTSDATA_API_KEY`   | Reserved — alternate stats provider.                                                    |
| `X_BEARER_TOKEN`       | Reserved — enables the live X / Twitter sentiment pipeline (kept low-weight by design). |

After adding a variable, redeploy (Vercel does this automatically on the next
push, or click **Redeploy** in the dashboard).

## How the ensemble works

The Game Verdict is a weighted blend of two model components, both shown
explicitly in the UI with their own win probability and projected total:

1. **Monte Carlo possession simulator** (default weight 0.6). 10,000 iterations
   sampling game pace, then each team's offensive efficiency adjusted by the
   opponent's defense, with venue applied. Outputs full distributions for
   home/away score, margin, total.
2. **Gradient-boosted regression** (default weight 0.4). Hand-tuned linear
   features (home/away ORtg/DRtg blend, pace, venue gap) partially anchored
   to the market line — markets are efficient priors and we only tilt when the
   data justifies it.

Per-player projections are a separate Bayesian-style update:

- **Prior:** per-36 production × projected minutes.
- **Modifiers (each a multiplier with its own slider):** pace, venue
  (`homeMult`/`awayMult` from team data), matchup (defense-vs-position table
  × individual defender impact), recent form, sentiment (capped at ±4%).

Each modifier emits a row in the Factor Attribution waterfall, so any
projection is fully decomposable. Click a player in the box-score table to
load their waterfall.

## How to read the Best Bets table

Each row is one bet on this game.

- **Book P** — implied probability from the offered American price.
- **De-vig P** — the same probability after stripping the bookmaker's vig
  using the paired (over/under, home/away) market.
- **Model P** — our ensemble's probability for the bet hitting.
- **Edge** — `Model P − De-vig P`. The number we sort on (descending EV).
- **EV / 1U** — expected return per 1 unit risked.
- **Kelly Stake** — fractional Kelly (capped at 1/4 by default) sized against
  the bankroll you set on the right.
- **Conf** — confidence chip. LOW means the edge is real but small; HIGH
  means edge ≥ 6%.

Positive EV is necessary but not sufficient — always cross-reference the
**Model Disagreement** panel. If the model is wildly off the market with a low
disagreement classification, treat it as a potential blind spot, not an edge.

## Responsible use

The bottom-of-page disclaimer is not optional. All output is probabilistic; no
projection is a guarantee. The bankroll/Kelly module defaults to 1/4 Kelly and
the calibration panel surfaces Brier and ROI from the most recent out-of-sample
backtest so the model's history of over- or under-confidence is visible.

If gambling is causing harm: **1-800-GAMBLER**.
