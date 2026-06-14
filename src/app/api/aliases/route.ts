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

export async function DELETE(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  const { error } = await supabase.from("team_aliases").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
