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
import { api, ApiRequestError } from '@/shared/lib/api';
import { supabase } from '@/shared/lib/supabase';

/** Clave de la query de perfil (compartida por la query y sus invalidaciones). */
export const profileQueryKey = ['auth', 'me'] as const;

// ── Query ───────────────────────────────────────────────────────────────────

/** Perfil del usuario autenticado (`GET /auth/me`). */
export function useProfile() {
  return useQuery<AuthMeDto>({
    queryKey: profileQueryKey,
    queryFn: () => api.get<AuthMeDto>('/auth/me'),
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
