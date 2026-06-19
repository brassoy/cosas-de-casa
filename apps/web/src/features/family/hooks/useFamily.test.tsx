/**
 * Tests de los hooks de GESTIÓN de la familia (solo OWNER):
 *  - `useUpdateFamily`   → PATCH  /families/:id           (+ sync nombre en store)
 *  - `useDeleteFamily`   → DELETE /families/:id           (+ clearFamily en store)
 *  - `useRemoveMember`   → DELETE /families/:id/members/:userId
 *  - `useChangeMemberRole` → PATCH /families/:id/members/:userId
 *
 * Verifican que cada hook llama al endpoint correcto (método + URL + body) y los
 * efectos sobre el store local (`useFamilyStore`). El cliente HTTP y el store se
 * mockean; no se toca la red.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { FamilyDto, FamilyMemberDto } from '@cosasdecasa/contracts';

// ── Mocks del cliente HTTP ────────────────────────────────────────────────────

const { mockApiPatch, mockApiDelete } = vi.hoisted(() => ({
  mockApiPatch: vi.fn(),
  mockApiDelete: vi.fn(async () => undefined),
}));

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: vi.fn(async () => []),
    post: vi.fn(async () => ({})),
    patch: mockApiPatch,
    delete: mockApiDelete,
  },
  // Reexportado por el hook; con que sea una clase basta para los tests.
  ApiRequestError: class ApiRequestError extends Error {},
}));

// ── Mock del store de familia ─────────────────────────────────────────────────

const { setActiveFamily, clearFamily, storeState } = vi.hoisted(() => ({
  setActiveFamily: vi.fn(),
  clearFamily: vi.fn(),
  storeState: { activeFamily: { id: 'fam-1', name: 'Casa García' } as { id: string; name: string } | null },
}));

vi.mock('../store/family.store', () => ({
  // `useFamilyStore(selector)` → aplica el selector sobre un estado simulado.
  useFamilyStore: (selector: (s: unknown) => unknown) =>
    selector({
      activeFamily: storeState.activeFamily,
      setActiveFamily,
      clearFamily,
    }),
}));

import {
  useUpdateFamily,
  useDeleteFamily,
  useRemoveMember,
  useChangeMemberRole,
} from './useFamily';

// ── Wrapper con QueryClient ───────────────────────────────────────────────────

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const FAMILY: FamilyDto = {
  id: 'fam-1',
  name: 'Casa Pérez',
  description: 'Hogar',
  role: 'OWNER',
  members: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
};

const MEMBER: FamilyMemberDto = {
  userId: 'u2',
  displayName: 'Luis',
  role: 'OWNER',
  joinedAt: '2024-02-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  storeState.activeFamily = { id: 'fam-1', name: 'Casa García' };
});

describe('useUpdateFamily', () => {
  it('hace PATCH /families/:id con el body y sincroniza el nombre en el store', async () => {
    mockApiPatch.mockResolvedValueOnce(FAMILY);
    const { result } = renderHook(() => useUpdateFamily('fam-1'), { wrapper: makeWrapper() });

    result.current.mutate({ name: 'Casa Pérez' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPatch).toHaveBeenCalledWith('/families/fam-1', { name: 'Casa Pérez' });
    // Como la familia editada es la activa, se sincroniza el nombre.
    expect(setActiveFamily).toHaveBeenCalledWith({ id: 'fam-1', name: 'Casa Pérez' });
  });

  it('no toca el store si la familia editada no es la activa', async () => {
    storeState.activeFamily = { id: 'otra', name: 'Otra' };
    mockApiPatch.mockResolvedValueOnce(FAMILY);
    const { result } = renderHook(() => useUpdateFamily('fam-1'), { wrapper: makeWrapper() });

    result.current.mutate({ name: 'Casa Pérez' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(setActiveFamily).not.toHaveBeenCalled();
  });
});

describe('useDeleteFamily', () => {
  it('hace DELETE /families/:id y limpia la familia activa', async () => {
    const { result } = renderHook(() => useDeleteFamily('fam-1'), { wrapper: makeWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiDelete).toHaveBeenCalledWith('/families/fam-1');
    expect(clearFamily).toHaveBeenCalledOnce();
  });
});

describe('useRemoveMember', () => {
  it('hace DELETE /families/:id/members/:userId', async () => {
    const { result } = renderHook(() => useRemoveMember('fam-1'), { wrapper: makeWrapper() });

    result.current.mutate('u2');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiDelete).toHaveBeenCalledWith('/families/fam-1/members/u2');
  });
});

describe('useChangeMemberRole', () => {
  it('hace PATCH /families/:id/members/:userId con { role }', async () => {
    mockApiPatch.mockResolvedValueOnce(MEMBER);
    const { result } = renderHook(() => useChangeMemberRole('fam-1'), {
      wrapper: makeWrapper(),
    });

    result.current.mutate({ userId: 'u2', role: 'OWNER' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiPatch).toHaveBeenCalledWith('/families/fam-1/members/u2', { role: 'OWNER' });
  });
});
