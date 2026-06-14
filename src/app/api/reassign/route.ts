import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizeTeam,
  deriveDivisionNeu,
  deriveBelag,
  deriveTeamNr,
} from "@/lib/transform";

/**
 * GET /api/reassign – Vorschau: wie viele Zeilen würden sich ändern?
 * POST /api/reassign – Neuzuordnung ausführen
 *
 * Aktualisiert: home_base, away_base, home_team_nr, away_team_nr,
 *               division_neu, belag
 */

// Alle Felder, die wir aus der DB lesen und neu berechnen.
interface GameRow {
  id: string;
  home: string;
  away: string;
  home_base: string | null;
  away_base: string | null;
  home_team_nr: number | null;
  away_team_nr: number | null;
  division: string | null;
  saison: string;
  division_neu: string | null;
  belag: string | null;
}

type GameUpdate = {
  id: string;
  home_base: string;
  away_base: string;
  home_team_nr: number;
  away_team_nr: number;
  division_neu: string | null;
  belag: string;
};

async function buildAliasMap(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("team_aliases")
    .select("original, basisname");
  if (error) throw new Error(error.message);
  return new Map<string, string>(
    (data ?? []).map((a: { original: string; basisname: string }) => [
      a.original,
      a.basisname,
    ])
  );
}

function computeUpdates(
  games: GameRow[],
  aliasMap: Map<string, string>
): GameUpdate[] {
  const updates: GameUpdate[] = [];

  for (const g of games) {
    const newHomeBase    = normalizeTeam(g.home, aliasMap);
    const newAwayBase    = normalizeTeam(g.away, aliasMap);
    const newHomeTeamNr  = deriveTeamNr(g.home);
    const newAwayTeamNr  = deriveTeamNr(g.away);
    const newDivisionNeu = deriveDivisionNeu(g.division ?? "");
    const newBelag       = deriveBelag(g.division ?? "", g.saison);

    const changed =
      newHomeBase    !== (g.home_base    ?? "") ||
      newAwayBase    !== (g.away_base    ?? "") ||
      newHomeTeamNr  !== (g.home_team_nr ?? 1)  ||
      newAwayTeamNr  !== (g.away_team_nr ?? 1)  ||
      newDivisionNeu !== g.division_neu           ||
      newBelag       !== (g.belag        ?? "");

    if (changed) {
      updates.push({
        id:           g.id,
        home_base:    newHomeBase,
        away_base:    newAwayBase,
        home_team_nr: newHomeTeamNr,
        away_team_nr: newAwayTeamNr,
        division_neu: newDivisionNeu,
        belag:        newBelag,
      });
    }
  }

  return updates;
}

const SELECT_COLS =
  "id, home, away, home_base, away_base, home_team_nr, away_team_nr, division, saison, division_neu, belag";

export async function GET() {
  const supabase = createServiceClient();

  const [aliasMap, gamesResult] = await Promise.all([
    buildAliasMap(supabase).catch(() => new Map<string, string>()),
    supabase.from("games").select(SELECT_COLS),
  ]);

  if (gamesResult.error) {
    return NextResponse.json({ error: gamesResult.error.message }, { status: 500 });
  }

  const updates = computeUpdates(
    (gamesResult.data ?? []) as GameRow[],
    aliasMap
  );

  return NextResponse.json({
    total: gamesResult.data?.length ?? 0,
    changes: updates.length,
  });
}

export async function POST() {
  const supabase = createServiceClient();

  const [aliasMap, gamesResult] = await Promise.all([
    buildAliasMap(supabase).catch(() => new Map<string, string>()),
    supabase.from("games").select(SELECT_COLS),
  ]);

  if (gamesResult.error) {
    return NextResponse.json({ error: gamesResult.error.message }, { status: 500 });
  }

  const updates = computeUpdates(
    (gamesResult.data ?? []) as GameRow[],
    aliasMap
  );

  // Batched upsert – Supabase upsert by id
  const BATCH = 200;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const { error } = await supabase.from("games").upsert(batch, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ updated: updates.length });
}
