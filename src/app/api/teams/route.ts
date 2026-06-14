import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Gibt alle distinct Vereins-Basisnamen zurück (home_base ∪ away_base), sortiert.
 * Verwendet die SQL-Funktion get_team_names() (Migration 004), die die UNION DISTINCT
 * serverseitig ausführt – kein PostgREST-Zeilenlimit, ein einziger DB-Aufruf.
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_team_names");

  if (error) {
    return NextResponse.json(
      { error: `Vereinsliste konnte nicht geladen werden: ${error.message}` },
      { status: 500 }
    );
  }

  // data ist Array<{ name: string }>
  const names = (data as Array<{ name: string }>)
    .map((r) => r.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  return NextResponse.json(names);
}
