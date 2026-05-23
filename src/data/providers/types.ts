import type {
  BettingLine,
  GameContext,
  InjuryNote,
  PlayerBaseline,
  SentimentItem,
  Tagged,
  TeamBaseline,
} from "../../types";

export interface DataProvider {
  getGame(): Promise<Tagged<GameContext>>;
  getTeams(): Promise<Tagged<Record<"NYK" | "CLE", TeamBaseline>>>;
  getPlayers(): Promise<Tagged<PlayerBaseline[]>>;
  getInjuries(): Promise<Tagged<InjuryNote[]>>;
  getOdds(): Promise<Tagged<BettingLine[]>>;
  getSentiment(): Promise<Tagged<SentimentItem[]>>;
}
