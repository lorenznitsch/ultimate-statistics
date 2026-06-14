-- ============================================================
-- Migration 002 – Team-Nummern
-- Fügt home_team_nr / away_team_nr zur games-Tabelle hinzu.
-- Werte werden nachträglich per /aliases → "Neu zuordnen" befüllt.
-- ============================================================

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS home_team_nr integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS away_team_nr integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS games_home_team_nr_idx ON public.games (home_team_nr);
CREATE INDEX IF NOT EXISTS games_away_team_nr_idx ON public.games (away_team_nr);
