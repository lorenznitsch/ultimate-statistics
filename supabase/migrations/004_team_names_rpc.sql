-- RPC-Funktion: gibt alle distinct Vereins-Basisnamen zurück (home_base ∪ away_base).
-- Umgeht das PostgREST-Standardlimit von 1000 Zeilen, weil die Aggregation in der
-- DB stattfindet und nur die kompakte Ergebnisliste zurückgegeben wird.
CREATE OR REPLACE FUNCTION public.get_team_names()
RETURNS TABLE(name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT DISTINCT home_base AS name
    FROM games
   WHERE home_base IS NOT NULL
  UNION
  SELECT DISTINCT away_base
    FROM games
   WHERE away_base IS NOT NULL
  ORDER BY name;
$$;
