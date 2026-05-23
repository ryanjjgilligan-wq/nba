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

## Real data sourcing (UPDATE)

After the first push, the user pointed out the player baselines were
hand-written priors, not pulled. I tested every NBA data source and discovered
**ESPN's `site.api.espn.com` / `site.web.api.espn.com` endpoints are public
and unauthenticated** — they give us everything we need with no API key:

- `/v2/sports/basketball/nba/scoreboard` — today's games + DraftKings closing
  odds (spread, ML, total) + opening lines (gives us real line movement).
- `/v2/sports/basketball/nba/teams/{id}?enable=roster,stats` — current rosters
  (revealed that CLE has Harden + Schroder, no Garland; NYK has Sochan/Clarkson).
- `/v3/sports/basketball/nba/athletes/{id}/stats?season=2026` — full per-player
  2025-26 season averages (MIN, PTS, REB, AST, 3PM, STL, BLK, TO, FG%, 3P%).
- `/v2/sports/basketball/nba/teams/{id}/schedule?season=2026` — completed games
  with real scores, used to compute real home/away PPG splits (matched the
  brief's "CLE 114.6 home / 104.4 road" exactly).

The build script `scripts/build-fixtures.mjs` pulls all of this and writes
`src/data/fixtures/_real.json`, which the bundled "fixture" providers read
from. The provenance tag in the UI is therefore `LIVE` for everything except
injuries and sentiment (where the public data isn't available).

Runtime: `api/odds.ts` also re-fetches ESPN at request time on Vercel so the
deployed app's odds stay fresh as the line moves toward tipoff.

What's still synthesized vs measured:
- Per-player home/away multipliers — still per-player judgment values, layered
  on top of the real per-36 production.
- Defense-vs-position and individual-defender impact tables — analyst priors.
- Sentiment feed and injury report — stubs (no public unauth source).
- Calibration panel — placeholder backtest numbers.

## Things that are explicitly NOT in scope (decisions to NOT do them)

- No user accounts / no persistence layer. The app is a stateless dashboard.
- No bet-tracking ledger inside the app (the calibration metrics ship as a
  backtest snapshot; the live ledger lives outside this build).
- No multi-game / league-wide views. The brief is single-game; the engine is
  single-game.
