"use client";

import { useEffect, useState } from "react";
import type { TeamAlias } from "@/lib/types";

export default function AliasesPage() {
  const [aliases,      setAliases]      = useState<TeamAlias[]>([]);
  const [unusedNames,  setUnusedNames]  = useState<string[]>([]);
  const [newOriginal,  setNewOriginal]  = useState("");
  const [newBasis,     setNewBasis]     = useState("");
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState("");
  const [editBasis,    setEditBasis]    = useState("");
  const [error,        setError]        = useState("");
  const [status,       setStatus]       = useState("");
  // Reassign-Preview
  const [preview, setPreview] = useState<{ total: number; changes: number } | null>(null);
  const [reassigning, setReassigning] = useState(false);

  async function loadAliases() {
    const res  = await fetch("/api/aliases");
    const data = await res.json();
    if (Array.isArray(data)) setAliases(data);
  }

  async function loadUnused() {
    // Alle home+away-Originalnamen aus games, die noch keinen Alias haben
    const [gamesRes, aliasRes] = await Promise.all([
      fetch("/api/games"),
      fetch("/api/aliases"),
    ]);
    const games  = await gamesRes.json();
    const als    = await aliasRes.json();
    if (!Array.isArray(games) || !Array.isArray(als)) return;

    const covered = new Set<string>(als.map((a: TeamAlias) => a.original));
    const allNames = new Set<string>([
      ...games.map((g: { home: string }) => g.home),
      ...games.map((g: { away: string }) => g.away),
    ]);
    const unused = [...allNames].filter((n) => !covered.has(n)).sort();
    setUnusedNames(unused);
  }

  useEffect(() => {
    loadAliases();
    loadUnused();
  }, []);

  async function addAlias() {
    setError("");
    if (!newOriginal.trim() || !newBasis.trim()) {
      setError("Beide Felder sind Pflichtfelder.");
      return;
    }
    const res = await fetch("/api/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original: newOriginal.trim(), basisname: newBasis.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Fehler beim Speichern.");
      return;
    }
    setNewOriginal("");
    setNewBasis("");
    loadAliases();
    loadUnused();
  }

  async function saveEdit() {
    if (!editId) return;
    const res = await fetch("/api/aliases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, original: editOriginal.trim(), basisname: editBasis.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Fehler beim Speichern.");
      return;
    }
    setEditId(null);
    loadAliases();
    loadUnused();
  }

  async function deleteAlias(id: string) {
    if (!confirm("Alias wirklich löschen?")) return;
    await fetch(`/api/aliases?id=${id}`, { method: "DELETE" });
    loadAliases();
    loadUnused();
  }

  async function loadReassignPreview() {
    setError("");
    const res  = await fetch("/api/reassign");
    const data = await res.json();
    if (!res.ok || data.error) {
      setError(`Vorschau fehlgeschlagen: ${data.error ?? res.statusText}`);
      return;
    }
    setPreview(data);
  }

  async function runReassign() {
    if (!preview) return;
    if (!confirm(`${preview.changes} Zeilen werden aktualisiert. Fortfahren?`)) return;
    setError("");
    setReassigning(true);

    const res  = await fetch("/api/reassign", { method: "POST" });
    const data = await res.json();
    setReassigning(false);
    setPreview(null);

    if (!res.ok || data.error) {
      // Echter Fehler — zeige ihn an, damit er debuggt werden kann
      setError(`Fehler beim Neu-Zuordnen: ${data.error ?? res.statusText}`);
      if (typeof data.updated === "number" && data.updated > 0) {
        setStatus(`⚠️ ${data.updated} Zeilen wurden gespeichert, bevor der Fehler auftrat.`);
        setTimeout(() => setStatus(""), 8000);
      }
      return;
    }

    setStatus(`✓ ${data.updated} Zeilen wurden erfolgreich neu zugeordnet.`);
    setTimeout(() => setStatus(""), 6000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alias-Verwaltung</h1>
        <p className="text-gray-500 mt-1">Team-Namen auf Basisnamen zusammenführen</p>
      </div>

      {/* Hinweis-Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Hinweis:</strong> Änderungen wirken sich erst beim nächsten Import aus. Bereits importierte Spiele
        kannst du mit dem Button „Bestehende Spiele neu zuordnen" aktualisieren.
      </div>

      {status && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">{status}</div>
      )}

      {/* Neuen Alias hinzufügen */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Neuen Alias hinzufügen</h2>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Original (exakter Teamname)</label>
            <input
              type="text"
              list="unused-names"
              value={newOriginal}
              onChange={(e) => setNewOriginal(e.target.value)}
              placeholder="z.B. Bonobos Bonobabes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
            />
            <datalist id="unused-names">
              {unusedNames.map((n) => <option key={n} value={n} />)}
            </datalist>
            {unusedNames.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{unusedNames.length} Namen ohne Alias verfügbar</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Basisname</label>
            <input
              type="text"
              value={newBasis}
              onChange={(e) => setNewBasis(e.target.value)}
              placeholder="z.B. Bonobos"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
            />
          </div>
        </div>
        <button
          onClick={addAlias}
          className="mt-3 px-4 py-2 bg-[#006B5E] text-white rounded-lg text-sm font-medium hover:bg-[#005A4F] transition-colors"
        >
          + Hinzufügen
        </button>
      </div>

      {/* Bestehende Spiele neu zuordnen */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Bestehende Spiele neu zuordnen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Berechnet home_base / away_base aller importierten Spiele neu anhand der aktuellen Aliase und Nummern-Regel.
        </p>
        {!preview ? (
          <button
            onClick={loadReassignPreview}
            className="px-4 py-2 border border-[#006B5E] text-[#006B5E] rounded-lg text-sm font-medium hover:bg-[#006B5E]/5 transition-colors"
          >
            Vorschau berechnen
          </button>
        ) : (
          <div className="space-y-3">
            <div className="text-sm bg-gray-50 rounded-lg p-3">
              <strong>{preview.changes}</strong> von {preview.total} Spielen würden sich ändern.
            </div>
            <div className="flex gap-3">
              <button
                onClick={runReassign}
                disabled={reassigning || preview.changes === 0}
                className="px-4 py-2 bg-[#006B5E] text-white rounded-lg text-sm font-medium hover:bg-[#005A4F] transition-colors disabled:opacity-50"
              >
                {reassigning ? "Aktualisiere…" : "Bestätigen & aktualisieren"}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alias-Tabelle */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Alle Aliase ({aliases.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left">Original</th>
                <th className="px-5 py-3 text-left">Basisname</th>
                <th className="px-5 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aliases.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  {editId === a.id ? (
                    <>
                      <td className="px-5 py-3">
                        <input
                          value={editOriginal}
                          onChange={(e) => setEditOriginal(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B5E]"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          value={editBasis}
                          onChange={(e) => setEditBasis(e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#006B5E]"
                        />
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button onClick={saveEdit} className="text-[#006B5E] font-medium hover:underline">Speichern</button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">Abbrechen</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-mono text-gray-700">{a.original}</td>
                      <td className="px-5 py-3 font-semibold text-[#006B5E]">{a.basisname}</td>
                      <td className="px-5 py-3 text-right space-x-3">
                        <button
                          onClick={() => { setEditId(a.id); setEditOriginal(a.original); setEditBasis(a.basisname); }}
                          className="text-gray-400 hover:text-[#006B5E] transition-colors text-xs font-medium"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => deleteAlias(a.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors text-xs font-medium"
                        >
                          Löschen
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {aliases.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                    Keine Aliase vorhanden. Führe zuerst die Supabase-Migration aus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
