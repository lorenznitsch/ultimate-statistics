import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("team_aliases")
    .select("*")
    .order("basisname");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { original, basisname } = body;
  if (!original || !basisname) {
    return NextResponse.json({ error: "original und basisname erforderlich" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("team_aliases")
    .insert({ original: original.trim(), basisname: basisname.trim() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { id, original, basisname } = body;
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  const { data, error } = await supabase
    .from("team_aliases")
    .update({ original: original?.trim(), basisname: basisname?.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/aliases  – Bulk-Upsert per CSV-Daten.
 * Body: { rows: Array<{ original: string; basisname: string }> }
 * Bestehende Einträge (gleicher `original`-Wert) werden aktualisiert.
 */
export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json().catch(() => null);
  const rows = body?.rows;

  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows (Array) erforderlich" }, { status: 400 });
  }

  // Valide Zeilen: beide Felder müssen nicht-leer sein
  const valid: { original: string; basisname: string }[] = [];
  let skipped = 0;
  for (const r of rows) {
    const o = (r?.original ?? "").trim();
    const b = (r?.basisname ?? "").trim();
    if (o && b) valid.push({ original: o, basisname: b });
    else skipped++;
  }

  if (valid.length === 0) {
    return NextResponse.json({ imported: 0, updated: 0, skipped });
  }

  // Herausfinden, welche bereits existieren → um imported/updated zu unterscheiden
  const originals = valid.map((r) => r.original);
  const { data: existing } = await supabase
    .from("team_aliases")
    .select("original")
    .in("original", originals);
  const existingSet = new Set<string>(
    (existing ?? []).map((e: { original: string }) => e.original)
  );

  const imported = valid.filter((r) => !existingSet.has(r.original)).length;
  const updated  = valid.filter((r) =>  existingSet.has(r.original)).length;

  const { error } = await supabase
    .from("team_aliases")
    .upsert(valid, { onConflict: "original" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported, updated, skipped });
}

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  const { error } = await supabase.from("team_aliases").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
