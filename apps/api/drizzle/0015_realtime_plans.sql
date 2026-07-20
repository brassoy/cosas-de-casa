-- Añade plan_participants, plans y plan_shares a la publicación supabase_realtime.
-- Permite que la pantalla de detalle de un plan (apps/web/src/features/plans) y el
-- listado reciban en tiempo real:
--   - plan_participants → "quién viene" (RSVP) se actualiza al apuntarse alguien.
--   - plans            → cambios de título/fecha/estado del plan.
--   - plan_shares      → un plan recién compartido aparece en los "planes" de la
--                        familia amiga sin recargar.
-- (plan_messages ya estaba publicado en 0003 para el chat.)
-- Idempotente: solo añade cada tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plan_participants;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plans;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_shares'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plan_shares;
  END IF;
END $$;
