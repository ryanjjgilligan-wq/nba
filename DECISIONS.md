# Autonomous decisions log

Decisions made during the autonomous build of Game 3 Oracle, kept here so they
can be audited and changed.

## Scope

- **Single game only.** Knicks @ Cavaliers, Game 3, 2026 ECF. No game selector,
  no other matchups. Every screen is hard-coded to this single fixture.

## Repository

- **Built inside the existing `ryanjjgilligan-wq/nba` repository** instead of
  creating a new `game3-oracle` repo, because GitHub MCP access in this remote
  execution environment is restricted to a single allowlisted repository
  (`ryanjjgilligan-wq/nba`). The package name in `package.json` is still
  `game3-oracle` so it can be split out later with no rename. Branch:
  `claude/gallant-rubin-maFr7` per environment instructions.

## Stack

- **Vite + React + TypeScript + Tailwind + Recharts.** Single Vercel project.
  Compute (Monte Carlo, ensemble, EV/Kelly, projections) is pure TypeScript so
  the browser bundle and the Vercel Edge serverless functions can share the
  same code. No Python: every model is small enough to run in TS, which keeps
  the project to one Vercel deployment.

## Data layer

- **Pluggable provider behind a single `DataProvider` interface** in
  `src/data/providers`. Two implementations: `fixtureProvider` (always works)
  and `buildLiveProvider(env)` (calls real APIs when keys are present). The
  browser entrypoint (`getProvider`) routes through `/api/*` serverless
  functions, which read env vars on the server and fall back to fixtures.
- **Provenance is a first-class type.** Every payload is wrapped in
  `Tagged<T>`with `provenance: "LIVE" | "FIXTURE"` and a source string. UI
  badges expose it everywhere.
- **Odds: The Odds API.** Free-tier game lines (h2h, spreads, totals) fetched
  live when `ODDS_API_KEY` is set; player props stay on fixture because they
  require paid credits on that API. Both are merged transparently.
- **NBA stats:** prepared a balldontlie integration path but wired only the
  fixture for the initial deploy, because the free tier requires per-endpoint
  setup and the player baselines we ship are accurate enough to demonstrate
  the engine; flipping to live is purely an `api/players.ts` swap.
- **X / sentiment:** documented integration path; fixture only by default.
  Sentiment is explicitly capped at ±4% influence on any projection so a
  single tweet can never move a number meaningfully.

## Modeling

- **Two ensemble components:** Monte Carlo possession sim (60% weight default)
  + smoothed gradient-boosted-style regression anchored partially to the
  market (40%). Both visible in the verdict card; the user can re-weight live.
- **Per-player projections** are Bayesian-flavored: prior = season per-36 ×
  projected minutes, posterior modifiers = pace, venue, matchup
  (DvP × individual defender), recent form, sentiment. Every modifier emits a
  `FactorAttribution` row so the waterfall in the UI shows where each point
  came from.
- **Venue is weighted heavily** (default 1.0 on the venue knob). This is the
  defining signal of the matchup per the brief: Cleveland is +10 ppg at home.
- **Kelly is capped at 1/4 by default** (responsible-use). Slider goes to 1.0
  Kelly but the UI warns about drawdown.

## UI

- **Dark "analyst terminal" aesthetic.** Mono font, GitHub-dark palette, team
  accent colors (NYK orange, CLE wine). Single dashboard, no routing — the
  entire app is one page about one game.
- **Factor attribution is a waterfall** built with Recharts; click any player
  in the box-score table to load theirs.
- **Disclaimer is persistent** at the bottom and the bankroll/Kelly panel is
  always visible — responsible-use is built in, not opt-in.

## Deployment

- **Deferred Vercel CLI deploy.** The CLI is not pre-installed in this
  container and Vercel requires interactive auth. The README documents the
  exact `vercel` / `vercel --prod` commands and the env-var names. CI on
  GitHub Actions runs typecheck + test + build on every push so any future
  Vercel auto-deploy ships green builds. This was a forced trade — interactive
  auth can't be completed from this autonomous session — but every other piece
  is wired so the deploy is one `vercel --prod` away once authed.

## Things that are explicitly NOT in scope (decisions to NOT do them)

- No user accounts / no persistence layer. The app is a stateless dashboard.
- No bet-tracking ledger inside the app (the calibration metrics ship as a
  backtest snapshot; the live ledger lives outside this build).
- No multi-game / league-wide views. The brief is single-game; the engine is
  single-game.
