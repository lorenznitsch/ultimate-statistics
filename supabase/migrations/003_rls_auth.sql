-- ============================================================
-- Migration 003 – RLS: schreibende Operationen nur für
-- eingeloggte Nutzer (Supabase Auth). SELECT bleibt öffentlich.
-- Idempotent: bestehende Policies werden vorher gelöscht.
-- ============================================================

-- ---- games ----
DROP POLICY IF EXISTS "games_insert_authed"  ON public.games;
DROP POLICY IF EXISTS "games_update_authed"  ON public.games;
DROP POLICY IF EXISTS "games_delete_authed"  ON public.games;

CREATE POLICY "games_insert_authed" ON public.games FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "games_update_authed" ON public.games FOR UPDATE
  USING     (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "games_delete_authed" ON public.games FOR DELETE
  USING     (auth.role() IN ('authenticated', 'service_role'));

-- ---- team_aliases ----
DROP POLICY IF EXISTS "aliases_insert_authed" ON public.team_aliases;
DROP POLICY IF EXISTS "aliases_update_authed" ON public.team_aliases;
DROP POLICY IF EXISTS "aliases_delete_authed" ON public.team_aliases;

CREATE POLICY "aliases_insert_authed" ON public.team_aliases FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "aliases_update_authed" ON public.team_aliases FOR UPDATE
  USING     (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "aliases_delete_authed" ON public.team_aliases FOR DELETE
  USING     (auth.role() IN ('authenticated', 'service_role'));
