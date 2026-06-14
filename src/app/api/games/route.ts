import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const team   = searchParams.get("team");
  const jahre  = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div    = searchParams.get("division");
  const belag  = searchParams.get("belag");
  const teamNr = searchParams.get("teamNr") ? Number(searchParams.get("teamNr")) : null;

  const { data, error } = await fetchAllRows((from, to) => {
    let q = supabase.from("games").select("*").order("jahr", { ascending: false }).range(from, to);

    if (team) {
      if (teamNr !== null) {
        q = q.or(
          `and(home_base.eq.${team},home_team_nr.eq.${teamNr}),and(away_base.eq.${team},away_team_nr.eq.${teamNr})`
        );
      } else {
        q = q.or(`home_base.eq.${team},away_base.eq.${team}`);
      }
    }
    if (jahre.length) q = q.in("jahr", jahre);
    if (div)          q = q.eq("division_neu", div);
    if (belag)        q = q.eq("belag", belag);

    return q;
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
