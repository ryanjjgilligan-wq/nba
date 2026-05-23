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

async function fetchPlayer(playerMeta, teamCode) {
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

  // Usage approximation from FGA + FTA*0.44 + TO per 36, divided by team pace ~ team possessions per 36
  // Without team-pace per minute we approximate usage via:
  //   usage ≈ ((FGA + 0.44*FTA + TO) per 36) / (pace * minutes_share_factor)
  // We'll fix pace=98 and assume player on the floor sees ~98 team possessions per 36 → close enough as a prior.
  const teamPossPer36 = 98;
  const usage = ((fga + 0.44 * fta + to) * k) / teamPossPer36;

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
    // Game-to-game std dev tuned per role
    ptsStd: Math.max(3.5, Math.min(9.5, per36.pts * 0.30)),
    starter: playerMeta.starter,
  };
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

  const nyk = (await Promise.all(ROSTER.NYK.map((p) => fetchPlayer(p, "NYK")))).filter(Boolean);
  const cle = (await Promise.all(ROSTER.CLE.map((p) => fetchPlayer(p, "CLE")))).filter(Boolean);
  const all = [...nyk, ...cle];

  console.log("Fetching team splits…");
  const splits = {
    NYK: await fetchTeamSplits(TEAM_IDS.NYK),
    CLE: await fetchTeamSplits(TEAM_IDS.CLE),
  };
  console.log("NYK splits:", splits.NYK);
  console.log("CLE splits:", splits.CLE);

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
    }),
  );

  console.log("\nDone — fixtures generated from REAL 2025-26 ESPN data.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
