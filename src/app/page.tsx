"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar, { type FilterValues } from "@/components/FilterBar";
import type { Game } from "@/lib/types";

const DEFAULT_TEAM = "Hucks Ultimate Club Berlin";
const DIVISIONS = ["Masters Mixed", "Masters Open", "Masters Frauen", "Mixed", "Frauen", "Open", "Jugend"];

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

function DivBadge({ div }: { div: string | null }) {
  return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{div ?? "–"}</span>;
}

function TeamNrBadge({ nr }: { nr: number }) {
  if (nr <= 1) return null;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
      Team {nr}
    </span>
  );
}

export default function HomePage() {
  const [allTeams, setAllTeams] = useState<string[]>([]);
  const [team,     setTeam]     = useState(DEFAULT_TEAM);
  const [games,    setGames]    = useState<Game[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [jahre,    setJahre]    = useState<number[]>([]);
  const [teamNrs,  setTeamNrs]  = useState<number[]>([]);
  const [filter,   setFilter]   = useState<FilterValues>({
    jahre: [], division: "", belag: "", teamNr: null,
  });

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setAllTeams(d);
    });
  }, []);

  const load = useCallback(async (selectedTeam: string, f: FilterValues) => {
    if (!selectedTeam) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("team", selectedTeam);
    f.jahre.forEach((j) => params.append("jahr", String(j)));
    if (f.division) params.set("division", f.division);
    if (f.belag)    params.set("belag",    f.belag);
    if (f.teamNr !== null) params.set("teamNr", String(f.teamNr));

    const res  = await fetch(`/api/games?${params}`);
    const data = await res.json();
    const gs   = Array.isArray(data) ? (data as Game[]) : [];
    setGames(gs);

    // Jahre + TeamNrs nur beim ungefilterten Laden aktualisieren
    if (!f.jahre.length && !f.division && !f.belag && f.teamNr === null) {
      setJahre([...new Set(gs.map((g) => g.jahr))].sort((a, b) => b - a));
      const nrs = new Set<number>();
      gs.forEach((g) => {
        if (g.home_base === selectedTeam) nrs.add(g.home_team_nr ?? 1);
        else nrs.add(g.away_team_nr ?? 1);
      });
      setTeamNrs([...nrs].sort());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(team, { jahre: [], division: "", belag: "", teamNr: null }); }, [team]);

  function handleFilter(f: FilterValues) {
    setFilter(f);
    load(team, f);
  }

  function handleTeamChange(newTeam: string) {
    setTeam(newTeam);
    const fresh: FilterValues = { jahre: [], division: "", belag: "", teamNr: null };
    setFilter(fresh);
    setJahre([]);
    setTeamNrs([]);
  }

  const wins   = games.filter((g) => {
    const isHome = g.home_base === team;
    return isHome ? g.home_score > g.away_score : g.away_score > g.home_score;
  }).length;
  const losses = games.length - wins;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Übersicht Verein</h1>
        <p className="text-gray-500 mt-1">Alle Spiele eines Vereins</p>
      </div>

      {/* Vereins-Dropdown */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-1">Verein</label>
        <select
          value={team}
          onChange={(e) => handleTeamChange(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
        >
          {allTeams.length === 0 && <option value={DEFAULT_TEAM}>{DEFAULT_TEAM}</option>}
          {allTeams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Schnell-Stats */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Spiele",      value: games.length, cls: "text-gray-900" },
            { label: "Siege",       value: wins,         cls: "text-green-600" },
            { label: "Niederlagen", value: losses,       cls: "text-red-500"  },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <div className={`text-3xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <FilterBar
        jahre={jahre}
        selectedJahre={filter.jahre}
        divisionen={DIVISIONS}
        selectedDiv={filter.division}
        belaege={["Outdoor", "Indoor", "Beach"]}
        selectedBelag={filter.belag}
        teamNrs={teamNrs}
        selectedTeamNr={filter.teamNr}
        onChange={handleFilter}
      />

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade Daten…</div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Keine Spiele gefunden.{" "}
          {allTeams.length === 0 && (
            <>Importiere Daten unter <a href="/import" className="text-[#006B5E] underline">/import</a>.</>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((g) => {
            const isHome    = g.home_base === team;
            const my        = isHome ? g.home_score : g.away_score;
            const op        = isHome ? g.away_score : g.home_score;
            const won       = my > op;
            const opponent  = isHome ? g.away_base : g.home_base;
            const oppDetail = isHome ? g.away : g.home;
            const myTeamNr  = isHome ? (g.home_team_nr ?? 1) : (g.away_team_nr ?? 1);

            return (
              <div
                key={g.id}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border shadow-sm bg-white hover:shadow-md transition-all ${
                  won ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-400"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 truncate">{opponent}</span>
                    {myTeamNr > 1 && <TeamNrBadge nr={myTeamNr} />}
                  </div>
                  {oppDetail !== opponent && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{oppDetail}</div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {g.division && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {g.division}
                      </span>
                    )}
                    <DivBadge div={g.division_neu} />
                    <BelagBadge belag={g.belag} />
                    {g.pool && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                        Pool {g.pool}
                      </span>
                    )}
                  </div>
                </div>
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
