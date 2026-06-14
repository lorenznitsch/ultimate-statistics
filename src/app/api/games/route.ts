import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const team   = searchParams.get("team");
  const jahre  = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div    = searchParams.get("division");
  const belag  = searchParams.get("belag");
  const teamNr = searchParams.get("teamNr") ? Number(searchParams.get("teamNr")) : null;

  let query = supabase.from("games").select("*").order("jahr", { ascending: false });

  if (team) {
    if (teamNr !== null) {
      // Nur Spiele, bei denen der Verein mit der geforderten Teamnummer antritt
      query = query.or(
        `and(home_base.eq.${team},home_team_nr.eq.${teamNr}),and(away_base.eq.${team},away_team_nr.eq.${teamNr})`
      );
    } else {
      query = query.or(`home_base.eq.${team},away_base.eq.${team}`);
    }
  }
  if (jahre.length) query = query.in("jahr", jahre);
  if (div)          query = query.eq("division_neu", div);
  if (belag)        query = query.eq("belag", belag);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
