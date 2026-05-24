// Standalone game analyzer — runs the same model pipeline as the main app
// against any NBA game using ESPN's public data. Hard-coded here for
// OKC @ SAS on 2026-05-24 (the West game tomorrow). Edit ROSTER + the
// market lines block at the bottom to point at a different game.
//
// Usage: npx tsx scripts/analyze-game.mjs

import { runEnsemble, DEFAULT_WEIGHTS } from "../src/models/ensemble.ts";
import { projectPlayer } from "../src/models/playerProjection.ts";
import { buildBestBets } from "../src/models/marketComparison.ts";
import { pNormalAbove } from "../src/lib/stats.ts";

const OKC_ID = 25, SAS_ID = 24;
const HOME = "SAS";
const AWAY = "OKC";

// Rotation players to project
const ROSTER = {
  OKC: [
    { id: 4278073, key: "sga",         name: "Shai Gilgeous-Alexander", pos: "PG", projMin: 35, starter: true },
    { id: 4593803, key: "jdub",        name: "Jalen Williams",          pos: "SF", projMin: 34, starter: true },
    { id: 4433255, key: "chet",        name: "Chet Holmgren",           pos: "C",  projMin: 32, starter: true },
    { id: 4397020, key: "dort",        name: "Luguentz Dort",           pos: "SG", projMin: 32, starter: true },
    { id: 4683692, key: "wallace",     name: "Cason Wallace",           pos: "SG", projMin: 26, starter: true },
    { id: 4222252, key: "hartenstein", name: "Isaiah Hartenstein",      pos: "C",  projMin: 24, starter: false },
    { id: 2991350, key: "caruso",      name: "Alex Caruso",             pos: "G",  projMin: 22, starter: false },
    { id: 4397183, key: "wiggins",     name: "Aaron Wiggins",           pos: "G",  projMin: 20, starter: false },
    { id: 4395702, key: "joe",         name: "Isaiah Joe",              pos: "SG", projMin: 16, starter: false },
  ],
  SAS: [
    { id: 5104157, key: "wemby",       name: "Victor Wembanyama",       pos: "C",  projMin: 34, starter: true },
    { id: 4066259, key: "fox",         name: "De'Aaron Fox",            pos: "PG", projMin: 35, starter: true },
    { id: 4395630, key: "vassell",     name: "Devin Vassell",           pos: "SG", projMin: 33, starter: true },
    { id: 4845367, key: "castle",      name: "Stephon Castle",          pos: "SG", projMin: 30, starter: true },
    { id: 4395723, key: "kjohnson",    name: "Keldon Johnson",          pos: "SF", projMin: 27, starter: true },
    { id: 5037871, key: "harper",      name: "Dylan Harper",            pos: "PG", projMin: 22, starter: false },
    { id: 4592479, key: "champagnie",  name: "Julian Champagnie",       pos: "SF", projMin: 18, starter: false },
    { id: 6578,    key: "barnes",      name: "Harrison Barnes",         pos: "SF", projMin: 17, starter: false },
    { id: 3064560, key: "kornet",      name: "Luke Kornet",             pos: "C",  projMin: 16, starter: false },
  ],
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return r.json();
}

function madeAtt(s) {
  if (!s || typeof s !== "string") return [0, 0];
  const [m, a] = s.split("-").map(Number);
  return [m || 0, a || 0];
}

async function fetchPlayer(meta, team, oppId, teamPace) {
  const d = await getJSON(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${meta.id}/stats?season=2026`);
  const cat = d.categories?.find(c => c.name === "averages");
  if (!cat) return null;
  const row = cat.statistics?.find(s => s.season?.displayName === "2025-26");
  if (!row) return null;
  const labels = cat.labels;
  const get = (n) => row.stats[labels.indexOf(n)];
  const min = Number(get("MIN")) || 0;
  const pts = Number(get("PTS")) || 0;
  const reb = Number(get("REB")) || 0;
  const ast = Number(get("AST")) || 0;
  const stl = Number(get("STL")) || 0;
  const blk = Number(get("BLK")) || 0;
  const to  = Number(get("TO"))  || 0;
  const [tpm] = madeAtt(get("3PT"));
  const [fgm, fga] = madeAtt(get("FG"));
  const [ftm, fta] = madeAtt(get("FT"));
  const ts = fga + ftm > 0 ? pts / (2 * (fga + 0.44 * fta)) : 0.55;
  const k = min > 0 ? 36 / min : 1;
  const per36 = { pts: pts*k, reb: reb*k, ast: ast*k, tpm: tpm*k, stl: stl*k, blk: blk*k, to: to*k };
  const usage = ((fga + 0.44 * fta + to) * k) / (teamPace || 98);

  // gamelog → splits
  let split = { homeMult: 1, awayMult: 1, recentForm: 1, ptsStd: pts * 0.30,
                vsOpponent: { n:0, avgPts:0, mult:1 }, playoff: { n:0, avgMin: meta.projMin, avgPts: pts },
                restB2B:{mult:1}, rest1Day:{mult:1}, rest2Plus:{mult:1} };
  try {
    const gl = await getJSON(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${meta.id}/gamelog?season=2026`);
    const events = gl.events || {};
    const games = [];
    for (const st of gl.seasonTypes || []) {
      const isPost = /Postseason/i.test(st.displayName);
      const isReg = /Regular Season/i.test(st.displayName);
      if (!isPost && !isReg) continue;
      for (const c of st.categories || []) {
        for (const e of c.events || []) {
          const ev = events[e.eventId];
          if (!ev) continue;
          const mn = Number(e.stats[gl.labels.indexOf("MIN")]) || 0;
          const ps = Number(e.stats[gl.labels.indexOf("PTS")]) || 0;
          if (mn < 5) continue;
          games.push({ date: ev.gameDate, isHome: ev.atVs === "vs", isPost,
                       oppId: ev.opponent?.id, min: mn, pts: ps });
        }
      }
    }
    games.sort((a,b) => new Date(a.date) - new Date(b.date));
    const home = games.filter(g => g.isHome);
    const away = games.filter(g => !g.isHome);
    const post = games.filter(g => g.isPost);
    const vs   = games.filter(g => g.oppId === String(oppId));
    const last5 = games.slice(-5);
    const avg = xs => xs.length ? xs.reduce((s,g)=>s+g.pts,0)/xs.length : 0;
    const avgM = xs => xs.length ? xs.reduce((s,g)=>s+g.min,0)/xs.length : 0;
    const seasonAvg = avg(games);
    const std = arr => {
      if (arr.length < 2) return seasonAvg * 0.3;
      const m = avg(arr);
      return Math.sqrt(arr.reduce((s,g)=>s+(g.pts-m)**2,0)/(arr.length-1));
    };
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    split = {
      homeMult: seasonAvg ? clamp(avg(home)/seasonAvg, 0.85, 1.15) : 1,
      awayMult: seasonAvg ? clamp(avg(away)/seasonAvg, 0.85, 1.15) : 1,
      recentForm: seasonAvg ? clamp(avg(last5)/seasonAvg, 0.80, 1.25) : 1,
      ptsStd: std(games) * (36 / Math.max(1, min)),
      vsOpponent: { n: vs.length, avgPts: avg(vs),
                    mult: seasonAvg && vs.length >= 2 ? clamp(avg(vs)/seasonAvg, 0.70, 1.30) : 1 },
      playoff: { n: post.length, avgMin: avgM(post), avgPts: avg(post) },
      restB2B: { mult: 1 }, rest1Day: { mult: 1 }, rest2Plus: { mult: 1 },
    };
  } catch {}

  const projMin = split.playoff.n >= 3 && split.playoff.avgMin > 5 ? split.playoff.avgMin : meta.projMin;
  return {
    id: meta.key, name: meta.name, team, position: meta.pos,
    minutes: projMin, usage: clamp01(usage, 0.05, 0.42), ts: clamp01(ts, 0.45, 0.75),
    pace: teamPace || 98, ptsPer36: per36.pts, rebPer36: per36.reb, astPer36: per36.ast,
    tpmPer36: per36.tpm, stlPer36: per36.stl, blkPer36: per36.blk, toPer36: per36.to,
    ptsStd: Math.max(2.5, Math.min(12, split.ptsStd)),
    homeMult: split.homeMult, awayMult: split.awayMult, recentForm: split.recentForm,
    vsOpponentMult: split.vsOpponent.mult, vsOpponentN: split.vsOpponent.n,
    vsOpponentPPG: split.vsOpponent.avgPts,
    restB2BMult: split.restB2B.mult, rest1Mult: split.rest1Day.mult, rest2PlusMult: split.rest2Plus.mult,
    playoffMin: split.playoff.avgMin, playoffPpg: split.playoff.avgPts, playoffN: split.playoff.n,
  };
}
function clamp01(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

async function fetchTeamSplits(teamId) {
  const d = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule?season=2026`);
  let hP=0, hA=0, hN=0, hW=0, aP=0, aA=0, aN=0, aW=0;
  for (const e of d.events || []) {
    const c = e.competitions?.[0];
    const home = c?.competitors?.find(x => x.homeAway === "home");
    const away = c?.competitors?.find(x => x.homeAway === "away");
    const hs = Number(home?.score?.value || 0), as = Number(away?.score?.value || 0);
    if (hs === 0 || as === 0) continue;
    const isHome = home.team.id === String(teamId);
    const isAway = away.team.id === String(teamId);
    if (!isHome && !isAway) continue;
    const my = isHome ? hs : as, op = isHome ? as : hs;
    if (isHome) { hP+=my; hA+=op; hN++; if(my>op)hW++; }
    else        { aP+=my; aA+=op; aN++; if(my>op)aW++; }
  }
  return { homeN:hN, homeW:hW, homePPG:hP/hN||0, homeAllow:hA/hN||0,
           awayN:aN, awayW:aW, awayPPG:aP/aN||0, awayAllow:aA/aN||0 };
}

async function fetchTeamPace(teamId, sample=12) {
  const sched = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule?season=2026`);
  const completed = (sched.events || []).filter(e => {
    const c = e.competitions?.[0];
    return Number(c?.competitors?.[0]?.score?.value || 0) > 0;
  }).slice(-sample);
  let total = 0, n = 0;
  for (const ev of completed) {
    try {
      const s = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${ev.id}`);
      const teams = s.boxscore?.teams || [];
      for (const t of teams) {
        const stat = (name) => {
          const x = (t.statistics || []).find(s => s.name === name);
          if (!x) return 0;
          const v = x.displayValue ?? x.value;
          if (typeof v === "string" && v.includes("-")) return Number(v.split("-")[1]) || 0;
          return Number(v) || 0;
        };
        const fga = stat("fieldGoalsMade-fieldGoalsAttempted");
        const fta = stat("freeThrowsMade-freeThrowsAttempted");
        const orb = stat("offensiveRebounds");
        const to  = stat("totalTurnovers") || stat("turnovers");
        const poss = fga + 0.44 * fta - orb + to;
        if (poss > 70 && poss < 130) { total += poss; n++; }
      }
    } catch {}
  }
  return n > 0 ? total / n : null;
}

(async () => {
  console.log("Fetching SAS + OKC team data…");
  const [sasPace, okcPace, sasSplits, okcSplits] = await Promise.all([
    fetchTeamPace(SAS_ID), fetchTeamPace(OKC_ID),
    fetchTeamSplits(SAS_ID), fetchTeamSplits(OKC_ID),
  ]);
  console.log("Pace SAS:", sasPace, "OKC:", okcPace);
  console.log("SAS splits:", sasSplits);
  console.log("OKC splits:", okcSplits);

  console.log("\nFetching all rotation players…");
  const okcPlayers = (await Promise.all(ROSTER.OKC.map(p => fetchPlayer(p, "OKC", SAS_ID, okcPace)))).filter(Boolean);
  const sasPlayers = (await Promise.all(ROSTER.SAS.map(p => fetchPlayer(p, "SAS", OKC_ID, sasPace)))).filter(Boolean);
  const all = [...okcPlayers, ...sasPlayers];

  // Build TEAMS object compatible with existing models
  const ortgFrom = (ppg, pace) => (ppg / pace) * 100;
  const drtgFrom = (a, p) => (a / p) * 100;
  const TEAMS = {
    NYK: { // alias OKC into the NYK slot — the ensemble code is hardcoded for NYK/CLE
      code: "NYK", name: "Oklahoma City Thunder", pace: okcPace,
      ortg: (ortgFrom(okcSplits.homePPG, okcPace) + ortgFrom(okcSplits.awayPPG, okcPace)) / 2,
      drtg: (drtgFrom(okcSplits.homeAllow, okcPace) + drtgFrom(okcSplits.awayAllow, okcPace)) / 2,
      homeOrtg: ortgFrom(okcSplits.homePPG, okcPace),
      awayOrtg: ortgFrom(okcSplits.awayPPG, okcPace),
      homeDrtg: drtgFrom(okcSplits.homeAllow, okcPace),
      awayDrtg: drtgFrom(okcSplits.awayAllow, okcPace),
      threePtRate: 0.39, recordWinPct: 64/82, restDays: 2,
    },
    CLE: { // alias SAS into the CLE (home) slot
      code: "CLE", name: "San Antonio Spurs", pace: sasPace,
      ortg: (ortgFrom(sasSplits.homePPG, sasPace) + ortgFrom(sasSplits.awayPPG, sasPace)) / 2,
      drtg: (drtgFrom(sasSplits.homeAllow, sasPace) + drtgFrom(sasSplits.awayAllow, sasPace)) / 2,
      homeOrtg: ortgFrom(sasSplits.homePPG, sasPace),
      awayOrtg: ortgFrom(sasSplits.awayPPG, sasPace),
      homeDrtg: drtgFrom(sasSplits.homeAllow, sasPace),
      awayDrtg: drtgFrom(sasSplits.awayAllow, sasPace),
      threePtRate: 0.39, recordWinPct: 62/82, restDays: 2,
    },
  };

  // Re-label player teams to match aliases
  const aliasedPlayers = all.map(p => ({ ...p, team: p.team === "OKC" ? "NYK" : "CLE" }));

  // The market line (SAS -2.5, total 218.5, ML SAS -135 / OKC +114)
  const marketSpread = -2.5;
  const marketTotal  = 218.5;

  const v = runEnsemble({
    homeTeam: "CLE",  // SAS aliased as CLE (home)
    teams: TEAMS,
    players: aliasedPlayers,
    iterations: 30000, seed: 42, weights: DEFAULT_WEIGHTS,
    marketTotal, marketSpread,
  });

  console.log("\n=== GAME VERDICT (OKC @ SAS) ===");
  console.log(`Model: SAS ${v.homeScore.mean.toFixed(1)} (P25 ${v.homeScore.p25.toFixed(0)}, P75 ${v.homeScore.p75.toFixed(0)})`);
  console.log(`Model: OKC ${v.awayScore.mean.toFixed(1)} (P25 ${v.awayScore.p25.toFixed(0)}, P75 ${v.awayScore.p75.toFixed(0)})`);
  console.log(`Model total: ${v.total.mean.toFixed(1)} (σ ${v.total.std.toFixed(2)})`);
  console.log(`Model margin (OKC − SAS): ${v.margin.mean.toFixed(1)}`);
  console.log(`SAS win prob: ${(v.homeWinProb*100).toFixed(1)}%  OKC win prob: ${(v.awayWinProb*100).toFixed(1)}%`);
  console.log(`Market: SAS -2.5, total 218.5, ML SAS -135 / OKC +114`);

  // Build bet list using compatible lines
  const ODDS = [
    { market: "spread", selection: "CLE -2.5", price: -112, book: "DraftKings", line: -2.5 },
    { market: "spread", selection: "NYK +2.5", price: -108, book: "DraftKings", line:  2.5 },
    { market: "ml",     selection: "CLE ML",   price: -135, book: "DraftKings" },
    { market: "ml",     selection: "NYK ML",   price:  114, book: "DraftKings" },
    { market: "total",  selection: "OVER 218.5",  price: -110, book: "DraftKings", line: 218.5 },
    { market: "total",  selection: "UNDER 218.5", price: -110, book: "DraftKings", line: 218.5 },
  ];
  // Realistic player props for OKC@SAS (representative lines)
  const PROPS = [
    { market:"playerProp", selection:"SGA OVER 30.5 PTS",       price:-115, line:30.5, player:"Shai Gilgeous-Alexander", prop:"PTS" },
    { market:"playerProp", selection:"SGA OVER 6.5 AST",        price:-120, line:6.5,  player:"Shai Gilgeous-Alexander", prop:"AST" },
    { market:"playerProp", selection:"J Williams OVER 19.5 PTS",price:-110, line:19.5, player:"Jalen Williams", prop:"PTS" },
    { market:"playerProp", selection:"Chet OVER 16.5 PTS",      price:-115, line:16.5, player:"Chet Holmgren", prop:"PTS" },
    { market:"playerProp", selection:"Chet OVER 9.5 REB",       price:-120, line:9.5,  player:"Chet Holmgren", prop:"REB" },
    { market:"playerProp", selection:"Dort OVER 8.5 PTS",       price:-115, line:8.5,  player:"Luguentz Dort", prop:"PTS" },
    { market:"playerProp", selection:"Wemby OVER 25.5 PTS",     price:-115, line:25.5, player:"Victor Wembanyama", prop:"PTS" },
    { market:"playerProp", selection:"Wemby OVER 11.5 REB",     price:-125, line:11.5, player:"Victor Wembanyama", prop:"REB" },
    { market:"playerProp", selection:"Wemby OVER 3.5 BLK",      price:-130, line:3.5,  player:"Victor Wembanyama", prop:"BLK" },
    { market:"playerProp", selection:"Fox OVER 22.5 PTS",       price:-110, line:22.5, player:"De'Aaron Fox", prop:"PTS" },
    { market:"playerProp", selection:"Vassell OVER 17.5 PTS",   price:-110, line:17.5, player:"Devin Vassell", prop:"PTS" },
    { market:"playerProp", selection:"Castle OVER 14.5 PTS",    price:-110, line:14.5, player:"Stephon Castle", prop:"PTS" },
  ];

  const projs = aliasedPlayers.map(p => projectPlayer(p, TEAMS, "CLE", [], [], {
    matchup: DEFAULT_WEIGHTS.matchup, venue: DEFAULT_WEIGHTS.venue,
    form: DEFAULT_WEIGHTS.form, sentiment: DEFAULT_WEIGHTS.sentiment,
  }));

  const bets = buildBestBets({ lines: [...ODDS, ...PROPS], verdict: v, players: projs, homeTeam: "CLE", kellyCap: 0.25 });

  console.log("\n=== RANKED BETS ===");
  console.log("market".padEnd(11), "selection".padEnd(34), "modelP", "devig", "edge", "conf");
  for (const b of bets) {
    const sel = b.selection.replace(/^CLE/, "SAS").replace(/^NYK/, "OKC");
    console.log(
      b.market.padEnd(11),
      sel.padEnd(34),
      (b.modelProb*100).toFixed(1).padStart(5)+"%",
      (b.devigProb*100).toFixed(1).padStart(5)+"%",
      (b.edgePct >= 0 ? "+" : "") + (b.edgePct*100).toFixed(1).padStart(5)+"%",
      b.confidence,
    );
  }

  console.log("\n=== PROJECTED BOX (top 6 each) ===");
  console.log("OKC:");
  projs.filter(p => p.team === "NYK").slice(0,6).forEach(p => {
    console.log(' ', p.name.padEnd(22), 'MIN', p.minutes.toFixed(1).padStart(5), 'PTS', p.pts.mean.toFixed(1).padStart(5), '(σ '+p.pts.std.toFixed(1)+') REB', p.reb.mean.toFixed(1), 'AST', p.ast.mean.toFixed(1));
  });
  console.log("SAS:");
  projs.filter(p => p.team === "CLE").slice(0,6).forEach(p => {
    console.log(' ', p.name.padEnd(22), 'MIN', p.minutes.toFixed(1).padStart(5), 'PTS', p.pts.mean.toFixed(1).padStart(5), '(σ '+p.pts.std.toFixed(1)+') REB', p.reb.mean.toFixed(1), 'AST', p.ast.mean.toFixed(1));
  });
})().catch(e => { console.error(e); process.exit(1); });
