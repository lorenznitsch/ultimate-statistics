import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { transformRows } from "@/lib/transform";
import type { CsvRow, TransformedRow } from "@/lib/types";

/** POST /api/import – nimmt transformierte Zeilen und schreibt sie in die DB */
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json() as { rows: TransformedRow[] };
  const { rows } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Keine Zeilen übergeben" }, { status: 400 });
  }

  // In Batches von 500 einfügen
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("games").insert(batch);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted += batch.length;
  }

  return NextResponse.json({ inserted });
}

/** GET /api/import/transform – wandelt CSV-Roh-Zeilen um (Vorschau) */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const jahr   = Number(searchParams.get("jahr"));
  const saison = searchParams.get("saison") ?? "Outdoor";

  // Alias-Map aus DB laden
  const { data: aliases } = await supabase.from("team_aliases").select("original, basisname");
  const aliasMap = new Map<string, string>(
    (aliases ?? []).map((a: { original: string; basisname: string }) => [a.original, a.basisname])
  );

  return NextResponse.json({ aliasMap: Object.fromEntries(aliasMap), jahr, saison });
}
