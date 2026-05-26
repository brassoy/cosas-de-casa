-- Añade shopping_items y shopping_lists a la publicación supabase_realtime
-- Idempotente: solo añade las tablas si aún no están publicadas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shopping_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shopping_lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_lists;
  END IF;
END $$;