import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  GroupSummaryDto,
  GroupMemberDto,
  GroupRole,
  CreateGroupInput,
  UpdateGroupInput,
  GenerateGroupPinResponse,
} from '../contracts';
import { useGroupsStore } from '../store/groups.store';

export type { CreateGroupInput, UpdateGroupInput };

// ── Endpoints reales (GroupsController) ──────────────────────────────────────
// GET    /api/v1/groups                       → GroupSummaryDto[]
// POST   /api/v1/groups                       → GroupSummaryDto       (body: CreateGroupInput)
// POST   /api/v1/groups/join                  → { groupId: string; joined: boolean }  (body: { code: string })
// GET    /api/v1/groups/:id/members           → GroupMemberDto[]
// POST   /api/v1/groups/:id/join-pins         → GenerateGroupPinResponse
// PATCH  /api/v1/groups/:id                   → GroupSummaryDto       (body: UpdateGroupInput, solo OWNER)
// DELETE /api/v1/groups/:id                   → void                  (borrar peña, solo OWNER)
// PATCH  /api/v1/groups/:id/members/:userId   → void                  (cambiar rol, body: { role }, solo OWNER)
// DELETE /api/v1/groups/:id/members/:userId   → void                  (expulsar miembro, solo OWNER)
// DELETE /api/v1/groups/:id/members/me        → void
// DELETE /api/v1/groups/:id/join-pins/active  → void  (revocar PIN activo, solo OWNER)

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMyGroups() {
  return useQuery<GroupSummaryDto[]>({
    queryKey: ['groups'],
    queryFn: () => api.get<GroupSummaryDto[]>('/groups'),
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery<GroupMemberDto[]>({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => api.get<GroupMemberDto[]>(`/groups/${groupId}/members`),
    enabled: Boolean(groupId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGroup() {
  const qc = useQueryClient();
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);

  return useMutation<GroupSummaryDto, ApiRequestError, CreateGroupInput>({
    mutationFn: (input) => api.post<GroupSummaryDto>('/groups', input),
    onSuccess: (group) => {
      setActiveGroup({ id: group.id, name: group.name });
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/** Respuesta real del endpoint POST /groups/join */
interface JoinGroupResponse {
  groupId: string;
  joined: boolean;
}

export function useJoinGroup() {
  const qc = useQueryClient();
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);

  return useMutation<JoinGroupResponse, ApiRequestError, { code: string }>({
    mutationFn: (body) => api.post<JoinGroupResponse>('/groups/join', body),
    // El endpoint de join solo devuelve `{ groupId, joined }` (sin nombre). NO
    // guardamos el `groupId` como nombre (mostraría el UUID en la cabecera):
    // refrescamos el listado y resolvemos el nombre real desde él antes de fijar
    // la peña activa. Si el listado aún no lo trae, dejamos el nombre vacío para
    // que la vista caiga al literal "Peña" en vez de a un UUID.
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['groups'] });
      const groups = qc.getQueryData<GroupSummaryDto[]>(['groups']);
      const joined = groups?.find((g) => g.id === res.groupId);
      setActiveGroup({ id: res.groupId, name: joined?.name ?? '' });
    },
  });
}

export function useGenerateGroupPin(groupId: string) {
  return useMutation<GenerateGroupPinResponse, ApiRequestError, void>({
    mutationFn: () =>
      api.post<GenerateGroupPinResponse>(`/groups/${groupId}/join-pins`, {}),
  });
}

/**
 * Revoca el PIN de invitación activo de la peña (solo OWNER).
 * Operación inversa de `useGenerateGroupPin`: misma forma, DELETE sin cuerpo.
 */
export function useRevokeGroupPin(groupId: string) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/groups/${groupId}/join-pins/active`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useLeaveGroup(groupId: string) {
  const qc = useQueryClient();
  const clearGroup = useGroupsStore((s) => s.clearGroup);

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/groups/${groupId}/members/me`),
    onSuccess: () => {
      clearGroup();
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// ── Gestión de la peña (solo OWNER) ───────────────────────────────────────────

/**
 * Edita nombre y/o descripción de la peña (`PATCH /groups/:id`, solo OWNER).
 * Devuelve el `GroupSummaryDto` actualizado; refrescamos el store local con el
 * nuevo nombre y reinvalidamos listados/detalle.
 */
export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  const setActiveGroup = useGroupsStore((s) => s.setActiveGroup);

  return useMutation<GroupSummaryDto, ApiRequestError, UpdateGroupInput>({
    mutationFn: (input) => api.patch<GroupSummaryDto>(`/groups/${groupId}`, input),
    onSuccess: (group) => {
      setActiveGroup({ id: group.id, name: group.name });
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Borra la peña y todo su contenido (`DELETE /groups/:id`, solo OWNER).
 * Limpia la peña activa del store; el container navega al listado tras el éxito.
 */
export function useDeleteGroup(groupId: string) {
  const qc = useQueryClient();
  const clearGroup = useGroupsStore((s) => s.clearGroup);

  return useMutation<void, ApiRequestError, void>({
    mutationFn: () => api.delete<void>(`/groups/${groupId}`),
    onSuccess: () => {
      clearGroup();
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/**
 * Cambia el rol de un miembro OWNER↔MEMBER
 * (`PATCH /groups/:id/members/:userId`, solo OWNER). Reinvalida la lista de
 * miembros para reflejar el nuevo rol.
 */
export function useChangeGroupMemberRole(groupId: string) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, { userId: string; role: GroupRole }>({
    mutationFn: ({ userId, role }) =>
      api.patch<void>(`/groups/${groupId}/members/${userId}`, { role }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId, 'members'] });
    },
  });
}

/**
 * Expulsa a un miembro de la peña (`DELETE /groups/:id/members/:userId`, solo
 * OWNER). Reinvalida la lista de miembros para que desaparezca el expulsado.
 */
export function useExpelGroupMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, { userId: string }>({
    mutationFn: ({ userId }) => api.delete<void>(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId, 'members'] });
    },
  });
}
