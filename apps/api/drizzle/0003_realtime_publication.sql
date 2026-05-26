-- Fase 1E: Habilitar Supabase Realtime para shopping_items y shopping_lists.
--
-- La publicación `supabase_realtime` existe en todos los proyectos Supabase.
-- ALTER PUBLICATION … ADD TABLE es IDEMPOTENTE (desde PG 15 la operación no falla
-- si la tabla ya estaba en la publicación; antes de PG 15 puede emitir un aviso
-- inofensivo, pero no aborta el script). Ejecutar dos veces es seguro.

-- statement-breakpoint
DO $$
BEGIN
  -- shopping_items
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'shopping_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
  END IF;

  -- shopping_lists (opcional: sincroniza el nombre de la lista en tiempo real)
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'shopping_lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shopping_lists;
  END IF;
END;
$$;
