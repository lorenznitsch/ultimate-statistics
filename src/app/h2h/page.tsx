"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar, { type FilterValues } from "@/components/FilterBar";
import type { Game } from "@/lib/types";

function BelagBadge({ belag }: { belag: string | null }) {
  const map: Record<string, string> = {
    Outdoor: "bg-green-100 text-green-700",
    Indoor:  "bg-blue-100 text-blue-700",
    Beach:   "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[belag ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
      {belag ?? "–"}
    </span>
  );
}

export default function H2HPage() {
  const [teams,   setTeams]   = useState<string[]>([]);
  const [teamA,   setTeamA]   = useState("");
  const [teamB,   setTeamB]   = useState("");
  const [games,   setGames]   = useState<Game[]>([]);
  const [jahre,   setJahre]   = useState<number[]>([]);
  const [filter,  setFilter]  = useState<FilterValues>({ jahre: [], division: "", belag: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setTeams(d);
    });
  }, []);

  const loadGames = useCallback(async (a: string, b: string, f: FilterValues) => {
    if (!a || !b) return;
    setLoading(true);
    const params = new URLSearchParams({ teamA: a, teamB: b });
    f.jahre.forEach((j) => params.append("jahr", String(j)));
    if (f.division) params.set("division", f.division);
    if (f.belag)    params.set("belag",    f.belag);
    const res = await fetch(`/api/h2h?${params}`);
    const data = await res.json();
    const gs = Array.isArray(data) ? data as Game[] : [];
    setGames(gs);
    const js = [...new Set(gs.map((g) => g.jahr))].sort((a, b) => b - a);
    setJahre(js);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (teamA && teamB) loadGames(teamA, teamB, filter);
  }, [teamA, teamB]);

  function handleFilter(f: FilterValues) {
    setFilter(f);
    loadGames(teamA, teamB, f);
  }

  // Bilanz berechnen
  let winsA = 0, winsB = 0, pointsA = 0, pointsB = 0;
  for (const g of games) {
    const isAHome  = g.home_base === teamA;
    const scoreA   = isAHome ? g.home_score : g.away_score;
    const scoreB   = isAHome ? g.away_score : g.home_score;
    pointsA += scoreA;
    pointsB += scoreB;
    if (scoreA > scoreB) winsA++;
    else if (scoreB > scoreA) winsB++;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Head-to-Head</h1>
        <p className="text-gray-500 mt-1">Direktvergleich zweier Vereine</p>
      </div>

      {/* Team-Auswahl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Team A", value: teamA, set: setTeamA, exclude: teamB },
          { label: "Team B", value: teamB, set: setTeamB, exclude: teamA },
        ].map(({ label, value, set, exclude }) => (
          <div key={label}>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{label}</label>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
            >
              <option value="">— Team wählen —</option>
              {teams.filter((t) => t !== exclude).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {teamA && teamB && (
        <>
          {/* Bilanz-Karte */}
          <div className="bg-[#006B5E] text-white rounded-2xl p-6 text-center shadow-lg">
            <div className="text-sm font-medium text-white/70 mb-2">{games.length} Duelle gesamt</div>
            <div className="flex items-center justify-center gap-6">
              <div>
                <div className="text-5xl font-black">{winsA}</div>
                <div className="text-sm font-semibold mt-1 text-white/80 truncate max-w-[120px] mx-auto">{teamA}</div>
              </div>
              <div className="text-3xl font-bold text-white/50">:</div>
              <div>
                <div className="text-5xl font-black">{winsB}</div>
                <div className="text-sm font-semibold mt-1 text-white/80 truncate max-w-[120px] mx-auto">{teamB}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-white/60">
              Punkte gesamt: <span className="text-white font-semibold">{pointsA}</span>
              {" "}:{" "}
              <span className="text-white font-semibold">{pointsB}</span>
            </div>
          </div>

          {/* Filter */}
          <FilterBar
            jahre={jahre}
            selectedJahre={filter.jahre}
            divisionen={["Mixed", "Frauen", "Open", "Jugend"]}
            selectedDiv={filter.division}
            belaege={["Outdoor", "Indoor", "Beach"]}
            selectedBelag={filter.belag}
            onChange={handleFilter}
          />

          {/* Spiel-Liste */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">Lade…</div>
          ) : games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Keine direkten Duelle gefunden.</div>
          ) : (
            <div className="space-y-2">
              {games.map((g) => {
                const isAHome  = g.home_base === teamA;
                const scoreA   = isAHome ? g.home_score : g.away_score;
                const scoreB   = isAHome ? g.away_score : g.home_score;
                const aWon     = scoreA > scoreB;

                return (
                  <div key={g.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500">{g.division}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <BelagBadge belag={g.belag} />
                        {g.pool && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            Pool {g.pool}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <div className="font-mono text-xl font-bold">
                        <span className={aWon ? "text-green-600" : "text-red-500"}>{scoreA}</span>
                        {" : "}
                        <span className={!aWon ? "text-green-600" : "text-red-500"}>{scoreB}</span>
                      </div>
                      <div className="text-xs text-gray-400">{g.jahr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!teamA && !teamB && (
        <div className="text-center py-16 text-gray-300 text-lg">
          Wähle zwei Vereine, um ihre Duelle zu sehen.
        </div>
      )}
    </div>
  );
}
