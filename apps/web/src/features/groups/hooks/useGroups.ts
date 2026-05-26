import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  GroupSummaryDto,
  GroupMemberDto,
  CreateGroupInput,
  GenerateGroupPinResponse,
} from '../contracts';
import { useGroupsStore } from '../store/groups.store';

export type { CreateGroupInput };

// ── Endpoints reales (GroupsController) ──────────────────────────────────────
// GET    /api/v1/groups                   → GroupSummaryDto[]
// POST   /api/v1/groups                   → GroupSummaryDto       (body: CreateGroupInput)
// POST   /api/v1/groups/join              → { groupId: string; joined: boolean }  (body: { code: string })
// GET    /api/v1/groups/:id/members       → GroupMemberDto[]
// POST   /api/v1/groups/:id/join-pins     → GenerateGroupPinResponse
// DELETE /api/v1/groups/:id/members/me   → void

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
    onSuccess: (res) => {
      setActiveGroup({ id: res.groupId, name: res.groupId });
      void qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useGenerateGroupPin(groupId: string) {
  return useMutation<GenerateGroupPinResponse, ApiRequestError, void>({
    mutationFn: () =>
      api.post<GenerateGroupPinResponse>(`/groups/${groupId}/join-pins`, {}),
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
