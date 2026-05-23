import { useEffect, useMemo, useState } from "react";
import { getProvider } from "./data/providers";
import type {
  BettingLine,
  GameContext,
  InjuryNote,
  PlayerBaseline,
  Provenance,
  SentimentItem,
  Tagged,
  TeamBaseline,
} from "./types";
import {
  DEFAULT_WEIGHTS,
  type EnsembleWeights,
  disagreementReport,
  runEnsemble,
} from "./models/ensemble";
import { projectPlayer } from "./models/playerProjection";
import { buildBestBets } from "./models/marketComparison";
import { americanToImplied, devigPair } from "./lib/devig";
import { Header } from "./components/Header";
import { GameVerdictCard } from "./components/GameVerdict";
import { ProjectedBoxScores } from "./components/ProjectedBoxScores";
import { BestBetsTable } from "./components/BestBetsTable";
import { FactorAttributionPanel } from "./components/FactorAttribution";
import { SentimentFeed } from "./components/SentimentFeed";
import { ModelDisagreementPanel } from "./components/ModelDisagreement";
import { BankrollPanel } from "./components/BankrollPanel";
import { CalibrationPanel } from "./components/CalibrationPanel";
import { EnsembleControls } from "./components/EnsembleControls";
import { Disclaimer } from "./components/Disclaimer";
import { ODDS_META } from "./data/fixtures/odds";

export default function App() {
  const [game, setGame] = useState<Tagged<GameContext> | null>(null);
  const [teams, setTeams] = useState<Tagged<Record<"NYK" | "CLE", TeamBaseline>> | null>(null);
  const [players, setPlayers] = useState<Tagged<PlayerBaseline[]> | null>(null);
  const [injuries, setInjuries] = useState<Tagged<InjuryNote[]> | null>(null);
  const [odds, setOdds] = useState<Tagged<BettingLine[]> | null>(null);
  const [sentiment, setSentiment] = useState<Tagged<SentimentItem[]> | null>(null);

  const [weights, setWeights] = useState<EnsembleWeights>(DEFAULT_WEIGHTS);
  const [iterations, setIterations] = useState(10000);
  const [seed, setSeed] = useState(20260523);
  const [bankroll, setBankroll] = useState(1000);
  const [kellyCap, setKellyCap] = useState(0.25);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>("brunson");

  useEffect(() => {
    const provider = getProvider();
    Promise.all([
      provider.getGame(),
      provider.getTeams(),
      provider.getPlayers(),
      provider.getInjuries(),
      provider.getOdds(),
      provider.getSentiment(),
    ]).then(([g, t, p, inj, o, s]) => {
      setGame(g);
      setTeams(t);
      setPlayers(p);
      setInjuries(inj);
      setOdds(o);
      setSentiment(s);
    });
  }, []);

  const ready = game && teams && players && injuries && odds && sentiment;

  const playerProjections = useMemo(() => {
    if (!players || !teams || !game || !injuries || !sentiment) return [];
    return players.data.map((p) =>
      projectPlayer(
        p,
        teams.data,
        game.data.homeTeam,
        injuries.data,
        sentiment.data,
        {
          matchup: weights.matchup,
          venue: weights.venue,
          form: weights.form,
          sentiment: weights.sentiment,
        },
      ),
    );
  }, [players, teams, game, injuries, sentiment, weights]);

  // Pre-compute market values from the odds
  const marketContext = useMemo(() => {
    if (!odds) return null;
    const homeSpread = odds.data.find(
      (o) => o.market === "spread" && o.selection.startsWith("CLE"),
    );
    const awaySpread = odds.data.find(
      (o) => o.market === "spread" && o.selection.startsWith("NYK"),
    );
    const total = odds.data.find(
      (o) => o.market === "total" && /OVER/i.test(o.selection),
    );
    const homeMl = odds.data.find(
      (o) => o.market === "ml" && o.selection.startsWith("CLE"),
    );
    const awayMl = odds.data.find(
      (o) => o.market === "ml" && o.selection.startsWith("NYK"),
    );
    const homeImplied = homeMl ? americanToImplied(homeMl.price) : 0.5;
    const awayImplied = awayMl ? americanToImplied(awayMl.price) : 0.5;
    const devig = devigPair(homeImplied, awayImplied);
    return {
      marketSpread: homeSpread?.line ?? -2.5, // home spread (negative if home favored). awaySpread is the inverse.
      awaySpreadLine: awaySpread?.line ?? 2.5,
      marketTotal: total?.line ?? 213.5,
      marketHomeImpliedProb: devig.a,
      marketAwayImpliedProb: devig.b,
    };
  }, [odds]);

  const verdict = useMemo(() => {
    if (!game || !teams || !players || !marketContext) return null;
    return runEnsemble({
      homeTeam: game.data.homeTeam,
      teams: teams.data,
      players: players.data,
      iterations,
      seed,
      weights,
      marketTotal: marketContext.marketTotal,
      marketSpread: marketContext.marketSpread,
    });
  }, [game, teams, players, iterations, seed, weights, marketContext]);

  const bets = useMemo(() => {
    if (!verdict || !odds || !game) return [];
    return buildBestBets({
      lines: odds.data,
      verdict,
      players: playerProjections,
      homeTeam: game.data.homeTeam,
      kellyCap,
    });
  }, [verdict, odds, game, playerProjections, kellyCap]);

  const disagreements = useMemo(() => {
    if (!verdict || !marketContext) return [];
    return disagreementReport(
      verdict,
      marketContext.marketSpread,
      marketContext.marketTotal,
      marketContext.marketHomeImpliedProb,
    );
  }, [verdict, marketContext]);

  const overallProvenance: Provenance =
    odds?.provenance === "LIVE" || game?.provenance === "LIVE" ? "LIVE" : "FIXTURE";
  const overallSource = ready
    ? `Odds: ${odds!.source} · Stats: ${players!.source}`
    : "loading…";

  const selectedProjection =
    playerProjections.find((p) => p.playerId === selectedPlayerId) ?? null;

  if (!ready || !verdict) {
    return (
      <div className="min-h-screen flex items-center justify-center text-terminal-dim">
        Loading Game 3 Oracle…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 max-w-[1400px] mx-auto space-y-4">
      <Header game={game!.data} provenance={overallProvenance} source={overallSource} />

      {ODDS_META.openSpread !== undefined && ODDS_META.closeSpread !== undefined && (
        <div className="panel p-3 text-xs flex items-center justify-between gap-4">
          <div>
            <span className="chip bg-terminal-info/15 text-terminal-info mr-2">LINE MOVEMENT</span>
            <span className="text-terminal-dim">Open</span>{" "}
            CLE {ODDS_META.openSpread! >= 0 ? "+" : ""}{ODDS_META.openSpread}{" "}
            ({ODDS_META.openMlHome ?? "—"}) · Total {ODDS_META.openTotal ?? "—"}
            <span className="mx-2 text-terminal-dim">→</span>
            <span className="text-terminal-dim">Close</span>{" "}
            <span className="text-terminal-accent font-semibold">
              CLE {ODDS_META.closeSpread! >= 0 ? "+" : ""}{ODDS_META.closeSpread}
            </span>{" "}
            (<span className="text-terminal-accent font-semibold">{ODDS_META.closeMlHome}</span>) ·{" "}
            Total <span className="text-terminal-accent font-semibold">{ODDS_META.closeTotal}</span>
          </div>
          <div className="text-terminal-dim">
            {ODDS_META.openSpread !== undefined && ODDS_META.closeSpread !== undefined && (
              <>Spread moved {Math.abs(ODDS_META.closeSpread - ODDS_META.openSpread).toFixed(1)} pts toward CLE — sharp money on home favorite.</>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <GameVerdictCard verdict={verdict} homeTeam={game!.data.homeTeam} />
          <BestBetsTable
            bets={bets}
            oddsProvenance={odds!.provenance}
            bankroll={bankroll}
          />
          <ProjectedBoxScores
            players={playerProjections}
            selectedPlayerId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
          />
          <FactorAttributionPanel projection={selectedProjection} />
        </div>
        <div className="space-y-4">
          <EnsembleControls
            weights={weights}
            setWeights={setWeights}
            iterations={iterations}
            setIterations={setIterations}
            seed={seed}
            setSeed={setSeed}
          />
          <BankrollPanel
            bankroll={bankroll}
            setBankroll={setBankroll}
            kellyCap={kellyCap}
            setKellyCap={setKellyCap}
          />
          <ModelDisagreementPanel items={disagreements} />
          <CalibrationPanel />
          <NarrativeContext notes={game!.data.notes} injuries={injuries!.data} />
        </div>
      </div>

      <SentimentFeed items={sentiment!.data} />
      <Disclaimer />
      <footer className="text-center text-[10px] text-terminal-dim py-4">
        Game 3 Oracle · Built for educational/analytical use · Not gambling
        advice · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function NarrativeContext({
  notes,
  injuries,
}: {
  notes: string[];
  injuries: InjuryNote[];
}) {
  return (
    <section className="panel p-4 text-xs">
      <h2 className="text-sm uppercase tracking-widest text-terminal-dim mb-2">
        Narrative & Context
      </h2>
      <ul className="space-y-1 list-disc list-inside">
        {notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      {injuries.length > 0 && (
        <>
          <div className="mt-3 text-terminal-dim uppercase text-[10px] tracking-wider">
            Injury Report
          </div>
          <ul className="mt-1 space-y-1">
            {injuries.map((i, idx) => (
              <li key={idx}>
                <span className="font-semibold">
                  {i.player} ({i.team})
                </span>{" "}
                <span
                  className={`chip ${
                    i.status === "OUT"
                      ? "bg-terminal-danger/15 text-terminal-danger"
                      : i.status === "QUESTIONABLE"
                      ? "bg-terminal-warn/15 text-terminal-warn"
                      : "bg-terminal-accent/15 text-terminal-accent"
                  }`}
                >
                  {i.status}
                </span>{" "}
                <span className="text-terminal-dim">— {i.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
