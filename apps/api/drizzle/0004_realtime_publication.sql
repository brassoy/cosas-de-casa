-- Fase 1E: habilitar Supabase Realtime para shopping_items y shopping_lists.
-- ALTER PUBLICATION ... ADD TABLE es idempotente; ejecutar dos veces es seguro.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shopping_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shopping_lists') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_lists;
  END IF;
END;
$$;
