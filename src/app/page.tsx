"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar, { type FilterValues } from "@/components/FilterBar";
import type { Game } from "@/lib/types";

const HOME_TEAM = "Hucks Ultimate Club Berlin";

function resultLabel(g: Game, team: string) {
  const isHome  = g.home_base === team;
  const my      = isHome ? g.home_score : g.away_score;
  const op      = isHome ? g.away_score : g.home_score;
  return { my, op, won: my > op };
}

function BelagBadge({ belag }: { belag: string | null }) {
  const map: Record<string, string> = {
    Outdoor: "bg-green-100 text-green-700",
    Indoor:  "bg-blue-100 text-blue-700",
    Beach:   "bg-yellow-100 text-yellow-700",
  };
  const cls = map[belag ?? ""] ?? "bg-gray-100 text-gray-600";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{belag ?? "–"}</span>;
}

function DivBadge({ div }: { div: string | null }) {
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{div ?? "–"}</span>;
}

export default function HomePage() {
  const [games,    setGames]    = useState<Game[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [jahre,    setJahre]    = useState<number[]>([]);
  const [filter,   setFilter]   = useState<FilterValues>({ jahre: [], division: "", belag: "" });

  const load = useCallback(async (f: FilterValues) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("team", HOME_TEAM);
    f.jahre.forEach((j) => params.append("jahr", String(j)));
    if (f.division) params.set("division", f.division);
    if (f.belag)    params.set("belag",    f.belag);

    const res = await fetch(`/api/games?${params}`);
    const data = await res.json();
    setGames(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Alle Jahre aus der DB laden (ungefiltert)
    fetch(`/api/games?team=${encodeURIComponent(HOME_TEAM)}`)
      .then((r) => r.json())
      .then((data: Game[]) => {
        if (!Array.isArray(data)) return;
        const js = [...new Set(data.map((g) => g.jahr))].sort((a, b) => b - a);
        setJahre(js);
        setGames(data);
        setLoading(false);
      });
  }, []);

  function handleFilter(f: FilterValues) {
    setFilter(f);
    load(f);
  }

  const wins   = games.filter((g) => resultLabel(g, HOME_TEAM).won).length;
  const losses = games.length - wins;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Übersicht</h1>
        <p className="text-gray-500 mt-1">{HOME_TEAM}</p>
      </div>

      {/* Schnell-Stats */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Spiele",      value: games.length,                     cls: "text-gray-900" },
            { label: "Siege",       value: wins,                             cls: "text-green-600" },
            { label: "Niederlagen", value: losses,                           cls: "text-red-500"  },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className={`text-3xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        jahre={jahre}
        selectedJahre={filter.jahre}
        divisionen={["Mixed", "Frauen", "Open", "Jugend"]}
        selectedDiv={filter.division}
        belaege={["Outdoor", "Indoor", "Beach"]}
        selectedBelag={filter.belag}
        onChange={handleFilter}
      />

      {/* Spielliste */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade Daten…</div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Keine Spiele gefunden. Importiere zuerst CSV-Daten unter{" "}
          <a href="/import" className="text-[#006B5E] underline">/import</a>.
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((g) => {
            const { my, op, won } = resultLabel(g, HOME_TEAM);
            const isHome   = g.home_base === HOME_TEAM;
            const opponent = isHome ? g.away_base : g.home_base;
            const oppDetail = isHome ? g.away : g.home;

            return (
              <div
                key={g.id}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border shadow-sm bg-white transition-all hover:shadow-md ${
                  won ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-400"
                }`}
              >
                {/* Gegner */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{opponent}</div>
                  {oppDetail !== opponent && (
                    <div className="text-xs text-gray-400 truncate">{oppDetail}</div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <DivBadge div={g.division_neu} />
                    <BelagBadge belag={g.belag} />
                    {g.pool && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        Pool {g.pool}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ergebnis */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${won ? "text-green-600" : "text-red-500"}`}>
                      {my} : {op}
                    </div>
                    <div className={`text-xs font-semibold ${won ? "text-green-500" : "text-red-400"}`}>
                      {won ? "Sieg" : "Niederlage"}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-400 w-12">
                    <div>{g.jahr}</div>
                    <div>{isHome ? "H" : "A"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
