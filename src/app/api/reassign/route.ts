import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
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
 *
 * Verwendet den Service-Role-Client (serverseitig, umgeht RLS),
 * und UPDATE statt UPSERT (kein INSERT-Recht nötig).
 */

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

const SELECT_COLS =
  "id, home, away, home_base, away_base, home_team_nr, away_team_nr, division, saison, division_neu, belag";

async function buildAliasMap(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("team_aliases")
    .select("original, basisname");
  if (error) throw new Error(`Alias-Tabelle konnte nicht geladen werden: ${error.message}`);
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
      newHomeBase    !== (g.home_base    ?? "")  ||
      newAwayBase    !== (g.away_base    ?? "")  ||
      newHomeTeamNr  !== (g.home_team_nr ?? 1)   ||
      newAwayTeamNr  !== (g.away_team_nr ?? 1)   ||
      newDivisionNeu !== g.division_neu            ||
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

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [aliasMap, gamesResult] = await Promise.all([
      buildAliasMap(supabase),
      fetchAllRows<GameRow>((from, to) =>
        supabase.from("games").select(SELECT_COLS).range(from, to)
      ),
    ]);

    if (gamesResult.error) {
      return NextResponse.json(
        { error: `Spiele konnten nicht geladen werden: ${gamesResult.error}` },
        { status: 500 }
      );
    }

    const games   = gamesResult.data;
    const updates = computeUpdates(games, aliasMap);

    // Diagnose-Logging – erscheint in Vercel Function Logs
    const mastersSample = games
      .filter((g) => (g.division ?? "").toLowerCase().includes("masters"))
      .slice(0, 3);
    if (mastersSample.length > 0) {
      console.error(
        "[reassign/GET] Masters-Sample:",
        mastersSample.map((g) => ({
          division:    g.division,
          stored:      g.division_neu,
          computed:    deriveDivisionNeu(g.division ?? ""),
          wouldChange: deriveDivisionNeu(g.division ?? "") !== g.division_neu,
        }))
      );
    } else {
      console.error("[reassign/GET] Keine Masters-Spiele in DB gefunden.");
    }
    console.error(`[reassign/GET] total=${games.length} changes=${updates.length}`);

    return NextResponse.json({
      total:   games.length,
      changes: updates.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = createServiceClient();

    // Alias-Map und Spiele parallel laden (paginiert, kein 1000-Limit)
    const [aliasMap, gamesResult] = await Promise.all([
      buildAliasMap(supabase),
      fetchAllRows<GameRow>((from, to) =>
        supabase.from("games").select(SELECT_COLS).range(from, to)
      ),
    ]);

    if (gamesResult.error) {
      return NextResponse.json(
        { error: `Spiele konnten nicht geladen werden: ${gamesResult.error}` },
        { status: 500 }
      );
    }

    const updates = computeUpdates(gamesResult.data, aliasMap);

    if (updates.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Explizite UPDATE-Aufrufe (kein upsert – erfordert kein INSERT-Recht).
    // Parallelisiert in Chunks von 50 für gute Performance.
    const CHUNK = 50;
    let updated = 0;
    const firstError: string[] = [];

    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);

      const results = await Promise.all(
        chunk.map((u) =>
          supabase
            .from("games")
            .update({
              home_base:    u.home_base,
              away_base:    u.away_base,
              home_team_nr: u.home_team_nr,
              away_team_nr: u.away_team_nr,
              division_neu: u.division_neu,
              belag:        u.belag,
            })
            .eq("id", u.id)
        )
      );

      for (const { error } of results) {
        if (error) {
          // Ersten Fehler merken, Rest trotzdem zählen
          if (firstError.length === 0) firstError.push(error.message);
        } else {
          updated++;
        }
      }

      // Bei einem DB-Fehler sofort abbrechen und melden
      if (firstError.length > 0) {
        return NextResponse.json(
          {
            error:   `Datenbankfehler beim Schreiben: ${firstError[0]}`,
            updated, // wie viele vor dem Fehler schon gespeichert wurden
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
