"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar, { type FilterValues } from "@/components/FilterBar";
import type { Game } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface StatsData {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  scored: number;
  conceded: number;
  avgDiff: number;
  mostFrequent: { name: string; games: number } | null;
  worstAgainst: { name: string; wins: number; losses: number; games: number } | null;
  bestAgainst:  { name: string; wins: number; losses: number; games: number } | null;
  biggestWin:   Game | null;
  biggestLoss:  Game | null;
  byDivision: Record<string, { wins: number; losses: number }>;
  byBelag:    Record<string, { wins: number; losses: number }>;
  byYear: Array<{ year: number; count: number }>;
  universePoints: { wins: number; losses: number; total: number; winRate: number };
}

// Welche Kachel zeigt gerade ihre Spiele?
type ActivePanel = "mostFrequent" | "worstAgainst" | "bestAgainst" | "universePoints" | null;

function StatCard({
  title,
  children,
  clickable,
  onClick,
  active,
}: {
  title: string;
  children: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
        clickable
          ? "cursor-pointer hover:shadow-md hover:border-[#006B5E]/50 select-none"
          : ""
      } ${active ? "border-[#006B5E] ring-2 ring-[#006B5E]/20" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        {clickable && (
          <span className="text-[10px] text-[#006B5E] font-medium bg-[#006B5E]/8 px-2 py-0.5 rounded-full">
            {active ? "▲ ausblenden" : "▼ Spiele"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function WinLossRow({ label, wins, losses }: { label: string; wins: number; losses: number }) {
  const total = wins + losses;
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-28 text-sm text-gray-600 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="bg-[#006B5E] h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-20 text-right">{wins}S / {losses}N</span>
    </div>
  );
}

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

function GameList({ games, team, emptyText }: { games: Game[]; team: string; emptyText?: string }) {
  if (games.length === 0) {
    return <p className="text-sm text-gray-400 py-2">{emptyText ?? "Keine Spiele."}</p>;
  }
  return (
    <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
      {games.map((g) => {
        const isHome   = g.home_base === team;
        const my       = isHome ? g.home_score : g.away_score;
        const op       = isHome ? g.away_score : g.home_score;
        const won      = my > op;
        const opponent = isHome ? g.away_base : g.home_base;
        return (
          <div
            key={g.id}
            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm ${
              won ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-800 truncate block">{opponent}</span>
              <div className="flex gap-1 mt-0.5">
                <span className="text-xs text-gray-400">{g.jahr}</span>
                {g.division_neu && (
                  <span className="text-xs text-purple-500">· {g.division_neu}</span>
                )}
                <BelagBadge belag={g.belag} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={`font-bold ${won ? "text-green-600" : "text-red-500"}`}>
                {my}:{op}
              </span>
              <span className={`ml-1 text-xs ${won ? "text-green-500" : "text-red-400"}`}>
                {won ? "S" : "N"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [teams,       setTeams]       = useState<string[]>([]);
  const [team,        setTeam]        = useState("");
  const [stats,       setStats]       = useState<StatsData | null>(null);
  const [allGames,    setAllGames]    = useState<Game[]>([]);
  const [jahre,       setJahre]       = useState<number[]>([]);
  const [filter,      setFilter]      = useState<FilterValues>({ jahre: [], division: "", belag: "" });
  const [loading,     setLoading]     = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setTeams(d);
    });
    fetch("/api/games").then((r) => r.json()).then((d: Game[]) => {
      if (Array.isArray(d)) {
        const js = [...new Set(d.map((g) => g.jahr))].sort((a, b) => b - a);
        setJahre(js);
      }
    });
  }, []);

  const loadStats = useCallback(async (t: string, f: FilterValues) => {
    if (!t) return;
    setLoading(true);
    setActivePanel(null);
    const params = new URLSearchParams({ team: t });
    f.jahre.forEach((j) => params.append("jahr", String(j)));
    if (f.division) params.set("division", f.division);
    if (f.belag)    params.set("belag",    f.belag);

    const [statsRes, gamesRes] = await Promise.all([
      fetch(`/api/stats?${params}`),
      fetch(`/api/games?${params}`),
    ]);
    const statsData = await statsRes.json();
    const gamesData = await gamesRes.json();
    setStats(statsData);
    setAllGames(Array.isArray(gamesData) ? gamesData : []);
    setLoading(false);
  }, []);

  useEffect(() => { if (team) loadStats(team, filter); }, [team]);

  function handleFilter(f: FilterValues) {
    setFilter(f);
    loadStats(team, f);
  }

  function togglePanel(panel: ActivePanel) {
    setActivePanel((cur) => cur === panel ? null : panel);
  }

  // Spiele gegen einen bestimmten Gegner
  function gamesVsOpponent(opponent: string) {
    return allGames.filter(
      (g) => g.home_base === opponent || g.away_base === opponent
    ).sort((a, b) => b.jahr - a.jahr);
  }

  // Universe-Point-Spiele
  const upGames = allGames
    .filter((g) => Math.abs(g.home_score - g.away_score) === 1)
    .sort((a, b) => b.jahr - a.jahr);

  function gameLabel(g: Game) {
    const isHome = g.home_base === team;
    const my = isHome ? g.home_score : g.away_score;
    const op = isHome ? g.away_score : g.home_score;
    const opp = isHome ? g.away_base : g.home_base;
    return `${my}:${op} vs. ${opp} (${g.jahr})`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team-Statistiken</h1>
        <p className="text-gray-500 mt-1">Detaillierte Auswertung für einen Verein</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-1">Verein</label>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
        >
          <option value="">— Team wählen —</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {team && (
        <FilterBar
          jahre={jahre}
          selectedJahre={filter.jahre}
          divisionen={["Masters Mixed", "Masters Open", "Masters Frauen", "Mixed", "Frauen", "Open", "Jugend"]}
          selectedDiv={filter.division}
          belaege={["Outdoor", "Indoor", "Beach"]}
          selectedBelag={filter.belag}
          onChange={handleFilter}
        />
      )}

      {loading && <div className="text-center py-16 text-gray-400">Lade Statistiken…</div>}

      {stats && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 1. Gesamtbilanz */}
          <StatCard title="1 · Gesamtbilanz">
            <div className="flex justify-around text-center">
              {[
                { v: stats.total,         l: "Spiele",      c: "text-gray-900" },
                { v: stats.wins,          l: "Siege",        c: "text-green-600" },
                { v: stats.losses,        l: "Niederlagen",  c: "text-red-500"  },
                { v: `${stats.winRate}%`, l: "Quote",        c: "text-[#006B5E]" },
              ].map((s) => (
                <div key={s.l}>
                  <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </StatCard>

          {/* 2. Punkte */}
          <StatCard title="2 · Punkte">
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-[#006B5E]">{stats.scored}</div>
                <div className="text-xs text-gray-400 mt-0.5">Erzielt</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-500">{stats.conceded}</div>
                <div className="text-xs text-gray-400 mt-0.5">Kassiert</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${stats.avgDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.avgDiff > 0 ? "+" : ""}{stats.avgDiff}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Ø Differenz</div>
              </div>
            </div>
          </StatCard>

          {/* 3. Häufigster Gegner – klickbar */}
          <StatCard
            title="3 · Häufigster Gegner"
            clickable={!!stats.mostFrequent}
            onClick={() => togglePanel("mostFrequent")}
            active={activePanel === "mostFrequent"}
          >
            {stats.mostFrequent ? (
              <>
                <div className="text-lg font-bold text-gray-900">{stats.mostFrequent.name}</div>
                <div className="text-sm text-gray-500">{stats.mostFrequent.games} Spiele</div>
                {activePanel === "mostFrequent" && (
                  <GameList games={gamesVsOpponent(stats.mostFrequent.name)} team={team} />
                )}
              </>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 4. Angstgegner – klickbar */}
          <StatCard
            title="4 · Angstgegner (min. 2 Spiele)"
            clickable={!!stats.worstAgainst}
            onClick={() => togglePanel("worstAgainst")}
            active={activePanel === "worstAgainst"}
          >
            {stats.worstAgainst ? (
              <>
                <div className="text-lg font-bold text-red-500">{stats.worstAgainst.name}</div>
                <div className="text-sm text-gray-500">
                  {stats.worstAgainst.wins}S / {stats.worstAgainst.losses}N aus {stats.worstAgainst.games} Spielen
                </div>
                {activePanel === "worstAgainst" && (
                  <GameList games={gamesVsOpponent(stats.worstAgainst.name)} team={team} />
                )}
              </>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 5. Lieblingsgegner – klickbar */}
          <StatCard
            title="5 · Lieblingsgegner (min. 2 Spiele)"
            clickable={!!stats.bestAgainst}
            onClick={() => togglePanel("bestAgainst")}
            active={activePanel === "bestAgainst"}
          >
            {stats.bestAgainst ? (
              <>
                <div className="text-lg font-bold text-green-600">{stats.bestAgainst.name}</div>
                <div className="text-sm text-gray-500">
                  {stats.bestAgainst.wins}S / {stats.bestAgainst.losses}N aus {stats.bestAgainst.games} Spielen
                </div>
                {activePanel === "bestAgainst" && (
                  <GameList games={gamesVsOpponent(stats.bestAgainst.name)} team={team} />
                )}
              </>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 6. Höchster Sieg */}
          <StatCard title="6 · Höchster Sieg">
            {stats.biggestWin ? (
              <div>
                <div className="text-lg font-bold text-green-600">{gameLabel(stats.biggestWin)}</div>
                <div className="text-xs text-gray-400">{stats.biggestWin.division}</div>
              </div>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 7. Höchste Niederlage */}
          <StatCard title="7 · Höchste Niederlage">
            {stats.biggestLoss ? (
              <div>
                <div className="text-lg font-bold text-red-500">{gameLabel(stats.biggestLoss)}</div>
                <div className="text-xs text-gray-400">{stats.biggestLoss.division}</div>
              </div>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 8. Nach Division */}
          <StatCard title="8 · Bilanz nach Division">
            <div className="space-y-1">
              {Object.entries(stats.byDivision).map(([div, { wins, losses }]) => (
                <WinLossRow key={div} label={div} wins={wins} losses={losses} />
              ))}
              {Object.keys(stats.byDivision).length === 0 && (
                <p className="text-gray-400 text-sm">Keine Daten</p>
              )}
            </div>
          </StatCard>

          {/* 9. Nach Belag */}
          <StatCard title="9 · Bilanz nach Belag">
            <div className="space-y-1">
              {Object.entries(stats.byBelag).map(([b, { wins, losses }]) => (
                <WinLossRow key={b} label={b} wins={wins} losses={losses} />
              ))}
              {Object.keys(stats.byBelag).length === 0 && (
                <p className="text-gray-400 text-sm">Keine Daten</p>
              )}
            </div>
          </StatCard>

          {/* 10. Spiele pro Jahr */}
          <StatCard title="10 · Spiele pro Jahr">
            {stats.byYear.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={stats.byYear} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.byYear.map((_, i) => <Cell key={i} fill="#006B5E" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
          </StatCard>

          {/* 11. Universe Points – klickbar */}
          <StatCard
            title="11 · Universe Points (1-Punkt-Spiele)"
            clickable={stats.universePoints.total > 0}
            onClick={() => togglePanel("universePoints")}
            active={activePanel === "universePoints"}
          >
            <div className="flex justify-around text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.universePoints.wins}</div>
                <div className="text-xs text-gray-400 mt-0.5">Gewonnen</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{stats.universePoints.losses}</div>
                <div className="text-xs text-gray-400 mt-0.5">Verloren</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#006B5E]">{stats.universePoints.winRate}%</div>
                <div className="text-xs text-gray-400 mt-0.5">UP-Quote</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              {stats.universePoints.total} Universe-Point-Spiele insgesamt
            </p>
            {activePanel === "universePoints" && (
              <GameList
                games={upGames}
                team={team}
                emptyText="Keine Universe-Point-Spiele."
              />
            )}
          </StatCard>

        </div>
      )}

      {!team && (
        <div className="text-center py-16 text-gray-300 text-lg">
          Wähle einen Verein, um Statistiken zu sehen.
        </div>
      )}
    </div>
  );
}
