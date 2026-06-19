-- Añade fridge_items a la publicación supabase_realtime.
-- Permite que el frontend (apps/web/src/features/fridge) reciba INSERT/UPDATE/DELETE
-- en tiempo real cuando otro miembro de la familia consume, añade o tira un producto.
-- Idempotente: solo añade la tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'fridge_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fridge_items;
  END IF;
END $$;
