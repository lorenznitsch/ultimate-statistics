"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { transformRows } from "@/lib/transform";
import type { CsvRow, TransformedRow } from "@/lib/types";

type Step = "form" | "preview" | "done";

function Badge({ v, cls }: { v: string; cls: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{v}</span>;
}

const BELAG_CLS: Record<string, string> = {
  Outdoor: "bg-green-100 text-green-700",
  Indoor:  "bg-blue-100 text-blue-700",
  Beach:   "bg-yellow-100 text-yellow-700",
};

export default function ImportPage() {
  const [step,     setStep]     = useState<Step>("form");
  const [jahr,     setJahr]     = useState<string>(String(new Date().getFullYear()));
  const [saison,   setSaison]   = useState("Outdoor");
  const [rows,     setRows]     = useState<TransformedRow[]>([]);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [inserted, setInserted] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    // 1. Alias-Map aus der DB laden
    const aliasRes = await fetch("/api/aliases");
    const aliasData = await aliasRes.json();
    const aliasMap = new Map<string, string>(
      Array.isArray(aliasData)
        ? aliasData.map((a: { original: string; basisname: string }) => [a.original, a.basisname])
        : []
    );

    // 2. CSV parsen
    const text = await file.text();
    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length) {
      setError(`CSV-Parse-Fehler: ${parsed.errors[0].message}`);
      setLoading(false);
      return;
    }

    const required = ["Home", "Away", "HomeScores", "AwayScores", "Division", "Pool"];
    const headers  = Object.keys(parsed.data[0] ?? {});
    const missing  = required.filter((r) => !headers.includes(r));
    if (missing.length) {
      setError(`Fehlende Spalten: ${missing.join(", ")}`);
      setLoading(false);
      return;
    }

    // 3. Transformieren
    const transformed = transformRows(parsed.data, Number(jahr), saison, aliasMap);
    setRows(transformed);
    setLoading(false);
    setStep("preview");
  }

  async function confirmImport() {
    setLoading(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Fehler beim Importieren.");
      setLoading(false);
      return;
    }
    setInserted(data.inserted);
    setLoading(false);
    setStep("done");
  }

  function reset() {
    setStep("form");
    setRows([]);
    setError("");
    setInserted(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CSV-Import</h1>
        <p className="text-gray-500 mt-1">Spielergebnisse in die Datenbank importieren</p>
      </div>

      {/* Schritt-Anzeige */}
      <div className="flex items-center gap-2 text-sm">
        {(["form", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
              step === s ? "bg-[#006B5E] text-white" :
              ["form","preview","done"].indexOf(step) > i ? "bg-green-500 text-white" :
              "bg-gray-200 text-gray-500"
            }`}>{i + 1}</div>
            <span className={step === s ? "text-[#006B5E] font-semibold" : "text-gray-400"}>
              {s === "form" ? "Datei & Metadaten" : s === "preview" ? "Vorschau" : "Fertig"}
            </span>
            {i < 2 && <span className="text-gray-300">›</span>}
          </div>
        ))}
      </div>

      {/* Schritt 1: Formular */}
      {step === "form" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Jahr <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={jahr}
                min={2000}
                max={2099}
                onChange={(e) => setJahr(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Saison <span className="text-red-500">*</span>
              </label>
              <select
                value={saison}
                onChange={(e) => setSaison(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
              >
                <option>Outdoor</option>
                <option>Indoor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              CSV-Datei <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Erwartete Spalten: <code className="bg-gray-100 px-1 rounded">Home, Away, HomeScores, AwayScores, Division, Pool</code>
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#006B5E] hover:bg-[#006B5E]/5 transition-colors">
              <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-500">CSV-Datei auswählen oder hier ablegen</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
                disabled={loading || !jahr}
              />
            </label>
          </div>

          {loading && (
            <div className="text-center py-4 text-gray-400">Lade und transformiere Daten…</div>
          )}
        </div>
      )}

      {/* Schritt 2: Vorschau */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">{rows.length} Spiele</span>
              <span className="text-gray-500 ml-2">bereit für den Import ({jahr}, {saison})</span>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Zurück
              </button>
              <button
                onClick={confirmImport}
                disabled={loading}
                className="px-4 py-2 bg-[#006B5E] text-white rounded-lg text-sm font-medium hover:bg-[#005A4F] transition-colors disabled:opacity-50"
              >
                {loading ? "Importiere…" : "✓ Jetzt importieren"}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                  <tr>
                    {["Home (orig)", "home_base", "Away (orig)", "away_base", "Ergebnis", "Division", "Div-Neu", "Belag", "Pool"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 max-w-[120px] truncate" title={r.home}>{r.home}</td>
                      <td className="px-3 py-2 font-semibold text-[#006B5E] max-w-[100px] truncate">{r.home_base}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={r.away}>{r.away}</td>
                      <td className="px-3 py-2 font-semibold text-[#006B5E] max-w-[100px] truncate">{r.away_base}</td>
                      <td className="px-3 py-2 font-mono font-bold">{r.home_score}:{r.away_score}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate text-gray-500" title={r.division}>{r.division}</td>
                      <td className="px-3 py-2">
                        {r.division_neu && (
                          <Badge v={r.division_neu} cls="bg-purple-100 text-purple-700" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge v={r.belag} cls={BELAG_CLS[r.belag] ?? "bg-gray-100 text-gray-600"} />
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.pool}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schritt 3: Fertig */}
      {step === "done" && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-900">{inserted} Spiele importiert!</h2>
          <p className="text-gray-500">
            Du kannst die Daten jetzt in der{" "}
            <a href="/" className="text-[#006B5E] underline">Übersicht</a> oder im{" "}
            <a href="/h2h" className="text-[#006B5E] underline">H2H-Vergleich</a> sehen.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-[#006B5E] text-white rounded-lg font-medium hover:bg-[#005A4F] transition-colors"
          >
            Weiteren Import starten
          </button>
        </div>
      )}
    </div>
  );
}
