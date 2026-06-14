# Hucks H2H

Head-to-Head-Vergleiche deutscher Ultimate-Frisbee-Vereine.
Next.js 15 · TypeScript · Tailwind CSS 4 · Supabase (Postgres) · Vercel

---

## Schritt-für-Schritt: Lokaler Start

### 1. Supabase-Projekt anlegen

1. Gehe auf [supabase.com](https://supabase.com) → „New project"
2. Name: z.B. `hucks-h2h`, Region wählen (z.B. Frankfurt)
3. Im Dashboard: **Project Settings → API**
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Migration ausführen

Im Supabase-Dashboard: **SQL Editor** → neues Query-Fenster öffnen →
Inhalt von `supabase/migrations/001_initial.sql` einfügen → **Run**

Das legt beide Tabellen (`games`, `team_aliases`) an, setzt RLS und
befüllt die bekannten Aliase vor.

Alternativ mit der Supabase-CLI:
```bash
npx supabase link --project-ref <dein-project-ref>
npx supabase db push
```

### 3. Umgebungsvariablen befüllen

```bash
cp .env.local.example .env.local
# Dann .env.local mit den drei Keys aus Schritt 1 befüllen
```

### 4. Dependencies installieren & lokal starten

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 5. Erste CSV importieren

1. Öffne [http://localhost:3000/import](http://localhost:3000/import)
2. Jahr: `2024`, Saison: `Outdoor`
3. CSV-Datei mit den Spalten `Home, Away, HomeScores, AwayScores, Division, Pool` hochladen
4. Vorschau prüfen → „Jetzt importieren"

### 6. Aliase prüfen / ergänzen

Öffne [http://localhost:3000/aliases](http://localhost:3000/aliases)
Die 11 Standard-Aliase sind bereits durch die Migration befüllt.
Neue Aliase für unbekannte Teamnamen eintragen.

### 7. Nach Vercel deployen

```bash
# Vercel CLI (optional):
npm i -g vercel
vercel

# Oder: Vercel-Dashboard → "Import Git Repository"
# dann Environment Variables setzen:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
```

---

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx          # Vereins-Übersicht (Hucks Ultimate Club Berlin)
│   ├── h2h/page.tsx      # Head-to-Head-Vergleich
│   ├── stats/page.tsx    # Team-Statistiken (11 KPIs + Diagramm)
│   ├── aliases/page.tsx  # Alias-Verwaltung
│   ├── import/page.tsx   # CSV-Import mit Vorschau
│   └── api/              # Route Handler (games, h2h, stats, aliases, import, reassign, teams)
├── components/
│   ├── NavBar.tsx        # Responsive Navigation
│   └── FilterBar.tsx     # Wiederverwendbare Filterleiste
└── lib/
    ├── transform.ts      # Transformations-Logik (testbar, alias-Map als Parameter)
    ├── types.ts          # Gemeinsame TypeScript-Typen
    └── supabase/
        ├── client.ts     # Browser-Client
        └── server.ts     # Server-Client + Service-Role-Client

supabase/migrations/001_initial.sql   # DB-Schema + Alias-Seeding
src/__tests__/transform.test.ts       # Unit-Tests für transform.ts
```

## Tests ausführen

```bash
npm test
```

Testet: `normalizeTeam`, `deriveDivisionNeu`, `deriveBelag`, `isAbgesagt`, `transformRows`
inkl. Alias-Vorrang, Göttinger-7-Sonderfall, Nummern-Stripping, abgesagte Spiele.

## CSV-Format

```
Home,Away,HomeScores,AwayScores,Division,Pool
Hucks Ultimate Club Berlin,Moskitos 2,15,10,Open 1. Liga,A
```

- Erste Zeile = Header (wird ignoriert bei der Verarbeitung)
- `Division` bestimmt `division_neu` und `belag` (s. transform.ts)
- Zeilen mit "abgesagt" in Home oder Away werden herausgefiltert
