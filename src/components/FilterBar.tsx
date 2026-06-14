"use client";

export interface FilterValues {
  jahre: number[];
  division: string;
  belag: string;
  teamNr: number | null; // null = alle
}

interface FilterBarProps {
  jahre: number[];
  selectedJahre: number[];
  divisionen: string[];
  selectedDiv: string;
  belaege: string[];
  selectedBelag: string;
  teamNrs: number[];         // verfügbare Teamnummern, z.B. [1, 2, 3]
  selectedTeamNr: number | null;
  onChange: (values: FilterValues) => void;
}

export default function FilterBar({
  jahre,
  selectedJahre,
  divisionen,
  selectedDiv,
  belaege,
  selectedBelag,
  teamNrs,
  selectedTeamNr,
  onChange,
}: FilterBarProps) {
  function emit(partial: Partial<FilterValues>) {
    onChange({
      jahre:    selectedJahre,
      division: selectedDiv,
      belag:    selectedBelag,
      teamNr:   selectedTeamNr,
      ...partial,
    });
  }

  function toggleJahr(jahr: number) {
    const next = selectedJahre.includes(jahr)
      ? selectedJahre.filter((j) => j !== jahr)
      : [...selectedJahre, jahr];
    emit({ jahre: next });
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-start">

      {/* Jahr */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Jahr</p>
        <div className="flex flex-wrap gap-1">
          {jahre.map((j) => (
            <button
              key={j}
              onClick={() => toggleJahr(j)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                selectedJahre.includes(j)
                  ? "bg-[#006B5E] text-white border-[#006B5E]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#006B5E] hover:text-[#006B5E]"
              }`}
            >
              {j}
            </button>
          ))}
          {selectedJahre.length > 0 && (
            <button
              onClick={() => emit({ jahre: [] })}
              className="px-3 py-1 rounded-full text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Division */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Division</p>
        <select
          value={selectedDiv}
          onChange={(e) => emit({ division: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#006B5E]/40 focus:border-[#006B5E]"
        >
          <option value="">Alle</option>
          {divisionen.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Belag */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Belag</p>
        <div className="flex gap-1 flex-wrap">
          {(["", ...belaege] as string[]).map((b) => (
            <button
              key={b || "alle-belag"}
              onClick={() => emit({ belag: b })}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                selectedBelag === b
                  ? "bg-[#006B5E] text-white border-[#006B5E]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#006B5E] hover:text-[#006B5E]"
              }`}
            >
              {b || "Alle"}
            </button>
          ))}
        </div>
      </div>

      {/* Team-Nummer */}
      {teamNrs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Team</p>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => emit({ teamNr: null })}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                selectedTeamNr === null
                  ? "bg-[#006B5E] text-white border-[#006B5E]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#006B5E] hover:text-[#006B5E]"
              }`}
            >
              Alle
            </button>
            {teamNrs.map((nr) => (
              <button
                key={nr}
                onClick={() => emit({ teamNr: nr })}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedTeamNr === nr
                    ? "bg-[#006B5E] text-white border-[#006B5E]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#006B5E] hover:text-[#006B5E]"
                }`}
              >
                Team {nr}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
