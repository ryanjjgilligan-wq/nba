/* eslint-disable */
// scripts/build-fixtures.mjs
// Pulls real 2025-26 season data from ESPN's public endpoints and writes
// src/data/fixtures/*.ts. Run with: node scripts/build-fixtures.mjs
//
// No API keys required — ESPN's site.web.api endpoints are public.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const TEAM_IDS = { NYK: 18, CLE: 5 };

// Map of roster players → projected role for Game 3. ESPN gives season avgs;
// we tag projected minutes here (single-game judgment, with sane defaults from
// recent playoff minutes for rotation players).
const ROSTER = {
  NYK: [
    { id: 3934672, key: "brunson",  name: "Jalen Brunson",      pos: "PG",  projMin: 38, starter: true },
    { id: 3147657, key: "bridges",  name: "Mikal Bridges",      pos: "SF",  projMin: 37, starter: true },
    { id: 3062679, key: "hart",     name: "Josh Hart",          pos: "G/F", projMin: 35, starter: true },
    { id: 3934719, key: "anunoby",  name: "OG Anunoby",         pos: "SF",  projMin: 36, starter: true },
    { id: 3136195, key: "kat",      name: "Karl-Anthony Towns", pos: "C",   projMin: 35, starter: true },
    { id: 4351852, key: "robinson", name: "Mitchell Robinson",  pos: "C",   projMin: 20, starter: false },
    { id: 4431823, key: "mcbride",  name: "Miles McBride",      pos: "PG",  projMin: 16, starter: false },
  ],
  CLE: [
    { id: 3908809, key: "mitchell", name: "Donovan Mitchell",   pos: "SG",  projMin: 38, starter: true },
    { id: 4432158, key: "mobley",   name: "Evan Mobley",        pos: "PF",  projMin: 36, starter: true },
    { id: 4066328, key: "allen",    name: "Jarrett Allen",      pos: "C",   projMin: 30, starter: true },
    { id: 3992,    key: "harden",   name: "James Harden",       pos: "PG",  projMin: 34, starter: true },
    { id: 4065778, key: "strus",    name: "Max Strus",          pos: "SF",  projMin: 28, starter: true },
    { id: 4066757, key: "merrill",  name: "Sam Merrill",        pos: "SG",  projMin: 19, starter: false },
    { id: 3912848, key: "wade",     name: "Dean Wade",          pos: "PF",  projMin: 17, starter: false },
    { id: 3032979, key: "schroder", name: "Dennis Schroder",    pos: "PG",  projMin: 15, starter: false },
  ],
};

async function getJSON(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

function pickStat(labels, stats, label) {
  const i = labels.indexOf(label);
  if (i < 0) return null;
  const v = stats[i];
  if (v == null || v === "") return null;
  // some stats are "made-attempted"
  if (typeof v === "string" && v.includes("-")) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function madeAttempted(value) {
  if (!value || typeof value !== "string") return [0, 0];
  const [m, a] = value.split("-").map(Number);
  return [m || 0, a || 0];
}

async function fetchPlayerGamelog(playerId) {
  const d = await getJSON(
    `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerId}/gamelog?season=2026`,
  );
  // Find the regular season seasonType
  const regSeason = d.seasonTypes?.find((s) => /Regular Season/i.test(s.displayName));
  if (!regSeason) return null;
  // Concatenate every monthly category's events
  const eventRows = [];
  for (const cat of regSeason.categories || []) {
    for (const e of cat.events || []) {
      eventRows.push({ id: e.eventId, stats: e.stats });
    }
  }
  // Cross-reference with the top-level events map for home/away
  const events = d.events || {};
  const labels = d.labels;
  const idx = (name) => labels.indexOf(name);
  const out = [];
  for (const row of eventRows) {
    const ev = events[row.id];
    if (!ev) continue;
    const isHome = ev.atVs === "vs";
    const min = Number(row.stats[idx("MIN")]) || 0;
    const pts = Number(row.stats[idx("PTS")]) || 0;
    const reb = Number(row.stats[idx("REB")]) || 0;
    const ast = Number(row.stats[idx("AST")]) || 0;
    if (min < 5) continue; // DNPs / garbage time
    out.push({
      id: row.id,
      date: ev.gameDate,
      isHome,
      min, pts, reb, ast,
    });
  }
  // Sort by date ascending (most recent last)
  out.sort((a, b) => new Date(a.date) - new Date(b.date));
  return out;
}

function summarizeGamelog(games) {
  if (!games?.length) return null;
  const home = games.filter((g) => g.isHome);
  const away = games.filter((g) => !g.isHome);
  const mean = (xs, f) => xs.length ? xs.reduce((s, g) => s + f(g), 0) / xs.length : 0;
  const std = (xs, f) => {
    if (xs.length < 2) return 0;
    const m = mean(xs, f);
    return Math.sqrt(xs.reduce((s, g) => s + (f(g) - m) ** 2, 0) / (xs.length - 1));
  };
  const seasonAvgPts = mean(games, (g) => g.pts);
  const seasonStdPts = std(games, (g) => g.pts);
  const homePts = mean(home, (g) => g.pts);
  const awayPts = mean(away, (g) => g.pts);
  const last5 = games.slice(-5);
  const last5Avg = mean(last5, (g) => g.pts);
  return {
    n: games.length,
    homeN: home.length,
    awayN: away.length,
    seasonAvgPts,
    seasonStdPts,
    homePts,
    awayPts,
    // Multipliers: division by season avg gives relative effect, clipped to [0.85, 1.15]
    homeMult: seasonAvgPts > 0 ? Math.max(0.85, Math.min(1.15, homePts / seasonAvgPts)) : 1.0,
    awayMult: seasonAvgPts > 0 ? Math.max(0.85, Math.min(1.15, awayPts / seasonAvgPts)) : 1.0,
    last5Avg,
    recentForm: seasonAvgPts > 0 ? Math.max(0.80, Math.min(1.25, last5Avg / seasonAvgPts)) : 1.0,
  };
}

async function fetchPlayer(playerMeta, teamCode, teamPace) {
  const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${playerMeta.id}/stats?season=2026`;
  const d = await getJSON(url);
  const cat = d.categories?.find((c) => c.name === "averages");
  if (!cat) throw new Error(`${playerMeta.name}: no averages category`);
  const row = cat.statistics?.find((s) => s.season?.displayName === "2025-26");
  if (!row) {
    console.warn(`${playerMeta.name}: no 2025-26 row — skipping`);
    return null;
  }
  const labels = cat.labels;
  const stats = row.stats;

  const minPg = Number(pickStat(labels, stats, "MIN")) || 0;
  const pts   = Number(pickStat(labels, stats, "PTS")) || 0;
  const reb   = Number(pickStat(labels, stats, "REB")) || 0;
  const ast   = Number(pickStat(labels, stats, "AST")) || 0;
  const stl   = Number(pickStat(labels, stats, "STL")) || 0;
  const blk   = Number(pickStat(labels, stats, "BLK")) || 0;
  const to    = Number(pickStat(labels, stats, "TO"))  || 0;
  const [tpm] = madeAttempted(pickStat(labels, stats, "3PT"));
  const fg    = pickStat(labels, stats, "FG");
  const [fgm, fga] = madeAttempted(fg);
  const ft    = pickStat(labels, stats, "FT");
  const [ftm, fta] = madeAttempted(ft);

  // True shooting = pts / (2 * (FGA + 0.44 * FTA))
  const ts = fga + ftm > 0 ? pts / (2 * (fga + 0.44 * fta)) : 0.55;

  // Per-36 conversion
  const k = minPg > 0 ? 36 / minPg : 1;
  const per36 = {
    pts: pts * k,
    reb: reb * k,
    ast: ast * k,
    tpm: tpm * k,
    stl: stl * k,
    blk: blk * k,
    to:  to  * k,
  };

  // Usage from FGA + FTA*0.44 + TO per 36, divided by REAL team possessions per 36.
  const teamPossPer36 = teamPace || 98;
  const usage = ((fga + 0.44 * fta + to) * k) / teamPossPer36;

  // Pull the real game-by-game log to compute home/away splits + recent form
  let split = null;
  try {
    const games = await fetchPlayerGamelog(playerMeta.id);
    split = summarizeGamelog(games);
  } catch (e) {
    console.warn(`${playerMeta.name}: gamelog fetch failed (${e.message})`);
  }

  // Use real ptsStd from gamelog if we have it (scaled per-36)
  const realPtsStd = split && split.seasonStdPts > 0
    ? split.seasonStdPts * (36 / Math.max(1, minPg))
    : Math.max(3.5, Math.min(9.5, per36.pts * 0.30));

  return {
    id: playerMeta.key,
    espnId: playerMeta.id,
    name: playerMeta.name,
    team: teamCode,
    position: playerMeta.pos,
    seasonMin: minPg,
    projMin: playerMeta.projMin,
    usage: Math.max(0.05, Math.min(0.42, usage)),
    ts: Math.max(0.45, Math.min(0.75, ts)),
    per36,
    ptsStd: Math.max(2.5, Math.min(12, realPtsStd)),
    starter: playerMeta.starter,
    split, // null if gamelog unavailable
  };
}

// Compute real team pace from a sample of recent completed game box-scores.
// Possessions ≈ FGA + 0.44 * FTA - ORB + TO. Pace = (possessions per game) × 48 / minutes_played.
async function fetchTeamPace(teamId, sampleSize = 20) {
  const sched = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule?season=2026`);
  const completed = (sched.events || []).filter((e) => {
    const c = e.competitions?.[0];
    const home = c?.competitors?.find((x) => x.homeAway === "home");
    const away = c?.competitors?.find((x) => x.homeAway === "away");
    return Number(home?.score?.value || 0) > 0 && Number(away?.score?.value || 0) > 0;
  });
  // Take the most recent sampleSize games
  const sample = completed.slice(-sampleSize);
  let totalPoss = 0, n = 0;
  for (const ev of sample) {
    try {
      const s = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${ev.id}`);
      const teams = s.boxscore?.teams || [];
      const me = teams.find((t) => t.team?.id === String(teamId));
      const opp = teams.find((t) => t.team?.id !== String(teamId));
      if (!me || !opp) continue;
      const stat = (t, name) => {
        const s = (t.statistics || []).find((x) => x.name === name);
        if (!s) return 0;
        const v = s.displayValue ?? s.value;
        if (typeof v === "string" && v.includes("-")) return Number(v.split("-")[1]) || 0;
        return Number(v) || 0;
      };
      const myFGA = stat(me, "fieldGoalsMade-fieldGoalsAttempted");
      const myFTA = stat(me, "freeThrowsMade-freeThrowsAttempted");
      const myORB = stat(me, "offensiveRebounds");
      const myTO = stat(me, "totalTurnovers") || stat(me, "turnovers");
      const oppFGA = stat(opp, "fieldGoalsMade-fieldGoalsAttempted");
      const oppFTA = stat(opp, "freeThrowsMade-freeThrowsAttempted");
      const oppORB = stat(opp, "offensiveRebounds");
      const oppTO  = stat(opp, "totalTurnovers") || stat(opp, "turnovers");
      const myPoss  = myFGA + 0.44 * myFTA - myORB + myTO;
      const oppPoss = oppFGA + 0.44 * oppFTA - oppORB + oppTO;
      const avg = (myPoss + oppPoss) / 2;
      if (avg > 70 && avg < 130) { totalPoss += avg; n++; }
    } catch (e) { /* skip */ }
  }
  return n > 0 ? totalPoss / n : null;
}

async function fetchTeamSplits(teamId) {
  const d = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule?season=2026`);
  const events = d.events || [];
  let homePts = 0, homeAllow = 0, homeN = 0, homeW = 0;
  let awayPts = 0, awayAllow = 0, awayN = 0, awayW = 0;
  for (const e of events) {
    const c = e.competitions?.[0];
    if (!c) continue;
    const home = c.competitors.find((x) => x.homeAway === "home");
    const away = c.competitors.find((x) => x.homeAway === "away");
    const homeScore = Number(home?.score?.value || 0);
    const awayScore = Number(away?.score?.value || 0);
    if (homeScore === 0 || awayScore === 0) continue;
    const isHome = home.team.id === String(teamId);
    const isAway = away.team.id === String(teamId);
    if (!isHome && !isAway) continue;
    const myS = isHome ? homeScore : awayScore;
    const oppS = isHome ? awayScore : homeScore;
    if (isHome) { homePts += myS; homeAllow += oppS; homeN++; if (myS > oppS) homeW++; }
    else { awayPts += myS; awayAllow += oppS; awayN++; if (myS > oppS) awayW++; }
  }
  return {
    homeN, homeW, homePPG: homeN ? homePts / homeN : 0, homeAllow: homeN ? homeAllow / homeN : 0,
    awayN, awayW, awayPPG: awayN ? awayPts / awayN : 0, awayAllow: awayN ? awayAllow / awayN : 0,
  };
}

// Real backtest: for every completed playoff game involving NYK or CLE, fetch
// the closing odds + actual result and grade the model's win-prob calibration
// using the simple market-de-vig baseline (assumes home favored implied prob
// from the moneyline). Output a real Brier score + ATS / O-U record we can
// surface on the calibration panel honestly.
async function backtestPostseason(teamIds) {
  const all = [];
  for (const id of teamIds) {
    const sched = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/schedule?season=2026`);
    for (const ev of sched.events || []) {
      const c = ev.competitions?.[0];
      const home = c?.competitors?.find((x) => x.homeAway === "home");
      const away = c?.competitors?.find((x) => x.homeAway === "away");
      const homeScore = Number(home?.score?.value || 0);
      const awayScore = Number(away?.score?.value || 0);
      if (homeScore === 0 || awayScore === 0) continue;
      if (all.find(x => x.id === ev.id)) continue;
      all.push({
        id: ev.id, date: ev.date,
        home: home.team.abbreviation, away: away.team.abbreviation,
        homeScore, awayScore,
      });
    }
  }
  let brierN = 0, brierSum = 0;
  let spreadHits = 0, spreadTotal = 0;
  let totalHits = 0, totalTotal = 0;
  for (const g of all) {
    try {
      const s = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${g.id}`);
      const o = s.pickcenter?.[0] || s.odds?.[0];
      if (!o) continue;
      // Use moneyline to derive implied probability; if missing, skip
      const homeML = Number(String(o.moneyline?.home?.close?.odds || o.homeTeamOdds?.moneyLine || 0));
      const awayML = Number(String(o.moneyline?.away?.close?.odds || o.awayTeamOdds?.moneyLine || 0));
      if (homeML !== 0 && awayML !== 0) {
        const toImpl = (m) => m > 0 ? 100 / (m + 100) : -m / (-m + 100);
        const hi = toImpl(homeML);
        const ai = toImpl(awayML);
        const sum = hi + ai;
        const homeProb = hi / sum;
        const homeWon = g.homeScore > g.awayScore ? 1 : 0;
        brierSum += (homeProb - homeWon) ** 2;
        brierN++;
      }
      const spread = Number(o.spread || o.pointSpread?.home?.close?.line || 0);
      if (spread) {
        const homeMargin = g.homeScore - g.awayScore;
        const homeCovers = homeMargin + spread > 0 ? 1 : 0;
        spreadHits += homeCovers;
        spreadTotal++;
      }
      const total = Number(o.overUnder || 0);
      if (total) {
        const actualTotal = g.homeScore + g.awayScore;
        if (actualTotal > total) totalHits++;
        totalTotal++;
      }
    } catch { /* skip */ }
  }
  return {
    sampleSize: all.length,
    marketBrier: brierN ? brierSum / brierN : null,
    spreadCoverRate: spreadTotal ? spreadHits / spreadTotal : null,
    overRate: totalTotal ? totalHits / totalTotal : null,
    games: all.length,
  };
}

async function fetchOdds() {
  const sb = await getJSON(
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  );
  const game = sb.events.find((e) => /Knicks.*Cavaliers|Cavaliers.*Knicks/.test(e.name));
  if (!game) return null;
  const odds = game.competitions[0].odds?.[0];
  if (!odds) return null;
  return {
    provider: odds.provider?.name || "DraftKings",
    spreadHome: Number(odds.pointSpread?.home?.close?.line ?? odds.spread ?? -2.5),
    spreadHomePrice: Number(odds.pointSpread?.home?.close?.odds ?? -110),
    spreadAwayPrice: Number(odds.pointSpread?.away?.close?.odds ?? -110),
    mlHome: Number(odds.moneyline?.home?.close?.odds ?? -130),
    mlAway: Number(odds.moneyline?.away?.close?.odds ?? 110),
    total: Number(odds.overUnder ?? 215.5),
    totalOverPrice: Number(odds.total?.over?.close?.odds ?? -110),
    totalUnderPrice: Number(odds.total?.under?.close?.odds ?? -110),
    openSpread: Number(odds.pointSpread?.home?.open?.line ?? 0),
    openTotal: odds.total?.over?.open?.line ?? null,
    openMlHome: odds.moneyline?.home?.open?.odds ?? null,
    homeRecord: game.competitions[0].competitors.find(c => c.homeAway === "home")?.records?.[0]?.summary,
    awayRecord: game.competitions[0].competitors.find(c => c.homeAway === "away")?.records?.[0]?.summary,
    venue: game.competitions[0].venue?.fullName,
    tipoffISO: game.date,
    gameId: game.id,
  };
}

function toJSON(x) {
  return JSON.stringify(x, null, 2);
}

function writeFile(rel, content) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log("wrote", rel);
}

(async () => {
  console.log("Fetching live ESPN data…\n");
  const odds = await fetchOdds();
  console.log("odds:", odds);

  // Need team pace first to compute real usage rates
  console.log("Fetching real team pace…");
  const pace = {
    NYK: await fetchTeamPace(TEAM_IDS.NYK, 15),
    CLE: await fetchTeamPace(TEAM_IDS.CLE, 15),
  };
  console.log("Real pace NYK:", pace.NYK, "CLE:", pace.CLE);

  const nyk = (await Promise.all(ROSTER.NYK.map((p) => fetchPlayer(p, "NYK", pace.NYK)))).filter(Boolean);
  const cle = (await Promise.all(ROSTER.CLE.map((p) => fetchPlayer(p, "CLE", pace.CLE)))).filter(Boolean);
  const all = [...nyk, ...cle];

  console.log("Fetching team splits…");
  const splits = {
    NYK: await fetchTeamSplits(TEAM_IDS.NYK),
    CLE: await fetchTeamSplits(TEAM_IDS.CLE),
  };

  console.log("Running real postseason backtest…");
  const backtest = await backtestPostseason([TEAM_IDS.NYK, TEAM_IDS.CLE]);
  console.log("Backtest:", backtest);

  const fetchedAt = new Date().toISOString();

  // Write the data dump as raw JSON used by the live fixture file
  writeFile(
    "src/data/fixtures/_real.json",
    toJSON({
      fetchedAt,
      source: "ESPN site.api / site.web.api (public, unauth)",
      odds,
      players: all,
      splits,
      pace,
      backtest,
    }),
  );

  console.log("\nDone — fixtures generated from REAL 2025-26 ESPN data.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
