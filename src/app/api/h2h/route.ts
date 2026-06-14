import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const teamA = searchParams.get("teamA");
  const teamB = searchParams.get("teamB");
  const jahre = searchParams.getAll("jahr").map(Number).filter(Boolean);
  const div   = searchParams.get("division");
  const belag = searchParams.get("belag");

  if (!teamA || !teamB) {
    return NextResponse.json({ error: "teamA und teamB erforderlich" }, { status: 400 });
  }

  let query = supabase
    .from("games")
    .select("*")
    .or(
      `and(home_base.eq.${teamA},away_base.eq.${teamB}),and(home_base.eq.${teamB},away_base.eq.${teamA})`
    )
    .order("jahr", { ascending: false });

  if (jahre.length) query = query.in("jahr", jahre);
  if (div)          query = query.eq("division_neu", div);
  if (belag)        query = query.eq("belag", belag);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
