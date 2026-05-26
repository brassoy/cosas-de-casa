-- Añade plan_messages a la publicación supabase_realtime
-- Idempotente: solo añade la tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'plan_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE plan_messages;
  END IF;
END $$;