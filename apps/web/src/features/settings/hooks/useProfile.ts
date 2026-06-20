/* ─── Hooks de datos — feature `settings` ───────────────────────────────────
 *
 * Toda la lógica de datos de la pantalla de ajustes vive aquí (el container la
 * cablea una sola vez y la pasa a la vista presentacional por props).
 *
 * Formas implicadas:
 *   GET   /api/v1/auth/me          → AuthMeDto              (perfil + familias)
 *   PATCH /api/v1/auth/me          → AuthMeDto              (body: UpdateProfileInput)
 *   supabase.auth.updateUser({ password })                 (cambio de contraseña)
 *   supabase.auth.updateUser({ email })                    (cambio de email)
 *
 * El nombre y el email se leen de `useProfile()`. El cambio de nombre invalida
 * la query de perfil para reflejar el nuevo `displayName` al instante. El cambio
 * de contraseña y el de email van 100% por Supabase (sesión autenticada). OJO:
 * cambiar el email NO surte efecto al instante: Supabase envía un correo de
 * verificación y el cambio solo se aplica cuando el usuario lo confirma; por eso
 * NO invalidamos el perfil aquí (el email visible sigue siendo el antiguo hasta
 * que se confirme).
 * ─────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthMeDto, UpdateProfileInput } from '@cosasdecasa/contracts';
import imageCompression from 'browser-image-compression';
import { api, ApiRequestError } from '@/shared/lib/api';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/features/auth/store/auth.store';

/** Clave de la query de perfil (compartida por la query y sus invalidaciones). */
export const profileQueryKey = ['auth', 'me'] as const;

// ── Query ───────────────────────────────────────────────────────────────────

/** Perfil del usuario autenticado (`GET /auth/me`). */
export function useProfile() {
  // Solo consulta el perfil si hay sesión. Sin esto, el AppHeader (que monta en
  // todas las páginas, también las públicas: login, landing) dispararía un 401.
  const session = useAuthStore((s) => s.session);
  return useQuery<AuthMeDto>({
    queryKey: profileQueryKey,
    queryFn: () => api.get<AuthMeDto>('/auth/me'),
    enabled: !!session,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Cambia el nombre visible (`PATCH /auth/me`) e invalida el perfil. */
export function useUpdateName() {
  const qc = useQueryClient();

  return useMutation<AuthMeDto, ApiRequestError, UpdateProfileInput>({
    mutationFn: (input) => api.patch<AuthMeDto>('/auth/me', input),
    onSuccess: (me) => {
      // Refresca el perfil con el nombre nuevo sin esperar al refetch.
      qc.setQueryData(profileQueryKey, me);
      void qc.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

// ── Avatar: comprimir → subir a Storage → PATCH /auth/me { avatarUrl } ─────────

/** Bucket público de avatares (declarado en config.toml + migración de Storage). */
const AVATAR_BUCKET = 'avatars';

/**
 * Comprime la imagen y la sube al bucket `avatars`, devolviendo su URL pública.
 *
 * El bucket se aprovisiona como infraestructura (config.toml + migración de
 * Storage), NO desde el cliente: crear buckets con el anon key es un anti-patrón.
 * Si no existiera, el upload falla con un mensaje claro.
 *
 * Compresión agresiva (es un avatar, no una foto): máx ~0.3 MB y máx 512 px.
 */
async function uploadAvatarToStorage(userId: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 512,
    useWebWorker: true,
  });

  // Ruta única dentro del bucket: avatars/<userId>/<timestamp>-<uuid>.<ext>
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, compressed, { contentType: compressed.type });

  if (error) throw new Error(`Error al subir la foto: ${error.message}`);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Sube una nueva foto de perfil: comprime, la sube a Storage y hace
 * `PATCH /auth/me { avatarUrl }` con la URL pública. Necesita el `userId` (de
 * `useProfile().data.id`) para construir la ruta dentro del bucket. Invalida el
 * perfil para reflejar el avatar al instante.
 */
export function useUpdateAvatar(userId: string | undefined) {
  const qc = useQueryClient();

  return useMutation<AuthMeDto, Error, File>({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('No hay sesión activa.');
      const avatarUrl = await uploadAvatarToStorage(userId, file);
      return api.patch<AuthMeDto>('/auth/me', { avatarUrl });
    },
    onSuccess: (me) => {
      qc.setQueryData(profileQueryKey, me);
      void qc.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

/**
 * Quita la foto de perfil: `PATCH /auth/me { avatarUrl: null }` (borrado
 * explícito en el backend, no COALESCE). No borra el objeto de Storage (queda
 * huérfano; un job de limpieza podría recogerlo más adelante).
 */
export function useRemoveAvatar() {
  const qc = useQueryClient();

  return useMutation<AuthMeDto, ApiRequestError, void>({
    mutationFn: () => api.patch<AuthMeDto>('/auth/me', { avatarUrl: null }),
    onSuccess: (me) => {
      qc.setQueryData(profileQueryKey, me);
      void qc.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

/**
 * Cambia la contraseña del usuario autenticado vía Supabase. No requiere la
 * contraseña actual (la sesión ya está autenticada). La validación de mínimo y
 * confirmación la hace la vista; aquí solo propagamos el error de Supabase.
 */
export function useChangePassword() {
  return useMutation<void, Error, { password: string }>({
    mutationFn: async ({ password }) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}

/**
 * Cambia el email del usuario autenticado vía Supabase. NO es inmediato:
 * Supabase manda un correo de verificación al nuevo email y el cambio solo se
 * aplica cuando el usuario lo confirma. Por eso NO tocamos la query de perfil
 * (el email mostrado sigue siendo el anterior). La validación de formato la hace
 * la vista; aquí solo propagamos el error de Supabase.
 */
export function useChangeEmail() {
  return useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
  });
}

/**
 * Borra la cuenta del usuario de forma PERMANENTE (`DELETE /auth/me`, responde
 * 204). La política del backend reasigna o borra las familias que creó, borra
 * sus PINs de invitación y su `app_user`, y (si hay service-role) lo elimina de
 * Supabase Auth.
 *
 * El cierre de sesión, el vaciado de stores y la navegación a /login los hace el
 * container en `onSuccess` (igual que el resto de acciones destructivas). Aquí
 * solo lanzamos la petición y, al lograrlo, vaciamos la caché de React Query para
 * que no queden datos del usuario borrado en memoria.
 */
export function useDeleteAccount() {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>('/auth/me'),
    onSuccess: () => {
      // La cuenta ya no existe: limpiamos toda la caché de queries.
      qc.clear();
    },
  });
}

/**
 * Descarga una copia de TODOS los datos del usuario (derecho de acceso, GDPR).
 * `GET /auth/me/export` devuelve un objeto JSON con toda su información; aquí lo
 * serializamos a un Blob y forzamos la descarga como `cosas-de-casa-mis-datos.json`
 * mediante un <a download> temporal y `URL.createObjectURL`/`revokeObjectURL`.
 *
 * No toca la caché de React Query: es una exportación puntual, no un dato vivo de
 * la UI. El error de negocio lo propaga el container a la vista por props.
 */
export function useExportData() {
  return useMutation<void, ApiRequestError, void>({
    mutationFn: async () => {
      const data = await api.get<unknown>('/auth/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cosas-de-casa-mis-datos.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
