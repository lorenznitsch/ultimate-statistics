export interface Game {
  id: string;
  home: string;
  away: string;
  home_base: string;
  away_base: string;
  home_score: number;
  away_score: number;
  home_team_nr: number;
  away_team_nr: number;
  division: string | null;
  pool: string | null;
  jahr: number;
  saison: string;
  division_neu: string | null;
  belag: string | null;
  created_at: string;
}

export interface TeamAlias {
  id: string;
  original: string;
  basisname: string;
  created_at: string;
}

export type Saison = "Outdoor" | "Indoor";
export type Belag = "Outdoor" | "Indoor" | "Beach";

export interface FilterState {
  jahre: number[];
  division: string;
  belag: string;
  teamNr: number | null;
}

/** Zeile nach CSV-Parse (rohe Felder) */
export interface CsvRow {
  Home: string;
  Away: string;
  HomeScores: string;
  AwayScores: string;
  Division: string;
  Pool: string;
}

/** Transformierte Zeile, bereit für DB-Insert */
export interface TransformedRow {
  home: string;
  away: string;
  home_base: string;
  away_base: string;
  home_score: number;
  away_score: number;
  home_team_nr: number;
  away_team_nr: number;
  division: string;
  pool: string;
  jahr: number;
  saison: string;
  division_neu: string | null;
  belag: string;
}
