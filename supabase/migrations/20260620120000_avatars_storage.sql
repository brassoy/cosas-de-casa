-- Storage para los avatares de usuario (feature avatar): bucket público
-- `avatars` + políticas RLS.
--
-- El bucket también se declara en supabase/config.toml ([storage.buckets.avatars])
-- para que `supabase start` lo cree en entornos nuevos; este insert idempotente
-- cubre `supabase db reset` y entornos donde el bucket aún no exista.
--
-- La app sube la foto de perfil con el JWT del usuario (rol `authenticated`,
-- respetando RLS), nunca con service_role, así que hacen falta políticas
-- explícitas sobre storage.objects para ese rol. Mismo patrón que `task-photos`.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "avatars_auth_insert" on storage.objects;
drop policy if exists "avatars_auth_select" on storage.objects;
drop policy if exists "avatars_auth_update" on storage.objects;
drop policy if exists "avatars_auth_delete" on storage.objects;

create policy "avatars_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

create policy "avatars_auth_select" on storage.objects
  for select to authenticated using (bucket_id = 'avatars');

create policy "avatars_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

create policy "avatars_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
