import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// idb-keyval necesita IndexedDB real. Lo mockeamos para que el persister se
// construya sin tocar una base y los providers monten en jsdom.
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}));

import { Providers } from './providers';

function Probe() {
  // Una query simple confirma que el QueryClient está disponible en el árbol.
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ok'),
  });
  return <div>probe:{data ?? 'pending'}</div>;
}

describe('Providers', () => {
  it('renderiza sus hijos sin romper', () => {
    render(
      <Providers>
        <span>hijo</span>
      </Providers>,
    );
    expect(screen.getByText('hijo')).toBeInTheDocument();
  });

  it('proporciona un QueryClient a los hijos', async () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    // Si el QueryClient no estuviera, useQuery lanzaría al montar.
    expect(await screen.findByText('probe:ok')).toBeInTheDocument();
  });

  it('monta el Toaster global: toast() renderiza la notificación', async () => {
    render(
      <Providers>
        <span>hijo</span>
      </Providers>,
    );
    // Si el <Toaster> no estuviera montado en el árbol, toast() no pintaría
    // nada. Disparamos uno y comprobamos que aparece en el DOM.
    act(() => {
      toast('Aviso de prueba');
    });
    await waitFor(() => {
      expect(screen.getByText('Aviso de prueba')).toBeInTheDocument();
    });
  });
});
