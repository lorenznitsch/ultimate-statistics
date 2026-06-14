import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/types";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const team  = searchParams.get("team");
  const jahre = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div   = searchParams.get("division");
  const belag = searchParams.get("belag");

  if (!team) return NextResponse.json({ error: "team erforderlich" }, { status: 400 });

  let query = supabase
    .from("games")
    .select("*")
    .or(`home_base.eq.${team},away_base.eq.${team}`);

  if (jahre.length) query = query.in("jahr", jahre);
  if (div)          query = query.eq("division_neu", div);
  if (belag)        query = query.eq("belag", belag);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const games = (data ?? []) as Game[];
  const stats = computeStats(team, games);
  return NextResponse.json(stats);
}

function computeStats(team: string, games: Game[]) {
  const total   = games.length;
  let wins = 0, losses = 0, scored = 0, conceded = 0;
  const opponentMap = new Map<string, { wins: number; losses: number; games: number }>();
  let biggestWin: Game | null     = null;
  let biggestLoss: Game | null    = null;
  const byDivision = new Map<string, { wins: number; losses: number }>();
  const byBelag    = new Map<string, { wins: number; losses: number }>();
  const byYear     = new Map<number, number>();
  let upWins = 0, upLosses = 0;

  for (const g of games) {
    const isHome   = g.home_base === team;
    const opponent = isHome ? g.away_base : g.home_base;
    const myScore  = isHome ? g.home_score : g.away_score;
    const opScore  = isHome ? g.away_score : g.home_score;
    const won      = myScore > opScore;
    const diff     = myScore - opScore;

    won ? wins++ : losses++;
    scored    += myScore;
    conceded  += opScore;

    // Gegner-Map
    if (!opponentMap.has(opponent)) opponentMap.set(opponent, { wins: 0, losses: 0, games: 0 });
    const oEntry = opponentMap.get(opponent)!;
    oEntry.games++;
    won ? oEntry.wins++ : oEntry.losses++;

    // Höchster Sieg / höchste Niederlage
    if (diff > 0 && (!biggestWin || diff > biggestWin.home_score - biggestWin.away_score)) biggestWin = g;
    if (diff < 0 && (!biggestLoss || diff < biggestLoss.home_score - biggestLoss.away_score)) biggestLoss = g;

    // Nach Division
    const divKey = g.division_neu ?? "Sonstige";
    if (!byDivision.has(divKey)) byDivision.set(divKey, { wins: 0, losses: 0 });
    won ? byDivision.get(divKey)!.wins++ : byDivision.get(divKey)!.losses++;

    // Nach Belag
    const bKey = g.belag ?? "Sonstige";
    if (!byBelag.has(bKey)) byBelag.set(bKey, { wins: 0, losses: 0 });
    won ? byBelag.get(bKey)!.wins++ : byBelag.get(bKey)!.losses++;

    // Nach Jahr
    byYear.set(g.jahr, (byYear.get(g.jahr) ?? 0) + 1);

    // Universe Points (1 Punkt Differenz)
    if (Math.abs(diff) === 1) {
      won ? upWins++ : upLosses++;
    }
  }

  // Häufigster, Angst- und Lieblingsgegner
  const opponents = [...opponentMap.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .filter((o) => o.games >= 2);

  const mostFrequent = [...opponentMap.entries()]
    .sort((a, b) => b[1].games - a[1].games)[0];

  const worstAgainst = opponents
    .sort((a, b) => (a.wins / a.games) - (b.wins / b.games))[0];

  const bestAgainst = opponents
    .sort((a, b) => (b.wins / b.games) - (a.wins / a.games))[0];

  return {
    total, wins, losses,
    winRate: total ? Math.round((wins / total) * 100) : 0,
    scored, conceded,
    avgDiff: total ? Math.round(((scored - conceded) / total) * 10) / 10 : 0,
    mostFrequent: mostFrequent
      ? { name: mostFrequent[0], games: mostFrequent[1].games }
      : null,
    worstAgainst: worstAgainst ?? null,
    bestAgainst: bestAgainst ?? null,
    biggestWin, biggestLoss,
    byDivision: Object.fromEntries(byDivision),
    byBelag:    Object.fromEntries(byBelag),
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    universePoints: {
      wins: upWins,
      losses: upLosses,
      total: upWins + upLosses,
      winRate: upWins + upLosses > 0
        ? Math.round((upWins / (upWins + upLosses)) * 100)
        : 0,
    },
  };
}
