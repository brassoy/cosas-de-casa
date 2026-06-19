-- Storage para la feature `tasks`: bucket público `task-photos` + políticas RLS.
--
-- El bucket también se declara en supabase/config.toml ([storage.buckets.task-photos])
-- para que `supabase start` lo cree en entornos nuevos; este insert idempotente
-- cubre `supabase db reset` y entornos donde el bucket aún no exista.
--
-- La app sube las fotos con el JWT del usuario (rol `authenticated`, respetando
-- RLS), nunca con service_role, así que hacen falta políticas explícitas sobre
-- storage.objects para ese rol.

insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "task_photos_auth_insert" on storage.objects;
drop policy if exists "task_photos_auth_select" on storage.objects;
drop policy if exists "task_photos_auth_update" on storage.objects;
drop policy if exists "task_photos_auth_delete" on storage.objects;

create policy "task_photos_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-photos');

create policy "task_photos_auth_select" on storage.objects
  for select to authenticated using (bucket_id = 'task-photos');

create policy "task_photos_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'task-photos');

create policy "task_photos_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-photos');
