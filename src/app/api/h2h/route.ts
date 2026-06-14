import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const teamA  = searchParams.get("teamA");
  const teamB  = searchParams.get("teamB");
  const jahre  = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div    = searchParams.get("division");
  const belag  = searchParams.get("belag");
  const teamNr = searchParams.get("teamNr") ? Number(searchParams.get("teamNr")) : null;

  if (!teamA || !teamB) {
    return NextResponse.json({ error: "teamA und teamB erforderlich" }, { status: 400 });
  }

  let orClause: string;
  if (teamNr !== null) {
    orClause = [
      `and(home_base.eq.${teamA},away_base.eq.${teamB},home_team_nr.eq.${teamNr},away_team_nr.eq.${teamNr})`,
      `and(home_base.eq.${teamB},away_base.eq.${teamA},home_team_nr.eq.${teamNr},away_team_nr.eq.${teamNr})`,
    ].join(",");
  } else {
    orClause = [
      `and(home_base.eq.${teamA},away_base.eq.${teamB})`,
      `and(home_base.eq.${teamB},away_base.eq.${teamA})`,
    ].join(",");
  }

  const { data, error } = await fetchAllRows((from, to) => {
    let q = supabase
      .from("games")
      .select("*")
      .or(orClause)
      .order("jahr", { ascending: false })
      .range(from, to);

    if (jahre.length) q = q.in("jahr", jahre);
    if (div)          q = q.eq("division_neu", div);
    if (belag)        q = q.eq("belag", belag);

    return q;
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
