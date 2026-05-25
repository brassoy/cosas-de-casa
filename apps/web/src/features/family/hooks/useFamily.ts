import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '@/shared/lib/api';
import type {
  CreateFamilyInput,
  FamilyDto,
  FamilyMemberDto,
  GeneratePinResponse,
} from '@cosasdecasa/contracts';
import { useFamilyStore } from '../store/family.store';

// Formas de la API (tipos en @cosasdecasa/contracts):
// GET  /api/v1/families               → FamilyDto[]         (familias del usuario)
// POST /api/v1/families               → FamilyDto           (body: CreateFamilyInput)
// GET  /api/v1/families/:id/members   → FamilyMemberDto[]
// POST /api/v1/families/join          → FamilyDto           (body: { code })
// POST /api/v1/families/:id/join-pins → GeneratePinResponse ({ code, expiresAt })

export type { CreateFamilyInput };

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
