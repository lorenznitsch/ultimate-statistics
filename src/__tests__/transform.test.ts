import {
  normalizeTeam,
  deriveDivisionNeu,
  deriveBelag,
  transformRows,
  isAbgesagt,
  NEVER_STRIP,
} from "../lib/transform";
import type { CsvRow } from "../lib/types";

// Hilfs-Alias-Map für Tests
const ALIAS_MAP = new Map<string, string>([
  ["Bonobos Bonobabes",       "Bonobos"],
  ["Bonobos Bonobros",        "Bonobos"],
  ["Frizzly Bears Bären",     "Frizzly Bears"],
  ["Frizzly Bears Frizzlies", "Frizzly Bears"],
  ["Caracals Caramba",        "Caracals"],
  ["Endzonis Lee",            "Endzonis"],
  ["Endzonis Luv",            "Endzonis"],
  ["Lions LUFC Junior",       "Lions LUFC"],
  ["Lions LUFC Senior",       "Lions LUFC"],
  ["Sturm und Drang I",       "Sturm und Drang"],
  ["Pizza Volante Mixed",     "Pizza Volante"],
]);

const EMPTY_MAP = new Map<string, string>();

// -------------------------------------------------------
// normalizeTeam
// -------------------------------------------------------
describe("normalizeTeam", () => {
  describe("Alias-Vorrang", () => {
    test("Alias wird aufgelöst", () => {
      expect(normalizeTeam("Bonobos Bonobabes", ALIAS_MAP)).toBe("Bonobos");
      expect(normalizeTeam("Frizzly Bears Bären", ALIAS_MAP)).toBe("Frizzly Bears");
      expect(normalizeTeam("Endzonis Lee", ALIAS_MAP)).toBe("Endzonis");
      expect(normalizeTeam("Pizza Volante Mixed", ALIAS_MAP)).toBe("Pizza Volante");
    });

    test("Alias hat Vorrang vor Nummern-Strippping", () => {
      // "Sturm und Drang I" – das "I" könnte als Nummernstripping durchgehen,
      // aber der Alias soll trotzdem greifen.
      expect(normalizeTeam("Sturm und Drang I", ALIAS_MAP)).toBe("Sturm und Drang");
    });
  });

  describe("Arabische Teamnummern (ohne Alias)", () => {
    test("entfernt nachgestellte Zahl 2–9", () => {
      expect(normalizeTeam("Moskitos 2", EMPTY_MAP)).toBe("Moskitos");
      expect(normalizeTeam("MUC II",     EMPTY_MAP)).toBe("MUC");
      expect(normalizeTeam("Funatics 3", EMPTY_MAP)).toBe("Funatics");
      expect(normalizeTeam("Team 9",     EMPTY_MAP)).toBe("Team");
    });

    test("lässt Zahl 1 unberührt (kein Stripping)", () => {
      expect(normalizeTeam("Berlin 1", EMPTY_MAP)).toBe("Berlin 1");
    });
  });

  describe("Römische Teamnummern (ohne Alias)", () => {
    test("entfernt II, III, IV", () => {
      expect(normalizeTeam("Leipzig Open II",  EMPTY_MAP)).toBe("Leipzig Open");
      expect(normalizeTeam("Leipzig Open III", EMPTY_MAP)).toBe("Leipzig Open");
      expect(normalizeTeam("Team IV",          EMPTY_MAP)).toBe("Team");
    });

    test("lässt I unberührt (kein Stripping)", () => {
      // Einzelnes 'I' wird NICHT als Nummer erkannt (Regex matched nur II/III/IV)
      expect(normalizeTeam("Berlin I", EMPTY_MAP)).toBe("Berlin I");
    });
  });

  describe("Sonderfall NEVER_STRIP", () => {
    test("Göttinger 7 bleibt unverändert", () => {
      expect(normalizeTeam("Göttinger 7", EMPTY_MAP)).toBe("Göttinger 7");
    });

    test("NEVER_STRIP-Konstante enthält Göttinger 7", () => {
      expect(NEVER_STRIP).toContain("Göttinger 7");
    });
  });

  describe("Keine Punkt-Normalisierung", () => {
    test("MUC und M.U.C. bleiben getrennt", () => {
      expect(normalizeTeam("MUC",   EMPTY_MAP)).toBe("MUC");
      expect(normalizeTeam("M.U.C.", EMPTY_MAP)).toBe("M.U.C.");
    });
  });

  describe("Name ohne Treffer bleibt unverändert", () => {
    test("normaler Name ohne Nummer", () => {
      expect(normalizeTeam("Hucks Ultimate Club Berlin", EMPTY_MAP)).toBe(
        "Hucks Ultimate Club Berlin"
      );
    });
  });
});

// -------------------------------------------------------
// deriveDivisionNeu
// -------------------------------------------------------
describe("deriveDivisionNeu", () => {
  describe("Masters-Kategorien (müssen VOR einfachen Kategorien geprüft werden)", () => {
    test("Masters Mixed", () => {
      expect(deriveDivisionNeu("Masters Mixed 1. Liga")).toBe("Masters Mixed");
      expect(deriveDivisionNeu("MASTERS MIXED")).toBe("Masters Mixed");
    });

    test("Masters Open", () => {
      expect(deriveDivisionNeu("Masters Open Liga")).toBe("Masters Open");
      expect(deriveDivisionNeu("masters open")).toBe("Masters Open");
    });

    test("Masters Frauen", () => {
      expect(deriveDivisionNeu("Masters Frauen Liga")).toBe("Masters Frauen");
    });

    test("'Masters Mixed' wird NICHT als einfaches 'Mixed' erkannt", () => {
      expect(deriveDivisionNeu("Masters Mixed")).toBe("Masters Mixed");
      expect(deriveDivisionNeu("Masters Mixed")).not.toBe("Mixed");
    });

    test("'Masters Open' wird NICHT als einfaches 'Open' erkannt", () => {
      expect(deriveDivisionNeu("Masters Open")).toBe("Masters Open");
      expect(deriveDivisionNeu("Masters Open")).not.toBe("Open");
    });
  });

  test("Frauen", () => {
    expect(deriveDivisionNeu("Frauen 1. Liga")).toBe("Frauen");
    expect(deriveDivisionNeu("FRAUEN 2. Liga")).toBe("Frauen");
  });

  test("Mixed", () => {
    expect(deriveDivisionNeu("Beach 1. Liga Mixed")).toBe("Mixed");
    expect(deriveDivisionNeu("MIXED Open")).toBe("Mixed");
  });

  test("Open", () => {
    expect(deriveDivisionNeu("Open 1. Liga")).toBe("Open");
  });

  test("Jugend-Schlüsselwörter", () => {
    expect(deriveDivisionNeu("Jugend Liga")).toBe("Jugend");
    expect(deriveDivisionNeu("DJUM 2024")).toBe("Jugend");
    expect(deriveDivisionNeu("U14 Liga")).toBe("Jugend");
    expect(deriveDivisionNeu("U17 Liga")).toBe("Jugend");
    expect(deriveDivisionNeu("U20 Liga")).toBe("Jugend");
  });

  test("Frauen hat Priorität vor Mixed (ohne Masters)", () => {
    expect(deriveDivisionNeu("Frauen Mixed Friendly")).toBe("Frauen");
  });

  test("kein Treffer -> null", () => {
    expect(deriveDivisionNeu("Unbekannte Liga")).toBeNull();
  });
});

// -------------------------------------------------------
// deriveBelag
// -------------------------------------------------------
describe("deriveBelag", () => {
  test("Outdoor-Saison ohne Beach -> Outdoor", () => {
    expect(deriveBelag("Open 1. Liga", "Outdoor")).toBe("Outdoor");
  });

  test("Outdoor-Saison mit Beach -> Beach", () => {
    expect(deriveBelag("Beach 1. Liga Mixed", "Outdoor")).toBe("Beach");
    expect(deriveBelag("BEACH Liga", "Outdoor")).toBe("Beach");
  });

  test("Indoor-Saison -> Indoor (unabhängig von Division)", () => {
    expect(deriveBelag("Beach Liga", "Indoor")).toBe("Indoor");
    expect(deriveBelag("Open Liga", "Indoor")).toBe("Indoor");
  });
});

// -------------------------------------------------------
// isAbgesagt
// -------------------------------------------------------
describe("isAbgesagt", () => {
  const makeRow = (home: string, away: string): CsvRow => ({
    Home: home, Away: away, HomeScores: "0", AwayScores: "0",
    Division: "", Pool: "",
  });

  test("erkennt 'abgesagt' im Home-Feld", () => {
    expect(isAbgesagt(makeRow("Abgesagt", "Berlin"))).toBe(true);
  });

  test("erkennt 'abgesagt' im Away-Feld", () => {
    expect(isAbgesagt(makeRow("Berlin", "ABGESAGT"))).toBe(true);
  });

  test("normales Spiel ist nicht abgesagt", () => {
    expect(isAbgesagt(makeRow("Hucks", "Moskitos"))).toBe(false);
  });
});

// -------------------------------------------------------
// transformRows (Integration)
// -------------------------------------------------------
describe("transformRows", () => {
  const rows: CsvRow[] = [
    { Home: "Moskitos 2",         Away: "Bonobos Bonobabes", HomeScores: "15", AwayScores: "10", Division: "Open 1. Liga",         Pool: "A" },
    { Home: "Göttinger 7",        Away: "Leipzig Open II",   HomeScores: "8",  AwayScores: "9",  Division: "Mixed Bezirksliga",    Pool: "B" },
    { Home: "Hucks Ultimate Club Berlin", Away: "Abgesagt",  HomeScores: "0",  AwayScores: "0",  Division: "Open",                  Pool: "" },
    { Home: "Frizzly Bears Bären",Away: "MUC II",            HomeScores: "11", AwayScores: "7",  Division: "Frauen Bundesliga",    Pool: "C" },
  ];

  const result = transformRows(rows, 2024, "Outdoor", ALIAS_MAP);

  test("filtert abgesagte Spiele heraus", () => {
    expect(result).toHaveLength(3);
    expect(result.every((r) => !r.home.toLowerCase().includes("abgesagt"))).toBe(true);
  });

  test("normalisiert Teamnamen korrekt", () => {
    expect(result[0].home_base).toBe("Moskitos");          // Nummern-Stripping
    expect(result[0].away_base).toBe("Bonobos");           // Alias
    expect(result[1].home_base).toBe("Göttinger 7");       // NEVER_STRIP
    expect(result[1].away_base).toBe("Leipzig Open");      // Römische Nummer
    expect(result[2].home_base).toBe("Frizzly Bears");     // Alias
    expect(result[2].away_base).toBe("MUC");               // Römische Nummer
  });

  test("setzt jahr und saison aus Parametern", () => {
    expect(result[0].jahr).toBe(2024);
    expect(result[0].saison).toBe("Outdoor");
  });

  test("leitet division_neu korrekt ab", () => {
    expect(result[0].division_neu).toBe("Open");
    expect(result[1].division_neu).toBe("Mixed");
    expect(result[2].division_neu).toBe("Frauen");
  });

  test("leitet belag korrekt ab", () => {
    expect(result[0].belag).toBe("Outdoor");
    expect(result[1].belag).toBe("Outdoor");
  });

  test("originale Namen bleiben erhalten", () => {
    expect(result[0].home).toBe("Moskitos 2");
    expect(result[0].away).toBe("Bonobos Bonobabes");
  });
});
