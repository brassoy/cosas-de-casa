/**
 * Tests de PlacePicker (selector de lugar con Google Maps).
 *
 * Se mockea `@vis.gl/react-google-maps` por completo para que jsdom NO intente
 * cargar el SDK de Google (que requiere navegador real + red). El mock expone:
 *  - `APIProvider`: pasa los hijos tal cual (no carga script).
 *  - `Map`/`Marker`: stubs que solo pintan un marcador identificable.
 *  - `useMapsLibrary('places')`: devuelve un `Autocomplete` falso cuyo
 *    `place_changed` podemos disparar a mano para simular la selección.
 *
 * Cubre:
 *  1. Sin key → no monta nada (degradación graciosa).
 *  2. Con key → monta buscador + mapa y emite `onChange` con nombre/coords.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ── Mock de la librería: sin esto jsdom intentaría cargar Google Maps ──────────

let placeChangedHandler: (() => void) | null = null;
const fakePlace = {
  name: 'Parque del Retiro',
  formatted_address: 'Plaza de la Independencia, 7, Madrid',
  geometry: { location: { lat: () => 40.4153, lng: () => -3.6844 } },
};

vi.mock('@vis.gl/react-google-maps', () => {
  return {
    APIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Map: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="gmap">{children}</div>
    ),
    Marker: () => <div data-testid="gmarker" />,
    useMapsLibrary: (name: string) => {
      if (name !== 'places') return null;
      return {
        Autocomplete: class {
          constructor(_input: HTMLInputElement, _opts: unknown) {}
          addListener(_event: string, handler: () => void) {
            placeChangedHandler = handler;
            return { remove: () => {} };
          }
          getPlace() {
            return fakePlace;
          }
        },
      };
    },
  };
});

// `google.maps.event.clearInstanceListeners` lo llama el cleanup del efecto.
beforeEach(() => {
  (globalThis as unknown as { google: unknown }).google = {
    maps: { event: { clearInstanceListeners: vi.fn() } },
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  placeChangedHandler = null;
});

/**
 * Importa el módulo DESPUÉS de fijar la env, porque `hasGoogleMapsApiKey` se
 * evalúa al cargar el módulo (no en render).
 */
async function importPicker() {
  const mod = await import('./PlacePicker');
  return mod.default;
}

describe('PlacePicker — degradación sin key', () => {
  it('no monta el mapa cuando no hay VITE_GOOGLE_MAPS_API_KEY', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    vi.resetModules();
    const PlacePicker = await importPicker();

    const { container } = render(<PlacePicker onChange={vi.fn()} />);

    expect(screen.queryByTestId('gmap')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PlacePicker — con key', () => {
  it('monta el buscador y el mapa, y emite onChange al seleccionar un lugar', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key-123');
    vi.resetModules();
    const PlacePicker = await importPicker();

    const onChange = vi.fn();
    render(<PlacePicker onChange={onChange} />);

    // Buscador y mapa montados.
    const input = await screen.findByRole('textbox', { name: /buscar lugar en el mapa/i });
    expect(input).toBeInTheDocument();
    expect(screen.getByTestId('gmap')).toBeInTheDocument();

    // Simula la selección de un lugar en el autocompletado de Google.
    expect(placeChangedHandler).toBeTypeOf('function');
    act(() => placeChangedHandler?.());

    expect(onChange).toHaveBeenCalledWith({
      name: 'Parque del Retiro',
      address: 'Plaza de la Independencia, 7, Madrid',
      lat: 40.4153,
      lng: -3.6844,
    });
  });
});
