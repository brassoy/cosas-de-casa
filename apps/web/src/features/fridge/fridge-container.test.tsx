/**
 * Tests del CONTAINER `FridgePage` + del hook `useFridgeRealtime`.
 *
 * Cubre la auditoría (ALTO) de las acciones rápidas:
 *  1. CONFIRMACIÓN de acciones destructivas (tirar / eliminar) vía window.confirm:
 *     - si el usuario cancela, la mutación NO se dispara;
 *     - si confirma, la mutación SÍ se dispara con el id.
 *  2. MANEJO DE ERROR: cuando una acción rápida falla, se muestra un toast.error
 *     (antes fallaban en silencio: la mutación optimista revertía sin feedback).
 *  3. REALTIME: `useFridgeRealtime` abre un canal postgres_changes filtrado por
 *     family_id y, al recibir un cambio, invalida la query de la familia.
 *
 * Estrategia: se mockea `ThemeView` para renderizar la vista base real (botones
 * reales) sin arrastrar el registry/lazy de themes (fuera de este slice). Las
 * mutaciones de `useFridge` se mockean con spies controlables (éxito/fallo).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { FridgeListViewProps } from './views/types';

// ── Mock de sonner (toast) ──────────────────────────────────────────────────────
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

// ── Mock de supabase (lo importa useFridgeRealtime a nivel de módulo) ───────────
const channelOn = vi.fn().mockReturnThis();
const channelSubscribe = vi.fn().mockReturnThis();
const removeChannel = vi.fn((..._args: unknown[]) => Promise.resolve(undefined));
const channelFactory = vi.fn((..._args: unknown[]) => ({ on: channelOn, subscribe: channelSubscribe }));
vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => channelFactory(...args),
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}));

// ── Mock del family store (familia activa) ──────────────────────────────────────
vi.mock('@/features/family/store/family.store', () => ({
  useFamilyStore: (selector: (s: { activeFamily: { id: string } | null }) => unknown) =>
    selector({ activeFamily: { id: 'fam-1' } }),
}));

// ── Mock del fridge store (filtro de ubicación) ─────────────────────────────────
vi.mock('./store/fridge.store', () => ({
  useFridgeStore: (selector: (s: { filters: { location: string }; setLocationFilter: () => void }) => unknown) =>
    selector({ filters: { location: 'ALL' }, setLocationFilter: vi.fn() }),
}));

// ── Mock de los hooks de datos ──────────────────────────────────────────────────
//
// Las mutaciones exponen `mutate(arg, { onError })`: por defecto invocan onError
// con un ApiRequestError simulado para probar el feedback de fallo.

const ITEMS = [
  {
    id: 'item-1',
    familyId: 'fam-1',
    name: 'Leche',
    quantity: '1',
    unit: 'l',
    location: 'FRIDGE',
    expiryDate: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const fakeApiError = { body: { message: 'boom servidor' } };

/** Mutación que SIEMPRE falla (invoca onError). */
function failingMutate() {
  return vi.fn((_arg: unknown, opts?: { onError?: (e: unknown) => void }) => {
    opts?.onError?.(fakeApiError);
  });
}

const removeMutate = failingMutate();
const eatMutate = failingMutate();
const throwMutate = failingMutate();
const freezeMutate = failingMutate();

vi.mock('./hooks/useFridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/useFridge')>();
  return {
    ...actual,
    useFamilyFridge: () => ({ data: ITEMS, isLoading: false, error: null }),
    useCreateFridgeItem: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateFridgeItemByFamily: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteFridgeItemByFamily: () => ({ mutate: removeMutate }),
    useEatFridgeItemByFamily: () => ({ mutate: eatMutate }),
    useThrowFridgeItemByFamily: () => ({ mutate: throwMutate }),
    useFreezeFridgeItemByFamily: () => ({ mutate: freezeMutate }),
  };
});

// ── Mock de ThemeView → vista base real (botones reales) ────────────────────────
// Factory async: importamos la vista base real (default export) y la renderizamos
// con las props del container. Evita arrastrar el registry/lazy de themes.
vi.mock('@/shared/theme/ThemeView', async () => {
  const mod = await import('./views/base/FridgeListView');
  const Base = mod.default;
  return {
    ThemeView: ({ props }: { props: FridgeListViewProps }) => <Base {...props} />,
  };
});

// ── ApiRequestError: el container usa `err instanceof ApiRequestError`.
// El mock de fakeApiError NO es instancia, así que el container cae al fallback.
// Verificamos que se muestra ALGÚN mensaje (el fallback de cada acción).

import { FridgePage } from './pages/FridgePage';

/** Renderiza el container envuelto en su QueryClientProvider (useFridgeRealtime usa useQueryClient). */
function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <FridgePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FridgePage — confirmación de acciones destructivas', () => {
  it('CANCELAR el confirm de "Eliminar" NO dispara la mutación', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /eliminar leche/i }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(removeMutate).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('CONFIRMAR "Eliminar" dispara la mutación con el id', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /eliminar leche/i }));

    expect(removeMutate).toHaveBeenCalledTimes(1);
    expect(removeMutate).toHaveBeenCalledWith('item-1', expect.any(Object));
    confirmSpy.mockRestore();
  });

  it('CANCELAR el confirm de "Tirar" NO dispara la mutación', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /tirar leche/i }));

    expect(throwMutate).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('CONFIRMAR "Tirar" dispara la mutación con el id', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /tirar leche/i }));

    expect(throwMutate).toHaveBeenCalledTimes(1);
    expect(throwMutate).toHaveBeenCalledWith('item-1', expect.any(Object));
    confirmSpy.mockRestore();
  });

  it('"Comer" y "Congelar" NO piden confirmación (no son destructivas)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /marcar leche como consumido/i }));
    await user.click(await screen.findByRole('button', { name: /congelar leche/i }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(eatMutate).toHaveBeenCalledTimes(1);
    expect(freezeMutate).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});

describe('FridgePage — feedback de error (toast) en acciones rápidas', () => {
  it('"Eliminar" fallido muestra un toast de error', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /eliminar leche/i }));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no se ha podido eliminar/i));
    confirmSpy.mockRestore();
  });

  it('"Tirar" fallido muestra un toast de error', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /tirar leche/i }));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no se ha podido tirar/i));
    confirmSpy.mockRestore();
  });

  it('"Comer" fallido muestra un toast de error', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /marcar leche como consumido/i }));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringMatching(/no se ha podido marcar como consumido/i),
    );
  });

  it('"Congelar" fallido muestra un toast de error', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /congelar leche/i }));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/no se ha podido congelar/i));
  });
});

// ── Realtime: suscripción + invalidación de la query ────────────────────────────

import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useFridgeRealtime } from './hooks/useFridgeRealtime';
import { fridgeKeys } from './hooks/useFridge';

function wrapperWith(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useFridgeRealtime', () => {
  it('abre un canal postgres_changes de fridge_items filtrado por family_id', () => {
    const qc = new QueryClient();
    renderHook(() => useFridgeRealtime('fam-1'), { wrapper: wrapperWith(qc) });

    expect(channelFactory).toHaveBeenCalledWith('fridge_items:family_id=eq.fam-1');
    expect(channelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'fridge_items',
        filter: 'family_id=eq.fam-1',
      }),
      expect.any(Function),
    );
  });

  it('al recibir un cambio remoto invalida la query de la familia', () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    renderHook(() => useFridgeRealtime('fam-1'), { wrapper: wrapperWith(qc) });

    // El 3.er arg de channel.on es el callback de postgres_changes.
    const onCall = channelOn.mock.calls.find((c) => c[0] === 'postgres_changes');
    expect(onCall).toBeDefined();
    const handler = onCall![2] as (payload: unknown) => void;
    handler({ eventType: 'INSERT' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: fridgeKeys.byFamily('fam-1') });
  });

  it('sin familia activa NO abre canal', () => {
    const qc = new QueryClient();
    renderHook(() => useFridgeRealtime(undefined), { wrapper: wrapperWith(qc) });
    expect(channelFactory).not.toHaveBeenCalled();
  });

  it('al desmontar cierra el canal (removeChannel)', () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useFridgeRealtime('fam-1'), {
      wrapper: wrapperWith(qc),
    });
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
