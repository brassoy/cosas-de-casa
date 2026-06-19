/**
 * Tests de useRealtimeCalendar — suscripción Supabase Realtime a `calendar_events`.
 *
 * Verifican el contrato del hook sin Supabase real (canal falso):
 *  1. Abre un canal `postgres_changes` sobre `calendar_events` filtrado por family_id.
 *  2. Al recibir un evento, INVALIDA `calendarKeys.byFamily(familyId)` — que por
 *     prefijo cubre TODOS los meses cacheados (no usa el payload crudo, ADR 0013).
 *  3. Con familyId undefined, no abre canal.
 *  4. Al desmontar, cierra el canal (removeChannel).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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

import { useRealtimeCalendar } from './hooks/useRealtimeCalendar';
import { calendarKeys } from './hooks/useCalendar';

function wrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useRealtimeCalendar', () => {
  beforeEach(() => {
    captured.channelName = undefined;
    captured.on = undefined;
    removeChannel.mockClear();
  });

  it('abre un canal postgres_changes sobre calendar_events filtrado por family_id', () => {
    const qc = new QueryClient();
    renderHook(() => useRealtimeCalendar('family-1'), { wrapper: wrapper(qc) });

    expect(captured.channelName).toBe('calendar_events:family_id=eq.family-1');
    expect(captured.on?.event).toBe('postgres_changes');
    expect(captured.on?.config).toMatchObject({
      schema: 'public',
      table: 'calendar_events',
      filter: 'family_id=eq.family-1',
    });
  });

  it('invalida calendarKeys.byFamily al recibir un evento (cubre todos los meses)', () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    renderHook(() => useRealtimeCalendar('family-1'), { wrapper: wrapper(qc) });

    captured.on?.cb({ eventType: 'UPDATE', new: { id: 'evt-9', family_id: 'family-1' } });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: calendarKeys.byFamily('family-1') });
  });

  it('byFamily es prefijo de byMonth: invalidar la familia refresca un mes cacheado', () => {
    const qc = new QueryClient();
    // Sembramos una query de mes y la marcamos como "fresca".
    const monthKey = calendarKeys.byMonth('family-1', 2026, 5);
    qc.setQueryData(monthKey, []);
    renderHook(() => useRealtimeCalendar('family-1'), { wrapper: wrapper(qc) });

    captured.on?.cb({ eventType: 'INSERT', new: { id: 'evt-1', family_id: 'family-1' } });

    // Tras invalidar por familia, la query de mes queda invalidada (stale).
    const state = qc.getQueryState(monthKey);
    expect(state?.isInvalidated).toBe(true);
  });

  it('no abre canal cuando familyId es undefined', () => {
    const qc = new QueryClient();
    renderHook(() => useRealtimeCalendar(undefined), { wrapper: wrapper(qc) });
    expect(captured.channelName).toBeUndefined();
  });

  it('cierra el canal al desmontar', () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useRealtimeCalendar('family-1'), {
      wrapper: wrapper(qc),
    });
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
