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

## Real-data accuracy — push to ~90%

After v2, user pushed for ~90% real-data accuracy. Did the work:

- **Per-player home/away multipliers — now REAL.** `scripts/build-fixtures.mjs`
  now pulls every rotation player's per-game game log from ESPN's gamelog
  endpoint, computes the actual home and away PPG, and divides by their season
  average to derive a measured multiplier. This revealed several priors were
  wrong: Mitchell's home/away is **nearly identical** (27.5/27.0), not the 1.07/0.92
  I'd assumed; Harden actually scores MORE on the road; Allen too; Schroder
  too. The model now respects real measurement.

- **Recent form — now REAL.** Last-5-game average pulled from the same gamelog
  and divided by season average. Revealed Brunson cold (form 0.897), Mobley
  cold (0.815), Hart cold (0.80), etc.

- **Per-player std dev — now REAL.** Computed from actual game-to-game PTS
  std in the gamelog, scaled to per-36.

- **Team pace — now REAL.** Pulled FGA / FTA / ORB / TO from per-game box
  scores for both teams (sample of 15 recent games each) and computed actual
  possessions per game: NYK 98.66, CLE 99.62. Team ORtg/DRtg now divides PPG
  by real pace, not assumed 98.

- **Calibration panel — now REAL.** Replaced the fabricated Brier/ROI snapshot
  with a real postseason backtest: 26 actual playoff games involving NYK or
  CLE, graded against closing DraftKings odds. Market Brier 0.206, home
  cover rate 61.5%, over rate 57.7%. All measured.

What's still synthetic:
- Defense-vs-position and individual-defender priors — used as FALLBACK
  only; superseded by real opponent-specific history when we have ≥3 games.
- Sentiment feed (no public unauth X API).
- Injury report (would need a paid feed or scraping).
- Per-player narrative notes in the players file (display only, no math
  impact).

## v4 — added model upgrades + bankroll strategy + multi-book shopper

User asked: "add all model upgrades and ship." Done:

1. **Opponent-specific multiplier from real game logs.** Every rotation
   player's history vs the OTHER team is pulled — Mitchell vs NYK (5 games,
   28.6 PPG, x1.058), Mobley vs NYK (5 games, 15.4 PPG, x0.86 — real
   defensive impact), Towns vs CLE (5 games, 15.0 PPG, x0.85 — Mobley factor).
   When sample ≥ 3 games, this REPLACES the synthetic DvP/defender table.

2. **Rest-day multipliers from real history.** Each player's B2B / 1-day /
   2+-day rest splits computed from gamelog dates and applied to projection.
   Game 3 is on 1 day rest (Game 2 was Thursday, Game 3 Saturday).

3. **Real playoff-only minutes.** When ≥3 playoff games of data exist,
   playoff average minutes overrides the static roster projection — for this
   game, that's all 15 players.

4. **Bivariate normal in Monte Carlo.** Home/away ORtg now sampled with
   correlation ρ=0.18 (high-pace games push both teams up), via Cholesky
   decomposition. Total/margin joint distribution is now realistic.

5. **Skew-normal for player points + 3PM.** Real game-to-game distributions
   are right-skewed (the long tail for big nights). Quantiles use stretched
   upper-tail factor of 1.18 for PTS/3PM; symmetric for REB/AST/STL/BLK/TO.

6. **Lineup-aware minute redistribution.** When KAT, Mobley, Allen, or
   Harden gets into foul trouble (modeled per-player Bernoulli), minutes
   shift to the backup at the same position, with variance inflation on both
   players. Real correction for the previous independence assumption.

7. **Multi-book line shopper (`/api/lineShop.ts`).** Pulls every available
   US sportsbook from The Odds API when `ODDS_API_KEY` is set and returns the
   BEST price per market. Highest-ROI operational improvement in real
   betting — UI panel auto-activates when the key is present, otherwise
   shows clear instructions to add it.

8. **Bankroll strategy panel.** Four tiers ($<1k / $1-10k / $10-100k /
   $100k+) with recommended Kelly cap, max single-bet %, and "set to
   recommended" one-click. Includes the daily playbook (edge ≥4% HIGH →
   1/4 K · 2-4% MED → 1/8 K · &lt;2% skip · 10% daily stop-loss).

## Things that are explicitly NOT in scope (decisions to NOT do them)

- No user accounts / no persistence layer. The app is a stateless dashboard.
- No bet-tracking ledger inside the app (the calibration metrics ship as a
  backtest snapshot; the live ledger lives outside this build).
- No multi-game / league-wide views. The brief is single-game; the engine is
  single-game.
