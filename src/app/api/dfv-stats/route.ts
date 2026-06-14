import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";

// -------------------------------------------------------
// Schwellenwerte – hier zentral anpassen
// -------------------------------------------------------
export const MIN_GAMES_ANGST  = 3;   // Mindest-Duelle für Angstgegner-Wertung
export const MIN_UP_GAMES     = 5;   // Mindest-UP-Spiele für UP-Quote-Wertung
export const MIN_TOTAL_GAMES  = 10;  // Mindest-Spiele für Gesamt-Wertungen

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const jahre  = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div    = searchParams.get("division");
  const belag  = searchParams.get("belag");
  const teamNr = searchParams.get("teamNr") ? Number(searchParams.get("teamNr")) : null;

  let query = supabase.from("games").select("*");
  if (jahre.length)    query = query.in("jahr", jahre);
  if (div)             query = query.eq("division_neu", div);
  if (belag)           query = query.eq("belag", belag);
  if (teamNr !== null) query = query.or(`home_team_nr.eq.${teamNr},away_team_nr.eq.${teamNr}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(computeDfvStats((data ?? []) as Game[]));
}

// -------------------------------------------------------
// Hilfsfunktionen
// -------------------------------------------------------

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("\x00");
}

function pairFromKey(key: string): [string, string] {
  const parts = key.split("\x00");
  return [parts[0], parts[1]];
}

// -------------------------------------------------------
// Statistik-Berechnung
// -------------------------------------------------------

function computeDfvStats(games: Game[]) {
  // --- 1. Häufigste Begegnung ---
  const pairCount = new Map<string, number>();
  for (const g of games) {
    const k = pairKey(g.home_base, g.away_base);
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }

  let mostFrequentPair: { teamA: string; teamB: string; count: number } | null = null;
  for (const [k, count] of pairCount) {
    if (!mostFrequentPair || count > mostFrequentPair.count) {
      const [teamA, teamB] = pairFromKey(k);
      mostFrequentPair = { teamA, teamB, count };
    }
  }

  // --- 2. Größter Angstgegner ---
  // Für jedes ungeordnete Paar: wer gewinnt öfter?
  type PairRecord = { sortedA: string; sortedB: string; winsA: number; winsB: number; total: number };
  const pairData = new Map<string, PairRecord>();

  for (const g of games) {
    const k = pairKey(g.home_base, g.away_base);
    const [sortedA, sortedB] = pairFromKey(k);
    if (!pairData.has(k)) pairData.set(k, { sortedA, sortedB, winsA: 0, winsB: 0, total: 0 });
    const pd = pairData.get(k)!;
    pd.total++;
    const homeWon = g.home_score > g.away_score;
    const homeIsSortedA = g.home_base === sortedA;
    if (homeWon)  { if (homeIsSortedA) pd.winsA++; else pd.winsB++; }
    else          { if (homeIsSortedA) pd.winsB++; else pd.winsA++; }
  }

  let biggestAngstgegner: { team: string; opponent: string; wins: number; losses: number; games: number } | null = null;
  for (const pd of pairData.values()) {
    if (pd.total < MIN_GAMES_ANGST) continue;
    // dominantTeam = wer gewinnt mehr, fearTeam = wer verliert mehr
    const [domWins, domTeam, fearTeam, fearWins] =
      pd.winsA >= pd.winsB
        ? [pd.winsA, pd.sortedA, pd.sortedB, pd.winsB]
        : [pd.winsB, pd.sortedB, pd.sortedA, pd.winsA];
    const domRate = domWins / pd.total;
    const curRate = biggestAngstgegner
      ? biggestAngstgegner.losses / biggestAngstgegner.games
      : -1;
    if (domRate > curRate) {
      biggestAngstgegner = { team: fearTeam, opponent: domTeam, wins: fearWins, losses: domWins, games: pd.total };
    }
  }

  // --- 3–5. Per-Team-Statistiken in einem Durchlauf ---
  type TeamRecord = { total: number; wins: number; upTotal: number; upWins: number };
  const teamStats = new Map<string, TeamRecord>();

  const ts = (name: string): TeamRecord => {
    if (!teamStats.has(name)) teamStats.set(name, { total: 0, wins: 0, upTotal: 0, upWins: 0 });
    return teamStats.get(name)!;
  };

  for (const g of games) {
    const homeWon = g.home_score > g.away_score;
    const isUp    = Math.abs(g.home_score - g.away_score) === 1;

    const hts = ts(g.home_base);
    hts.total++;
    if (homeWon) hts.wins++;
    if (isUp) { hts.upTotal++; if (homeWon) hts.upWins++; }

    const ats = ts(g.away_base);
    ats.total++;
    if (!homeWon) ats.wins++;
    if (isUp) { ats.upTotal++; if (!homeWon) ats.upWins++; }
  }

  let bestUPTeam:  { team: string; upWins: number; upTotal: number; winRate: number } | null = null;
  let worstUPTeam: { team: string; upWins: number; upTotal: number; winRate: number } | null = null;
  let dominantTeam: { team: string; wins: number; total: number; winRate: number } | null = null;
  let krimiTeam:   { team: string; upCount: number; total: number; upRate: number }   | null = null;

  for (const [team, rec] of teamStats) {
    // 3. UP-Quote (min. MIN_UP_GAMES UP-Spiele)
    if (rec.upTotal >= MIN_UP_GAMES) {
      const wr = Math.round((rec.upWins / rec.upTotal) * 100);
      if (!bestUPTeam  || wr > bestUPTeam.winRate)  bestUPTeam  = { team, upWins: rec.upWins, upTotal: rec.upTotal, winRate: wr };
      if (!worstUPTeam || wr < worstUPTeam.winRate) worstUPTeam = { team, upWins: rec.upWins, upTotal: rec.upTotal, winRate: wr };
    }

    if (rec.total < MIN_TOTAL_GAMES) continue;

    // 4. Dominantester Verein
    const winRate = Math.round((rec.wins / rec.total) * 100);
    if (!dominantTeam || winRate > dominantTeam.winRate) {
      dominantTeam = { team, wins: rec.wins, total: rec.total, winRate };
    }

    // 5. Krimi-Verein (höchster UP-Anteil)
    const upRate = Math.round((rec.upTotal / rec.total) * 100);
    if (!krimiTeam || upRate > krimiTeam.upRate) {
      krimiTeam = { team, upCount: rec.upTotal, total: rec.total, upRate };
    }
  }

  return {
    totalGames: games.length,
    thresholds: { MIN_GAMES_ANGST, MIN_UP_GAMES, MIN_TOTAL_GAMES },
    mostFrequentPair,
    biggestAngstgegner,
    bestUPTeam,
    worstUPTeam,
    dominantTeam,
    krimiTeam,
  };
}
