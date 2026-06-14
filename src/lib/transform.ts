/**
 * transform.ts
 * Alle Daten-Transformations-Funktionen für den CSV-Import.
 * Die alias-Map wird als Parameter übergeben, damit die Funktionen
 * isoliert testbar sind (kein DB-Aufruf nötig).
 */

import type { CsvRow, TransformedRow } from "./types";

// Teamnamen, bei denen die abschließende Zahl NICHT als Teamnummer gilt.
export const NEVER_STRIP: ReadonlyArray<string> = [
  "Göttinger 7",
  // Hier weitere Ausnahmen ergänzen.
];

// -------------------------------------------------------
// division_neu ableiten
// WICHTIG: Masters-Prüfungen VOR den einfachen Kategorien,
// damit "Masters Mixed" nicht als "Mixed" erkannt wird.
// -------------------------------------------------------
export function deriveDivisionNeu(division: string): string | null {
  const d = division.toLowerCase();
  if (d.includes("masters") && d.includes("mixed"))  return "Masters Mixed";
  if (d.includes("masters") && d.includes("open"))   return "Masters Open";
  if (d.includes("masters") && d.includes("frauen")) return "Masters Frauen";
  if (d.includes("frauen")) return "Frauen";
  if (d.includes("mixed"))  return "Mixed";
  if (d.includes("open"))   return "Open";
  if (
    d.includes("jugend") ||
    d.includes("djum")   ||
    d.includes("u14")    ||
    d.includes("u17")    ||
    d.includes("u20")
  ) return "Jugend";
  return null;
}

// -------------------------------------------------------
// belag ableiten
// -------------------------------------------------------
export function deriveBelag(division: string, saison: string): string {
  if (saison === "Outdoor") {
    return division.toLowerCase().includes("beach") ? "Beach" : "Outdoor";
  }
  return saison; // "Indoor"
}

// -------------------------------------------------------
// Teamnummer aus Originalname ableiten
// Kein Suffix  -> 1
// " II"        -> 2, " III" -> 3, " IV" -> 4
// " 2" bis " 9" -> jeweilige Zahl
// NEVER_STRIP: Göttinger 7 etc. immer -> 1
// -------------------------------------------------------
export function deriveTeamNr(originalName: string): number {
  if (NEVER_STRIP.includes(originalName)) return 1;
  // Römische Nummern – längste zuerst prüfen
  if (/\s+IV$/i.test(originalName))  return 4;
  if (/\s+III$/i.test(originalName)) return 3;
  if (/\s+II$/i.test(originalName))  return 2;
  // Arabische Ziffern 2–9
  const m = originalName.match(/\s+([2-9])$/);
  if (m) return parseInt(m[1], 10);
  return 1;
}

// -------------------------------------------------------
// Team-Normalisierung (Basisname)
// Priorität: 1) alias-Map  2) Nummern-Entfernung
// -------------------------------------------------------
export function normalizeTeam(
  name: string,
  aliasMap: Map<string, string>
): string {
  const alias = aliasMap.get(name);
  if (alias !== undefined) return alias;

  if (NEVER_STRIP.includes(name)) return name;

  const romanStripped = name.replace(/\s+(?:IV|III|II)$/i, "");
  if (romanStripped !== name) return romanStripped.trim();

  const arabicStripped = name.replace(/\s+[2-9]$/, "");
  if (arabicStripped !== name) return arabicStripped.trim();

  return name;
}

// -------------------------------------------------------
// Haupttransformation einer CSV-Zeile
// -------------------------------------------------------
export function transformRow(
  row: CsvRow,
  jahr: number,
  saison: string,
  aliasMap: Map<string, string>
): TransformedRow {
  const home     = row.Home.trim();
  const away     = row.Away.trim();
  const division = (row.Division ?? "").trim();
  const pool     = (row.Pool ?? "").trim();

  return {
    home,
    away,
    home_base:    normalizeTeam(home, aliasMap),
    away_base:    normalizeTeam(away, aliasMap),
    home_team_nr: deriveTeamNr(home),
    away_team_nr: deriveTeamNr(away),
    home_score:   parseInt(row.HomeScores, 10) || 0,
    away_score:   parseInt(row.AwayScores, 10) || 0,
    division,
    pool,
    jahr,
    saison,
    division_neu: deriveDivisionNeu(division),
    belag:        deriveBelag(division, saison),
  };
}

// -------------------------------------------------------
// Filtert abgesagte Spiele heraus
// -------------------------------------------------------
export function isAbgesagt(row: CsvRow): boolean {
  return (
    row.Home.toLowerCase().includes("abgesagt") ||
    row.Away.toLowerCase().includes("abgesagt")
  );
}

// -------------------------------------------------------
// Verarbeitet eine Liste von CsvRow-Objekten vollständig
// -------------------------------------------------------
export function transformRows(
  rows: CsvRow[],
  jahr: number,
  saison: string,
  aliasMap: Map<string, string>
): TransformedRow[] {
  return rows
    .filter((r) => !isAbgesagt(r))
    .map((r) => transformRow(r, jahr, saison, aliasMap));
}
