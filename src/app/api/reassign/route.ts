import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeTeam } from "@/lib/transform";
import type { Game } from "@/lib/types";

/**
 * GET /api/reassign – berechnet Vorschau: wie viele Zeilen würden sich ändern?
 * POST /api/reassign – führt die Neuzuordnung tatsächlich durch
 */

async function buildAliasMap(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.from("team_aliases").select("original, basisname");
  return new Map<string, string>(
    (data ?? []).map((a: { original: string; basisname: string }) => [a.original, a.basisname])
  );
}

export async function GET() {
  const supabase = createServiceClient();
  const aliasMap = await buildAliasMap(supabase);

  const { data: games, error } = await supabase.from("games").select("id, home, away, home_base, away_base");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let changesCount = 0;
  for (const g of (games ?? []) as Game[]) {
    const newHomeBase = normalizeTeam(g.home, aliasMap);
    const newAwayBase = normalizeTeam(g.away, aliasMap);
    if (newHomeBase !== g.home_base || newAwayBase !== g.away_base) {
      changesCount++;
    }
  }

  return NextResponse.json({ total: games?.length ?? 0, changes: changesCount });
}

export async function POST() {
  const supabase = createServiceClient();
  const aliasMap = await buildAliasMap(supabase);

  const { data: games, error } = await supabase.from("games").select("id, home, away, home_base, away_base");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updates: Array<{ id: string; home_base: string; away_base: string }> = [];
  for (const g of (games ?? []) as Game[]) {
    const newHomeBase = normalizeTeam(g.home, aliasMap);
    const newAwayBase = normalizeTeam(g.away, aliasMap);
    if (newHomeBase !== g.home_base || newAwayBase !== g.away_base) {
      updates.push({ id: g.id, home_base: newHomeBase, away_base: newAwayBase });
    }
  }

  // In Batches à 100 updaten
  const BATCH = 100;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error: uErr } = await supabase
        .from("games")
        .update({ home_base: u.home_base, away_base: u.away_base })
        .eq("id", u.id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ updated: updates.length });
}
