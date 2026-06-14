import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
import type { Game } from "@/lib/types";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const team   = searchParams.get("team");
  const jahre  = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div    = searchParams.get("division");
  const belag  = searchParams.get("belag");
  const teamNr = searchParams.get("teamNr") ? Number(searchParams.get("teamNr")) : null;

  if (!team) return NextResponse.json({ error: "team erforderlich" }, { status: 400 });

  const { data, error } = await fetchAllRows<Game>((from, to) => {
    let q = supabase.from("games").select("*").range(from, to);

    if (teamNr !== null) {
      q = q.or(
        `and(home_base.eq.${team},home_team_nr.eq.${teamNr}),and(away_base.eq.${team},away_team_nr.eq.${teamNr})`
      );
    } else {
      q = q.or(`home_base.eq.${team},away_base.eq.${team}`);
    }

    if (jahre.length) q = q.in("jahr", jahre);
    if (div)          q = q.eq("division_neu", div);
    if (belag)        q = q.eq("belag", belag);

    return q;
  });

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json(computeStats(team, data));
}

function computeStats(team: string, games: Game[]) {
  const total = games.length;
  let wins = 0, losses = 0, scored = 0, conceded = 0;
  const opponentMap = new Map<string, { wins: number; losses: number; games: number }>();
  let biggestWin: Game | null = null;
  let biggestLoss: Game | null = null;
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
    scored   += myScore;
    conceded += opScore;

    if (!opponentMap.has(opponent)) opponentMap.set(opponent, { wins: 0, losses: 0, games: 0 });
    const oEntry = opponentMap.get(opponent)!;
    oEntry.games++;
    won ? oEntry.wins++ : oEntry.losses++;

    const absDiff = Math.abs(diff);
    if (won && (!biggestWin || absDiff > Math.abs(
      (biggestWin.home_base === team ? biggestWin.home_score : biggestWin.away_score) -
      (biggestWin.home_base === team ? biggestWin.away_score : biggestWin.home_score)
    ))) biggestWin = g;
    if (!won && (!biggestLoss || absDiff > Math.abs(
      (biggestLoss.home_base === team ? biggestLoss.home_score : biggestLoss.away_score) -
      (biggestLoss.home_base === team ? biggestLoss.away_score : biggestLoss.home_score)
    ))) biggestLoss = g;

    const divKey = g.division_neu ?? "Sonstige";
    if (!byDivision.has(divKey)) byDivision.set(divKey, { wins: 0, losses: 0 });
    won ? byDivision.get(divKey)!.wins++ : byDivision.get(divKey)!.losses++;

    const bKey = g.belag ?? "Sonstige";
    if (!byBelag.has(bKey)) byBelag.set(bKey, { wins: 0, losses: 0 });
    won ? byBelag.get(bKey)!.wins++ : byBelag.get(bKey)!.losses++;

    byYear.set(g.jahr, (byYear.get(g.jahr) ?? 0) + 1);

    if (Math.abs(diff) === 1) { won ? upWins++ : upLosses++; }
  }

  const opponents = [...opponentMap.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .filter((o) => o.games >= 2);

  const mostFrequent = [...opponentMap.entries()]
    .sort((a, b) => b[1].games - a[1].games)[0];

  const worstAgainst = [...opponents]
    .sort((a, b) => (a.wins / a.games) - (b.wins / b.games))[0] ?? null;
  const bestAgainst = [...opponents]
    .sort((a, b) => (b.wins / b.games) - (a.wins / a.games))[0] ?? null;

  return {
    total, wins, losses,
    winRate: total ? Math.round((wins / total) * 100) : 0,
    scored, conceded,
    avgDiff: total ? Math.round(((scored - conceded) / total) * 10) / 10 : 0,
    mostFrequent: mostFrequent ? { name: mostFrequent[0], games: mostFrequent[1].games } : null,
    worstAgainst, bestAgainst,
    biggestWin, biggestLoss,
    byDivision: Object.fromEntries(byDivision),
    byBelag:    Object.fromEntries(byBelag),
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })),
    universePoints: {
      wins: upWins, losses: upLosses, total: upWins + upLosses,
      winRate: upWins + upLosses > 0 ? Math.round((upWins / (upWins + upLosses)) * 100) : 0,
    },
  };
}
