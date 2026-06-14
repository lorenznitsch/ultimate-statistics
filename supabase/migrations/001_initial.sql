-- ============================================================
-- Hucks H2H – Initiale Migration
-- Legt games + team_aliases an, setzt RLS-Policies und Indizes,
-- und befüllt team_aliases mit den bekannten Alias-Einträgen.
-- ============================================================

-- -------------------------------------------------------
-- Tabelle: games
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home        text        NOT NULL,
  away        text        NOT NULL,
  home_base   text        NOT NULL,
  away_base   text        NOT NULL,
  home_score  integer     NOT NULL,
  away_score  integer     NOT NULL,
  division    text,
  pool        text,
  jahr        integer     NOT NULL,
  saison      text        NOT NULL,   -- 'Outdoor' | 'Indoor'
  division_neu text,                  -- 'Frauen' | 'Open' | 'Mixed' | 'Jugend'
  belag       text,                   -- 'Outdoor' | 'Indoor' | 'Beach'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS games_home_base_idx    ON public.games (home_base);
CREATE INDEX IF NOT EXISTS games_away_base_idx    ON public.games (away_base);
CREATE INDEX IF NOT EXISTS games_jahr_idx         ON public.games (jahr);
CREATE INDEX IF NOT EXISTS games_division_neu_idx ON public.games (division_neu);
CREATE INDEX IF NOT EXISTS games_belag_idx        ON public.games (belag);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games_select_public"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "games_insert_authed"
  ON public.games FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "games_delete_authed"
  ON public.games FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "games_update_authed"
  ON public.games FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- -------------------------------------------------------
-- Tabelle: team_aliases
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_aliases (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original    text        NOT NULL UNIQUE,
  basisname   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_aliases_original_idx ON public.team_aliases (original);

ALTER TABLE public.team_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aliases_select_public"
  ON public.team_aliases FOR SELECT
  USING (true);

CREATE POLICY "aliases_insert_authed"
  ON public.team_aliases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "aliases_update_authed"
  ON public.team_aliases FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "aliases_delete_authed"
  ON public.team_aliases FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- -------------------------------------------------------
-- Vorbefüllung: bekannte Team-Aliase
-- -------------------------------------------------------
INSERT INTO public.team_aliases (original, basisname) VALUES
  ('Bonobos Bonobabes',    'Bonobos'),
  ('Bonobos Bonobros',     'Bonobos'),
  ('Frizzly Bears Bären',  'Frizzly Bears'),
  ('Frizzly Bears Frizzlies', 'Frizzly Bears'),
  ('Caracals Caramba',     'Caracals'),
  ('Endzonis Lee',         'Endzonis'),
  ('Endzonis Luv',         'Endzonis'),
  ('Lions LUFC Junior',    'Lions LUFC'),
  ('Lions LUFC Senior',    'Lions LUFC'),
  ('Sturm und Drang I',    'Sturm und Drang'),
  ('Pizza Volante Mixed',  'Pizza Volante')
ON CONFLICT (original) DO NOTHING;
