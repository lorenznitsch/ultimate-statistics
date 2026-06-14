"use client";

import { useEffect, useState, useCallback } from "react";
import FilterBar, { type FilterValues } from "@/components/FilterBar";
import type { Game } from "@/lib/types";

const DIVISIONS = ["Masters Mixed", "Masters Open", "Masters Frauen", "Mixed", "Frauen", "Open", "Jugend"];
const EMPTY_FILTER: FilterValues = { jahre: [], division: "", belag: "", teamNr: null };

// -------------------------------------------------------
// Typen für die API-Antwort
// -------------------------------------------------------
interface DFVStats {
  totalGames: number;
  thresholds: { MIN_GAMES_ANGST: number; MIN_UP_GAMES: number; MIN_TOTAL_GAMES: number };
  mostFrequentPair:  { teamA: string; teamB: string; count: number } | null;
  biggestAngstgegner: { team: string; opponent: string; wins: number; losses: number; games: number } | null;
  bestUPTeam:   { team: string; upWins: number; upTotal: number; winRate: number } | null;
  worstUPTeam:  { team: string; upWins: number; upTotal: number; winRate: number } | null;
  dominantTeam: { team: string; wins: number; total: number; winRate: number } | null;
  krimiTeam:    { team: string; upCount: number; total: number; upRate: number } | null;
}

// Welche Kachel zeigt ihre Spielliste?
type ActivePanel =
  | "mostFrequentPair"
  | "biggestAngstgegner"
  | "bestUPTeam"
  | "worstUPTeam"
  | "dominantTeam"
  | "krimiTeam"
  | null;

// -------------------------------------------------------
// Badges & kleine Helfer
// -------------------------------------------------------
function BelagBadge({ belag }: { belag: string | null }) {
  const map: Record<string, string> = {
    Outdoor: "bg-green-100 text-green-700",
    Indoor:  "bg-blue-100 text-blue-700",
    Beach:   "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${map[belag ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
      {belag ?? "–"}
    </span>
  );
}

// Inline-Spielliste, die in Stat-Kacheln aufgeklappt wird.
// mode="pair":  zeigt teamA vs teamB neutral (für mostFrequentPair, biggestAngstgegner)
// mode="team":  zeigt vom Standpunkt eines Vereins (für UP-/dominantTeam/krimiTeam)
function InlineGameList({
  games,
  mode,
  teamA,
  teamB,
  team,
  filterUpOnly,
}: {
  games: Game[];
  mode: "pair" | "team";
  teamA?: string;
  teamB?: string;
  team?: string;
  filterUpOnly?: boolean;
}) {
  const filtered = filterUpOnly
    ? games.filter((g) => Math.abs(g.home_score - g.away_score) === 1)
    : games;

  if (filtered.length === 0) {
    return <p className="text-sm text-gray-400 py-2 mt-3">Keine Spiele gefunden.</p>;
  }

  return (
    <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
      {filtered.map((g) => {
        if (mode === "pair") {
          // Neutralansicht: zeige beide Teamnamen wie in H2H
          const isAHome = g.home_base === teamA;
          const sA = isAHome ? g.home_score : g.away_score;
          const sB = isAHome ? g.away_score : g.home_score;
          const aWon = sA > sB;
          const displayA = teamA ?? g.home_base;
          const displayB = teamB ?? g.away_base;
          return (
            <div key={g.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 text-xs">{displayA}</span>
                <span className="text-gray-400 mx-1 text-xs">vs.</span>
                <span className="font-medium text-gray-700 text-xs">{displayB}</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {g.division && (
                    <span className="inline-block px-1.5 py-0 rounded text-xs bg-gray-100 text-gray-500">{g.division}</span>
                  )}
                  <BelagBadge belag={g.belag} />
                  <span className="text-xs text-gray-400 self-center">{g.jahr}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 font-mono text-sm font-bold">
                <span className={aWon ? "text-green-600" : "text-red-500"}>{sA}</span>
                <span className="text-gray-400">:</span>
                <span className={!aWon ? "text-green-600" : "text-red-500"}>{sB}</span>
              </div>
            </div>
          );
        } else {
          // Team-Perspektive
          const isHome = g.home_base === team;
          const my     = isHome ? g.home_score : g.away_score;
          const op     = isHome ? g.away_score : g.home_score;
          const won    = my > op;
          const opp    = isHome ? g.away_base : g.home_base;
          return (
            <div key={g.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border ${won ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800 truncate block text-xs">{opp}</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {g.division && (
                    <span className="inline-block px-1.5 py-0 rounded text-xs bg-gray-100 text-gray-500">{g.division}</span>
                  )}
                  <BelagBadge belag={g.belag} />
                  <span className="text-xs text-gray-400 self-center">{g.jahr}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`font-bold text-sm font-mono ${won ? "text-green-600" : "text-red-500"}`}>
                  {my}:{op}
                </span>
                <span className={`ml-1 text-xs ${won ? "text-green-500" : "text-red-400"}`}>{won ? "S" : "N"}</span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
}

// Rahmen-Kachel mit Aufklapp-Mechanik
function StatCard({
  title,
  badge,
  children,
  clickable,
  onClick,
  active,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
        clickable ? "cursor-pointer hover:shadow-md hover:border-[#006B5E]/50 select-none" : ""
      } ${active ? "border-[#006B5E] ring-2 ring-[#006B5E]/20" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
          {badge && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
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

// -------------------------------------------------------
// Hilfsfunktion: Filter als URL-Params
// -------------------------------------------------------
function filterParams(f: FilterValues): URLSearchParams {
  const p = new URLSearchParams();
  f.jahre.forEach((j) => p.append("jahr", String(j)));
  if (f.division)      p.set("division", f.division);
  if (f.belag)         p.set("belag",    f.belag);
  if (f.teamNr !== null) p.set("teamNr", String(f.teamNr));
  return p;
}

// -------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------
export default function DFVStatsPage() {
  const [jahre,       setJahre]       = useState<number[]>([]);
  const [teamNrs,     setTeamNrs]     = useState<number[]>([]);
  const [filter,      setFilter]      = useState<FilterValues>(EMPTY_FILTER);
  const [stats,       setStats]       = useState<DFVStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [panelGames,  setPanelGames]  = useState<Game[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  // Beim ersten Laden: alle Spiele für Jahre + TeamNrs
  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((d: Game[]) => {
        if (!Array.isArray(d)) return;
        setJahre([...new Set(d.map((g) => g.jahr))].sort((a, b) => b - a));
        const nrs = new Set<number>();
        d.forEach((g) => { nrs.add(g.home_team_nr ?? 1); nrs.add(g.away_team_nr ?? 1); });
        setTeamNrs([...nrs].filter((n) => n > 1).sort());
      });
  }, []);

  const loadStats = useCallback(async (f: FilterValues) => {
    setLoading(true);
    setError("");
    setActivePanel(null);
    setPanelGames([]);
    const res = await fetch(`/api/dfv-stats?${filterParams(f)}`);
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Fehler beim Laden."); setStats(null); }
    else setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(EMPTY_FILTER); }, [loadStats]);

  function handleFilter(f: FilterValues) {
    setFilter(f);
    loadStats(f);
  }

  async function openPanel(panel: ActivePanel, fetchFn: () => Promise<Game[]>) {
    if (activePanel === panel) { setActivePanel(null); setPanelGames([]); return; }
    setActivePanel(panel);
    setPanelLoading(true);
    setPanelGames([]);
    const games = await fetchFn();
    setPanelGames(games);
    setPanelLoading(false);
  }

  async function fetchH2H(teamA: string, teamB: string): Promise<Game[]> {
    const p = filterParams(filter);
    p.set("teamA", teamA);
    p.set("teamB", teamB);
    const res = await fetch(`/api/h2h?${p}`);
    const d   = await res.json();
    return Array.isArray(d) ? d : [];
  }

  async function fetchTeamGames(team: string): Promise<Game[]> {
    const p = filterParams(filter);
    p.set("team", team);
    const res = await fetch(`/api/games?${p}`);
    const d   = await res.json();
    return Array.isArray(d) ? d : [];
  }

  const t = stats?.thresholds;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Statistiken DFV</h1>
        <p className="text-gray-500 mt-1">Auswertung über alle Vereine im Datensatz</p>
      </div>

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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="text-center py-16 text-gray-400">Lade Statistiken…</div>
      )}

      {stats && !loading && (
        <>
          <p className="text-sm text-gray-400">
            Datenbasis: <span className="font-semibold text-gray-700">{stats.totalGames} Spiele</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 1. Häufigste Begegnung */}
            <StatCard
              title="1 · Häufigste Begegnung"
              clickable={!!stats.mostFrequentPair}
              active={activePanel === "mostFrequentPair"}
              onClick={() => {
                if (!stats.mostFrequentPair) return;
                openPanel("mostFrequentPair", () =>
                  fetchH2H(stats.mostFrequentPair!.teamA, stats.mostFrequentPair!.teamB)
                );
              }}
            >
              {stats.mostFrequentPair ? (
                <>
                  <div className="font-bold text-gray-900 text-base leading-tight">
                    {stats.mostFrequentPair.teamA}
                  </div>
                  <div className="text-gray-400 text-xs my-0.5">vs.</div>
                  <div className="font-bold text-gray-900 text-base leading-tight">
                    {stats.mostFrequentPair.teamB}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.mostFrequentPair.count} Duelle
                  </div>
                  {activePanel === "mostFrequentPair" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="pair"
                          teamA={stats.mostFrequentPair.teamA}
                          teamB={stats.mostFrequentPair.teamB}
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten</p>}
            </StatCard>

            {/* 2. Größter Angstgegner */}
            <StatCard
              title="2 · Größter Angstgegner"
              badge={t ? `min. ${t.MIN_GAMES_ANGST} Duelle` : undefined}
              clickable={!!stats.biggestAngstgegner}
              active={activePanel === "biggestAngstgegner"}
              onClick={() => {
                if (!stats.biggestAngstgegner) return;
                openPanel("biggestAngstgegner", () =>
                  fetchH2H(stats.biggestAngstgegner!.team, stats.biggestAngstgegner!.opponent)
                );
              }}
            >
              {stats.biggestAngstgegner ? (
                <>
                  <div className="text-sm text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">{stats.biggestAngstgegner.team}</span>{" "}
                    fürchtet
                  </div>
                  <div className="font-bold text-red-500 text-lg leading-tight">
                    {stats.biggestAngstgegner.opponent}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.biggestAngstgegner.wins}S / {stats.biggestAngstgegner.losses}N
                    {" "}aus {stats.biggestAngstgegner.games} Spielen (
                    {Math.round((stats.biggestAngstgegner.losses / stats.biggestAngstgegner.games) * 100)}% Verlustquote)
                  </div>
                  {activePanel === "biggestAngstgegner" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="pair"
                          teamA={stats.biggestAngstgegner.team}
                          teamB={stats.biggestAngstgegner.opponent}
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten (min. {t?.MIN_GAMES_ANGST} Duelle nötig)</p>}
            </StatCard>

            {/* 3. Beste UP-Quote */}
            <StatCard
              title="3 · Beste Universe-Point-Quote"
              badge={t ? `min. ${t.MIN_UP_GAMES} UP-Spiele` : undefined}
              clickable={!!stats.bestUPTeam}
              active={activePanel === "bestUPTeam"}
              onClick={() => {
                if (!stats.bestUPTeam) return;
                openPanel("bestUPTeam", () => fetchTeamGames(stats.bestUPTeam!.team));
              }}
            >
              {stats.bestUPTeam ? (
                <>
                  <div className="font-bold text-green-600 text-lg">{stats.bestUPTeam.team}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.bestUPTeam.winRate}% UP-Siegquote
                    {" "}({stats.bestUPTeam.upWins}/{stats.bestUPTeam.upTotal} UP-Spiele gewonnen)
                  </div>
                  {activePanel === "bestUPTeam" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="team"
                          team={stats.bestUPTeam.team}
                          filterUpOnly
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten (min. {t?.MIN_UP_GAMES} UP-Spiele nötig)</p>}
            </StatCard>

            {/* 4. Schlechteste UP-Quote */}
            <StatCard
              title="4 · Schlechteste Universe-Point-Quote"
              badge={t ? `min. ${t.MIN_UP_GAMES} UP-Spiele` : undefined}
              clickable={!!stats.worstUPTeam}
              active={activePanel === "worstUPTeam"}
              onClick={() => {
                if (!stats.worstUPTeam) return;
                openPanel("worstUPTeam", () => fetchTeamGames(stats.worstUPTeam!.team));
              }}
            >
              {stats.worstUPTeam ? (
                <>
                  <div className="font-bold text-red-500 text-lg">{stats.worstUPTeam.team}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.worstUPTeam.winRate}% UP-Siegquote
                    {" "}({stats.worstUPTeam.upWins}/{stats.worstUPTeam.upTotal} UP-Spiele gewonnen)
                  </div>
                  {activePanel === "worstUPTeam" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="team"
                          team={stats.worstUPTeam.team}
                          filterUpOnly
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten (min. {t?.MIN_UP_GAMES} UP-Spiele nötig)</p>}
            </StatCard>

            {/* 5. Dominantester Verein */}
            <StatCard
              title="5 · Dominantester Verein"
              badge={t ? `min. ${t.MIN_TOTAL_GAMES} Spiele` : undefined}
              clickable={!!stats.dominantTeam}
              active={activePanel === "dominantTeam"}
              onClick={() => {
                if (!stats.dominantTeam) return;
                openPanel("dominantTeam", () => fetchTeamGames(stats.dominantTeam!.team));
              }}
            >
              {stats.dominantTeam ? (
                <>
                  <div className="font-bold text-[#006B5E] text-lg">{stats.dominantTeam.team}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.dominantTeam.winRate}% Siegquote
                    {" "}({stats.dominantTeam.wins}/{stats.dominantTeam.total} Spiele)
                  </div>
                  {activePanel === "dominantTeam" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="team"
                          team={stats.dominantTeam.team}
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten (min. {t?.MIN_TOTAL_GAMES} Spiele nötig)</p>}
            </StatCard>

            {/* 6. Krimi-Verein */}
            <StatCard
              title="6 · Krimi-Verein (höchster UP-Anteil)"
              badge={t ? `min. ${t.MIN_TOTAL_GAMES} Spiele` : undefined}
              clickable={!!stats.krimiTeam}
              active={activePanel === "krimiTeam"}
              onClick={() => {
                if (!stats.krimiTeam) return;
                openPanel("krimiTeam", () => fetchTeamGames(stats.krimiTeam!.team));
              }}
            >
              {stats.krimiTeam ? (
                <>
                  <div className="font-bold text-orange-500 text-lg">{stats.krimiTeam.team}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {stats.krimiTeam.upRate}% aller Spiele sind Universe Points
                    {" "}({stats.krimiTeam.upCount} von {stats.krimiTeam.total})
                  </div>
                  {activePanel === "krimiTeam" && (
                    panelLoading
                      ? <p className="text-sm text-gray-400 mt-3">Lade…</p>
                      : <InlineGameList
                          games={panelGames}
                          mode="team"
                          team={stats.krimiTeam.team}
                          filterUpOnly
                        />
                  )}
                </>
              ) : <p className="text-gray-400 text-sm">Keine Daten (min. {t?.MIN_TOTAL_GAMES} Spiele nötig)</p>}
            </StatCard>

          </div>
        </>
      )}
    </div>
  );
}
