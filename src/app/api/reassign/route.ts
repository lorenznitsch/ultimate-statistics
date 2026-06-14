import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeTeam, deriveDivisionNeu, deriveBelag } from "@/lib/transform";

/**
 * GET /api/reassign – Vorschau: wie viele Zeilen ändern sich?
 * POST /api/reassign – Neuzuordnung ausführen
 *
 * Aktualisiert pro Zeile: home_base, away_base, division_neu, belag
 */

interface GameRow {
  id: string;
  home: string;
  away: string;
  home_base: string;
  away_base: string;
  division: string | null;
  saison: string;
  division_neu: string | null;
  belag: string | null;
}

async function buildAliasMap(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.from("team_aliases").select("original, basisname");
  return new Map<string, string>(
    (data ?? []).map((a: { original: string; basisname: string }) => [a.original, a.basisname])
  );
}

function computeUpdates(games: GameRow[], aliasMap: Map<string, string>) {
  type Update = {
    id: string;
    home_base: string;
    away_base: string;
    division_neu: string | null;
    belag: string;
  };
  const updates: Update[] = [];

  for (const g of games) {
    const newHomeBase    = normalizeTeam(g.home, aliasMap);
    const newAwayBase    = normalizeTeam(g.away, aliasMap);
    const newDivisionNeu = deriveDivisionNeu(g.division ?? "");
    const newBelag       = deriveBelag(g.division ?? "", g.saison);

    const changed =
      newHomeBase    !== g.home_base    ||
      newAwayBase    !== g.away_base    ||
      newDivisionNeu !== g.division_neu ||
      newBelag       !== g.belag;

    if (changed) {
      updates.push({ id: g.id, home_base: newHomeBase, away_base: newAwayBase, division_neu: newDivisionNeu, belag: newBelag });
    }
  }
  return updates;
}

export async function GET() {
  const supabase = createServiceClient();
  const aliasMap = await buildAliasMap(supabase);

  const { data: games, error } = await supabase
    .from("games")
    .select("id, home, away, home_base, away_base, division, saison, division_neu, belag");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updates = computeUpdates((games ?? []) as GameRow[], aliasMap);
  return NextResponse.json({ total: games?.length ?? 0, changes: updates.length });
}

export async function POST() {
  const supabase = createServiceClient();
  const aliasMap = await buildAliasMap(supabase);

  const { data: games, error } = await supabase
    .from("games")
    .select("id, home, away, home_base, away_base, division, saison, division_neu, belag");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updates = computeUpdates((games ?? []) as GameRow[], aliasMap);

  for (const u of updates) {
    const { error: uErr } = await supabase
      .from("games")
      .update({
        home_base:    u.home_base,
        away_base:    u.away_base,
        division_neu: u.division_neu,
        belag:        u.belag,
      })
      .eq("id", u.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ updated: updates.length });
}
