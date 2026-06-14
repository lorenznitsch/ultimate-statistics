/**
 * GET /api/reassign/debug
 *
 * Diagnosetool: Zeigt an, was deriveDivisionNeu() in der laufenden
 * Production-Umgebung für Masters-Werte berechnet, und vergleicht
 * es mit den aktuell in der Datenbank gespeicherten Werten.
 *
 * NUR für Debugging-Zwecke – kann nach der Diagnose wieder gelöscht werden.
 */
import { NextResponse } from "next/server";
import { deriveDivisionNeu } from "@/lib/transform";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  // 1. Direkte Funktions-Tests – zeigt welche Code-Version deployed ist
  const fnTests = [
    { input: "Masters Open",         expected: "Masters Open"  },
    { input: "Masters Mixed",        expected: "Masters Mixed" },
    { input: "Masters Mixed 1. Liga",expected: "Masters Mixed" },
    { input: "masters open liga",    expected: "Masters Open"  },
    { input: "Mixed 1. Liga",        expected: "Mixed"         },
    { input: "Open 1. Liga",         expected: "Open"          },
  ].map(({ input, expected }) => {
    const actual = deriveDivisionNeu(input);
    return { input, expected, actual, ok: actual === expected };
  });

  const allFnOk = fnTests.every((t) => t.ok);

  // 2. DB-Abfrage: Masters-Spiele und ihr aktuell gespeichertes division_neu
  let dbSample: unknown[] = [];
  let dbError: string | null = null;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("games")
      .select("id, division, division_neu")
      .ilike("division", "%masters%")
      .limit(20);

    if (error) {
      dbError = error.message;
    } else {
      dbSample = (data ?? []).map((g: { id: string; division: string | null; division_neu: string | null }) => ({
        id:               g.id,
        division:         g.division,
        division_neu_stored: g.division_neu,
        division_neu_computed: deriveDivisionNeu(g.division ?? ""),
        wouldChange:      deriveDivisionNeu(g.division ?? "") !== g.division_neu,
      }));
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(
    {
      summary: {
        allFunctionTestsPass: allFnOk,
        mastersGamesFound: dbSample.length,
        mastersGamesThatWouldChange: (dbSample as Array<{ wouldChange: boolean }>).filter((g) => g.wouldChange).length,
        dbError,
      },
      functionTests: fnTests,
      dbSample,
    },
    { status: 200 }
  );
}
