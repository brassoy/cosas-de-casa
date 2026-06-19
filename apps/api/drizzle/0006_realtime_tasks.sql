-- Añade tasks a la publicación supabase_realtime.
-- Permite que el frontend (apps/web/src/features/tasks) reciba INSERT/UPDATE/DELETE
-- en tiempo real cuando otro miembro de la familia crea una tarea, cambia su estado
-- o la reasigna (la reasignación bumpea tasks.updated_at → emite UPDATE sobre tasks).
-- Idempotente: solo añade la tabla si aún no está publicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  END IF;
END $$;
