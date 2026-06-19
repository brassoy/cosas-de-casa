import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  ChangeMemberRoleInput,
  CreateFamilyInput,
  FamilyDto,
  FamilyMemberDto,
  GeneratePinResponse,
  UpdateFamilyInput,
} from '@cosasdecasa/contracts';
import { useFamilyStore } from '../store/family.store';

// Formas de la API (tipos en @cosasdecasa/contracts):
// GET    /api/v1/families                            → FamilyDto[]         (familias del usuario)
// POST   /api/v1/families                            → FamilyDto           (body: CreateFamilyInput)
// GET    /api/v1/families/:id                         → FamilyDto           (detalle de la familia)
// PATCH  /api/v1/families/:id                         → FamilyDto           (body: UpdateFamilyInput, solo OWNER)
// DELETE /api/v1/families/:id                         → void                (borrar la familia, solo OWNER)
// GET    /api/v1/families/:id/members                 → FamilyMemberDto[]
// PATCH  /api/v1/families/:id/members/:userId         → FamilyMemberDto     (body: ChangeMemberRoleInput, solo OWNER)
// DELETE /api/v1/families/:id/members/:userId         → void                (expulsar miembro, solo OWNER)
// POST   /api/v1/families/join                        → FamilyDto           (body: { code })
// POST   /api/v1/families/:id/join-pins               → GeneratePinResponse ({ code, expiresAt })
// DELETE /api/v1/families/:id/members/me              → void                (salir de la familia)
// DELETE /api/v1/families/:id/join-pins/active        → void                (revocar PIN activo, solo OWNER)

export type { ChangeMemberRoleInput, CreateFamilyInput, UpdateFamilyInput };

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMyFamilies() {
  return useQuery<FamilyDto[]>({
    queryKey: ['families'],
    queryFn: () => api.get<FamilyDto[]>('/families'),
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery<FamilyMemberDto[]>({
    queryKey: ['families', familyId, 'members'],
    queryFn: () => api.get<FamilyMemberDto[]>(`/families/${familyId}/members`),
    enabled: Boolean(familyId),
  });
}

/**
 * Detalle de una familia (`GET /families/:id`). Incluye `name`, `description`
 * y la lista de miembros. Lo consume la pantalla de gestión (OWNER) para
 * precargar el formulario de edición de nombre/descripción.
 */
export function useFamily(familyId: string | undefined) {
  return useQuery<FamilyDto>({
    queryKey: ['families', familyId, 'detail'],
    queryFn: () => api.get<FamilyDto>(`/families/${familyId}`),
    enabled: Boolean(familyId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFamily() {
  const qc = useQueryClient();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);

  return useMutation<FamilyDto, ApiRequestError, CreateFamilyInput>({
    mutationFn: (input) => api.post<FamilyDto>('/families', input),
    onSuccess: (family) => {
      setActiveFamily({ id: family.id, name: family.name });
      void qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useJoinFamily() {
  const qc = useQueryClient();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);

  return useMutation<FamilyDto, ApiRequestError, { code: string }>({
    mutationFn: (body) => api.post<FamilyDto>('/families/join', body),
    onSuccess: (family) => {
      setActiveFamily({ id: family.id, name: family.name });
      void qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useGenerateJoinPin(familyId: string) {
  return useMutation<GeneratePinResponse, ApiRequestError, void>({
    mutationFn: () => api.post<GeneratePinResponse>(`/families/${familyId}/join-pins`, {}),
  });
}

/**
 * Revoca el PIN de invitación activo de la familia (solo OWNER).
 * Operación inversa de `useGenerateJoinPin`: misma forma, DELETE sin cuerpo.
 */
export function useRevokeFamilyPin(familyId: string) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/families/${familyId}/join-pins/active`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}

/**
 * Salir de la familia (espejo de `useLeaveGroup`): borra al usuario de la
 * familia y limpia la familia activa del store local. El container navega a
 * onboarding ("/") tras el éxito.
 */
export function useLeaveFamily(familyId: string) {
  const qc = useQueryClient();
  const clearFamily = useFamilyStore((s) => s.clearFamily);

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/families/${familyId}/members/me`),
    onSuccess: () => {
      clearFamily();
      void qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

// ── Gestión de la familia (solo OWNER) ───────────────────────────────────────

/**
 * Editar nombre/descripción de la familia (`PATCH /families/:id`, solo OWNER).
 * Si la familia editada es la activa, sincroniza su nombre en el store local
 * para que la cabecera de la home se actualice al instante.
 */
export function useUpdateFamily(familyId: string) {
  const qc = useQueryClient();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);

  return useMutation<FamilyDto, ApiRequestError, UpdateFamilyInput>({
    mutationFn: (input) => api.patch<FamilyDto>(`/families/${familyId}`, input),
    onSuccess: (family) => {
      if (activeFamily?.id === family.id) {
        setActiveFamily({ id: family.id, name: family.name });
      }
      void qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

/**
 * Borrar la familia (`DELETE /families/:id`, solo OWNER). Acción destructiva
 * fuerte: tras el éxito limpia la familia activa del store local. El container
 * navega a onboarding ("/").
 */
export function useDeleteFamily(familyId: string) {
  const qc = useQueryClient();
  const clearFamily = useFamilyStore((s) => s.clearFamily);

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/families/${familyId}`),
    onSuccess: () => {
      clearFamily();
      void qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

/**
 * Expulsar a un miembro de la familia (`DELETE /families/:id/members/:userId`,
 * solo OWNER). Acción destructiva: la confirmación vive en el container. Tras
 * el éxito refresca la lista de miembros y el detalle.
 */
export function useRemoveMember(familyId: string) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: (userId) => api.delete<void>(`/families/${familyId}/members/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}

/**
 * Cambiar el rol de un miembro (`PATCH /families/:id/members/:userId`, solo
 * OWNER). El backend valida que siempre quede al menos un OWNER. Tras el éxito
 * refresca la lista de miembros y el detalle.
 */
export function useChangeMemberRole(familyId: string) {
  const qc = useQueryClient();

  return useMutation<
    FamilyMemberDto,
    ApiRequestError,
    { userId: string; role: ChangeMemberRoleInput['role'] }
  >({
    mutationFn: ({ userId, role }) =>
      api.patch<FamilyMemberDto>(`/families/${familyId}/members/${userId}`, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}
