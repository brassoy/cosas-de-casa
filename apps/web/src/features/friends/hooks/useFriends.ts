import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  FriendFamilyDto,
  FriendInviteResponse,
  RedeemFriendInviteInput,
} from '../contracts';

export type { FriendFamilyDto, FriendInviteResponse, RedeemFriendInviteInput };

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFriendFamilies(familyId: string | undefined) {
  return useQuery<FriendFamilyDto[]>({
    queryKey: ['friends', familyId],
    queryFn: () => api.get<FriendFamilyDto[]>(`/families/${familyId}/friends`),
    enabled: Boolean(familyId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGenerateFriendInvite(familyId: string) {
  return useMutation<FriendInviteResponse, ApiRequestError, void>({
    mutationFn: () =>
      api.post<FriendInviteResponse>(`/families/${familyId}/friend-invites`, {}),
  });
}

export function useRedeemFriendInvite() {
  const qc = useQueryClient();

  return useMutation<FriendFamilyDto, ApiRequestError, RedeemFriendInviteInput>({
    mutationFn: (input) => api.post<FriendFamilyDto>('/friends/redeem', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useRemoveFriend(familyId: string | undefined) {
  const qc = useQueryClient();

  return useMutation<void, ApiRequestError, string>({
    mutationFn: (linkId) => api.delete<void>(`/friends/${linkId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['friends', familyId] });
    },
  });
}
