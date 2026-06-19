/**
 * Tests de useRealtimeTasks — suscripción Supabase Realtime a la tabla `tasks`.
 *
 * Verifican el contrato del hook sin Supabase real (canal falso):
 *  1. Abre un canal `postgres_changes` sobre `tasks` filtrado por `family_id`.
 *  2. Al recibir un evento, INVALIDA `taskKeys.byFamily(familyId)` (no usa el
 *     payload crudo — ADR 0013: los campos derivados no llegan en el payload).
 *  3. Con familyId undefined, no abre canal.
 *  4. Al desmontar, cierra el canal (removeChannel).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Canal falso: captura la config de .on() y expone el callback ────────────────

interface CapturedOn {
  event: string;
  config: { schema: string; table: string; filter: string };
  cb: (payload: unknown) => void;
}

const captured: { channelName?: string; on?: CapturedOn } = {};
const removeChannel = vi.fn();

function makeFakeChannel(name: string) {
  captured.channelName = name;
  const channel = {
    on: (event: string, config: CapturedOn['config'], cb: CapturedOn['cb']) => {
      captured.on = { event, config, cb };
      return channel;
    },
    subscribe: (_cb?: (status: string) => void) => channel,
  };
  return channel;
}

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    channel: (name: string) => makeFakeChannel(name),
    removeChannel: (ch: unknown) => removeChannel(ch),
  },
}));

import { useRealtimeTasks } from './hooks/useRealtimeTasks';
import { taskKeys } from './hooks/useTasks';

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useRealtimeTasks', () => {
  beforeEach(() => {
    captured.channelName = undefined;
    captured.on = undefined;
    removeChannel.mockClear();
  });

  it('abre un canal postgres_changes sobre tasks filtrado por family_id', () => {
    const qc = new QueryClient();
    renderHook(() => useRealtimeTasks('family-1'), { wrapper: wrapper(qc) });

    expect(captured.channelName).toBe('tasks:family_id=eq.family-1');
    expect(captured.on?.event).toBe('postgres_changes');
    expect(captured.on?.config).toMatchObject({
      schema: 'public',
      table: 'tasks',
      filter: 'family_id=eq.family-1',
    });
  });

  it('invalida taskKeys.byFamily al recibir un evento (no usa el payload crudo)', () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    renderHook(() => useRealtimeTasks('family-1'), { wrapper: wrapper(qc) });

    // Simulamos un evento remoto (otro miembro creó/cambió una tarea).
    captured.on?.cb({ eventType: 'INSERT', new: { id: 'task-9', family_id: 'family-1' } });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.byFamily('family-1') });
  });

  it('no abre canal cuando familyId es undefined', () => {
    const qc = new QueryClient();
    renderHook(() => useRealtimeTasks(undefined), { wrapper: wrapper(qc) });
    expect(captured.channelName).toBeUndefined();
  });

  it('cierra el canal al desmontar', () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useRealtimeTasks('family-1'), { wrapper: wrapper(qc) });
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
