import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Gibt alle distinct Basisnamen (home_base ∪ away_base) zurück */
export async function GET() {
  const supabase = await createClient();

  const [home, away] = await Promise.all([
    supabase.from("games").select("home_base").order("home_base"),
    supabase.from("games").select("away_base").order("away_base"),
  ]);

  if (home.error || away.error) {
    return NextResponse.json({ error: "DB-Fehler" }, { status: 500 });
  }

  const all = new Set<string>([
    ...(home.data ?? []).map((r) => r.home_base),
    ...(away.data ?? []).map((r) => r.away_base),
  ]);

  return NextResponse.json([...all].sort());
}
