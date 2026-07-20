-- Añade memberships a la publicación supabase_realtime.
-- Permite que el frontend (apps/web/src/features/family) reciba INSERT/UPDATE/DELETE
-- en tiempo real cuando alguien se une con un PIN, cambia de rol o sale, para que la
-- pantalla "Gestionar familia" del resto de miembros (en especial el OWNER) no se
-- quede con una lista obsoleta.
-- Idempotente: solo añade la tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'memberships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
  END IF;
END $$;
