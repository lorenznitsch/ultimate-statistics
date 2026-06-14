"use client";

/**
 * FilterBar – Wiederverwendbare Filterleiste.
 * Props:
 *   jahre          – alle verfügbaren Jahre aus der DB
 *   selectedJahre  – aktuell ausgewählte Jahre (Mehrfachauswahl)
 *   divisionen     – verfügbare division_neu-Werte
 *   selectedDiv    – ausgewählte Division (leer = alle)
 *   belaege        – verfügbare Beläge
 *   selectedBelag  – ausgewählter Belag (leer = alle)
 *   onChange       – Callback, wenn sich Filter ändert
 */

export interface FilterValues {
  jahre: number[];
  division: string;
  belag: string;
}

interface FilterBarProps {
  jahre: number[];
  selectedJahre: number[];
  divisionen: string[];
  selectedDiv: string;
  belaege: string[];
  selectedBelag: string;
  onChange: (values: FilterValues) => void;
}

export default function FilterBar({
  jahre,
  selectedJahre,
  divisionen,
  selectedDiv,
  belaege,
  selectedBelag,
  onChange,
}: FilterBarProps) {
  function toggleJahr(jahr: number) {
    const next = selectedJahre.includes(jahr)
      ? selectedJahre.filter((j) => j !== jahr)
      : [...selectedJahre, jahr];
    onChange({ jahre: next, division: selectedDiv, belag: selectedBelag });
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-start">
      {/* Jahr-Mehrfachauswahl */}
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
              onClick={() => onChange({ jahre: [], division: selectedDiv, belag: selectedBelag })}
              className="px-3 py-1 rounded-full text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              ✕ alle
            </button>
          )}
        </div>
      </div>

      {/* Division */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Division</p>
        <select
          value={selectedDiv}
          onChange={(e) => onChange({ jahre: selectedJahre, division: e.target.value, belag: selectedBelag })}
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
        <div className="flex gap-1">
          {["", ...belaege].map((b) => (
            <button
              key={b || "alle"}
              onClick={() => onChange({ jahre: selectedJahre, division: selectedDiv, belag: b })}
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
    </div>
  );
}
