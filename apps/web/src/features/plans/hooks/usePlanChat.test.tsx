/**
 * Tests de usePlanChat — paginación hacia atrás del chat de un plan.
 *
 * El backend devuelve hasta `MESSAGES_PAGE_SIZE` mensajes en orden ascendente y
 * acepta `?before=<ISO>` para traer los anteriores a un instante. Estos tests
 * verifican que el hook:
 *  1. Marca `hasMoreOlder=true` cuando la primera página viene llena.
 *  2. Marca `hasMoreOlder=false` cuando la primera página viene incompleta.
 *  3. Al `loadOlderMessages()`, pide `?before=<createdAt del más antiguo>` y
 *     PREPENDE la página resultante (más antiguos arriba, sin duplicar).
 *  4. Deja de ofrecer "cargar más" cuando una página antigua viene incompleta.
 *
 * Supabase Realtime se stubea con un canal falso (no participa en la
 * paginación); `@/shared/lib/api` se mockea para responder por URL.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { PlanMessageDto } from '../contracts';

// ── Stubs ───────────────────────────────────────────────────────────────────────

const removeChannel = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: () => channel,
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: (ch: unknown) => removeChannel(ch),
  },
}));

// `api.get` devuelve lo que registremos por URL exacta.
const apiGet = vi.fn<(path: string) => Promise<unknown>>();

vi.mock('@/shared/lib/api', () => ({
  api: {
    get: (path: string) => apiGet(path),
    post: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {},
}));

import { usePlanChat, MESSAGES_PAGE_SIZE } from './usePlanChat';

// ── Factories ──────────────────────────────────────────────────────────────────

/** Genera `count` mensajes ascendentes a partir de `startMinute` (más antiguo primero). */
function makePage(prefix: string, count: number, startMinute: number): PlanMessageDto[] {
  return Array.from({ length: count }, (_, i) => {
    const minute = String(startMinute + i).padStart(2, '0');
    return {
      id: `${prefix}-${i}`,
      planId: 'plan-1',
      userId: 'user-other',
      displayName: 'Otro',
      body: `${prefix} #${i}`,
      createdAt: `2026-05-26T10:${minute}:00.000Z`,
    };
  });
}

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function newQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  apiGet.mockReset();
  removeChannel.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('usePlanChat — paginación hacia atrás', () => {
  it('no ofrece cargar más cuando la primera página viene incompleta', async () => {
    apiGet.mockResolvedValueOnce(makePage('first', 3, 0)); // < page size

    const { result } = renderHook(() => usePlanChat('plan-1'), { wrapper: wrapper(newQc()) });

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    expect(result.current.hasMoreOlder).toBe(false);
  });

  it('ofrece cargar más cuando la primera página viene llena', async () => {
    apiGet.mockResolvedValueOnce(makePage('first', MESSAGES_PAGE_SIZE, 0)); // página llena

    const { result } = renderHook(() => usePlanChat('plan-1'), { wrapper: wrapper(newQc()) });

    await waitFor(() => expect(result.current.messages).toHaveLength(MESSAGES_PAGE_SIZE));
    expect(result.current.hasMoreOlder).toBe(true);
  });

  it('pide ?before=<createdAt del más antiguo> y PREPENDE la página antigua', async () => {
    const firstPage = makePage('first', MESSAGES_PAGE_SIZE, 0);
    const olderPage = makePage('older', 10, 0).map((m, i) => ({
      ...m,
      // Más antiguos que la primera página (09:xx < 10:xx).
      createdAt: `2026-05-26T09:${String(i).padStart(2, '0')}:00.000Z`,
    }));

    // 1ª llamada: carga inicial (sin ?before). 2ª: la página antigua.
    apiGet.mockImplementation((path: string) => {
      if (path === '/plans/plan-1/messages') return Promise.resolve(firstPage);
      return Promise.resolve(olderPage);
    });

    const { result } = renderHook(() => usePlanChat('plan-1'), { wrapper: wrapper(newQc()) });

    await waitFor(() => expect(result.current.messages).toHaveLength(MESSAGES_PAGE_SIZE));

    const oldestBefore = result.current.messages[0]!.createdAt;

    await act(async () => {
      result.current.loadOlderMessages();
    });

    await waitFor(() =>
      expect(result.current.messages).toHaveLength(MESSAGES_PAGE_SIZE + 10),
    );

    // Se pidió con el cursor del mensaje más antiguo conocido, URL-encoded.
    expect(apiGet).toHaveBeenCalledWith(
      `/plans/plan-1/messages?before=${encodeURIComponent(oldestBefore)}`,
    );

    // La página antigua quedó PREPENDIDA (más antiguo arriba) y ordenada.
    expect(result.current.messages[0]!.id).toBe('older-0');
    // Página antigua incompleta (10 < page size) → ya no hay más histórico.
    expect(result.current.hasMoreOlder).toBe(false);
  });

  it('sigue ofreciendo cargar más si la página antigua también vino llena', async () => {
    const firstPage = makePage('first', MESSAGES_PAGE_SIZE, 0);
    const olderFull = makePage('older', MESSAGES_PAGE_SIZE, 0).map((m, i) => ({
      ...m,
      createdAt: `2026-05-26T09:${String(i).padStart(2, '0')}:00.000Z`,
    }));

    apiGet.mockImplementation((path: string) => {
      if (path === '/plans/plan-1/messages') return Promise.resolve(firstPage);
      return Promise.resolve(olderFull);
    });

    const { result } = renderHook(() => usePlanChat('plan-1'), { wrapper: wrapper(newQc()) });
    await waitFor(() => expect(result.current.messages).toHaveLength(MESSAGES_PAGE_SIZE));

    await act(async () => {
      result.current.loadOlderMessages();
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(MESSAGES_PAGE_SIZE * 2));
    expect(result.current.hasMoreOlder).toBe(true);
  });
});
