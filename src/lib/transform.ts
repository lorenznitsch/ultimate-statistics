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
// -------------------------------------------------------
export function deriveDivisionNeu(division: string): string | null {
  const d = division.toLowerCase();
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
// Team-Normalisierung
// Priorität: 1) alias-Map  2) Nummern-Entfernung
// -------------------------------------------------------
export function normalizeTeam(
  name: string,
  aliasMap: Map<string, string>
): string {
  // 1. Alias-Tabelle hat IMMER Vorrang
  const alias = aliasMap.get(name);
  if (alias !== undefined) return alias;

  // 2. NEVER_STRIP: Sonderfall – Name bleibt unverändert
  if (NEVER_STRIP.includes(name)) return name;

  // 3. Römische Nummern am Wortende entfernen ( II | III | IV )
  const romanStripped = name.replace(/\s+(?:IV|III|II)$/, "");
  if (romanStripped !== name) return romanStripped.trim();

  // 4. Arabische Ziffern 2–9 am Wortende entfernen
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
  const home      = row.Home.trim();
  const away      = row.Away.trim();
  const division  = (row.Division ?? "").trim();
  const pool      = (row.Pool ?? "").trim();

  return {
    home,
    away,
    home_base:    normalizeTeam(home, aliasMap),
    away_base:    normalizeTeam(away, aliasMap),
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
