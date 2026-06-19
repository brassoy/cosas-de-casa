-- Añade calendar_events a la publicación supabase_realtime.
-- Permite que el frontend (apps/web/src/features/calendar) reciba INSERT/UPDATE/DELETE
-- en tiempo real cuando otro miembro de la familia crea, edita o borra un evento.
-- Idempotente: solo añade la tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'calendar_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
  END IF;
END $$;
