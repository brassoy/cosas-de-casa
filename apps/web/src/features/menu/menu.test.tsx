/**
 * Tests de la feature menu (Fase 4B).
 *
 * Cubre:
 *  1. MenuPage — render inicial, sugerir menú (ok + 503), selección de ingredientes,
 *     añadir a la lista.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks de infraestructura ──────────────────────────────────────────────────

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ familyId: 'family-1' }),
  };
});

// ── Mock de useMenu ───────────────────────────────────────────────────────────

vi.mock('@/features/menu/hooks/useMenu', () => {
  class ApiRequestError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: { message: string },
    ) {
      super(body.message);
      this.name = 'ApiRequestError';
    }
  }

  return {
    useSuggestMenu: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useMenuToList: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useRecipes: vi.fn(() => ({ data: [], isLoading: false })),
    useCreateRecipe: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useDeleteRecipe: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useRecipeAvailability: vi.fn(() => ({ data: undefined, isLoading: false })),
    recipeKeys: {
      all: ['recipes'],
      byFamily: (familyId: string) => ['recipes', 'family', familyId],
      availability: (recipeId: string) => ['recipes', 'availability', recipeId],
    },
    ApiRequestError,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={makeQC()}>{ui}</QueryClientProvider>);
}

// ── Importaciones bajo test ───────────────────────────────────────────────────

import { MenuPage } from './pages/MenuPage';
import * as useMenuModule from './hooks/useMenu';
import { themeRegistry } from '@/shared/theme/registry';
import MenuView from './views/base/MenuView';

// El container delega el render en ThemeView, que resuelve la vista por theme
// desde el registry central. El registry de producción lo compone otra fase;
// aquí registramos la vista base directamente (sin lazy) para que el container
// se renderice de forma síncrona bajo test.
themeRegistry.base.menu = MenuView;

// ── Spies accesibles en los tests ─────────────────────────────────────────────

let mockSuggest: ReturnType<typeof vi.fn>;
let mockToList: ReturnType<typeof vi.fn>;

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  // ThemeView resuelve la vista por el `data-theme` de <html>. Este test solo
  // sobreescribe la celda base (sync) en el registry, así que fijamos el theme a
  // base para no depender del DEFAULT_THEME global (ahora 'springfield').
  document.documentElement.setAttribute('data-theme', 'base');
  vi.clearAllMocks();
  mockSuggest = vi.fn();
  mockToList = vi.fn();

  (useMenuModule.useSuggestMenu as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: mockSuggest,
    isPending: false,
  });
  (useMenuModule.useMenuToList as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: mockToList,
    isPending: false,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. MenuPage
// ─────────────────────────────────────────────────────────────────────────────

describe('MenuPage', () => {
  it('renderiza el título y el botón de sugerir', () => {
    wrap(<MenuPage />);
    expect(screen.getByText('Menú de la nevera')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sugerir menú/i })).toBeInTheDocument();
  });

  it('muestra el mensaje de estado vacío inicial', () => {
    wrap(<MenuPage />);
    expect(screen.getByText(/pulsa.*sugerir menú/i)).toBeInTheDocument();
  });

  it('llama a useSuggestMenu.mutate al pulsar el botón', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    expect(mockSuggest).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('muestra los platos sugeridos cuando la IA responde', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    // Simular respuesta exitosa
    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Tortilla de patatas',
            description: 'Clásico español',
            usesFromFridge: ['Huevos', 'Patatas'],
            missingIngredients: ['Aceite de oliva'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByText('Tortilla de patatas')).toBeInTheDocument();
    });

    expect(screen.getByText('Clásico español')).toBeInTheDocument();
    expect(screen.getByText('Huevos')).toBeInTheDocument();
    expect(screen.getByText('Aceite de oliva')).toBeInTheDocument();
  });

  it('los ingredientes que tienes en la nevera aparecen en verde', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Revuelto de champiñones',
            usesFromFridge: ['Huevos'],
            missingIngredients: ['Champiñones'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByText('Huevos')).toBeInTheDocument();
    });

    // El chip de Huevos es un li, no un botón (ingrediente disponible)
    const huevosEl = screen.getByText('Huevos');
    expect(huevosEl.tagName.toLowerCase()).toBe('li');
  });

  it('los ingredientes faltantes son botones toggle seleccionables', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Pasta carbonara',
            usesFromFridge: [],
            missingIngredients: ['Bacon', 'Nata'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seleccionar bacon/i })).toBeInTheDocument();
    });

    const baconBtn = screen.getByRole('button', { name: /seleccionar bacon/i });
    expect(baconBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(baconBtn);

    expect(baconBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('la barra de "Añadir a la lista" aparece cuando hay ingredientes faltantes', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Gazpacho',
            usesFromFridge: [],
            missingIngredients: ['Tomates', 'Pepino'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /añadir ingredientes seleccionados/i }),
      ).toBeInTheDocument();
    });
  });

  it('el botón "Añadir a la lista" está deshabilitado sin ingredientes seleccionados', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Sopa de verduras',
            usesFromFridge: [],
            missingIngredients: ['Zanahorias'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /añadir ingredientes seleccionados/i }),
      ).toBeDisabled();
    });
  });

  it('llama a useMenuToList.mutate con los ingredientes seleccionados', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onSuccess }: { onSuccess: (data: unknown) => void }) => {
      onSuccess({
        dishes: [
          {
            name: 'Tortilla',
            usesFromFridge: [],
            missingIngredients: ['Aceite'],
          },
        ],
      });
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seleccionar aceite/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /seleccionar aceite/i }));
    await user.click(screen.getByRole('button', { name: /añadir ingredientes seleccionados/i }));

    expect(mockToList).toHaveBeenCalledWith(
      expect.objectContaining({ ingredients: ['Aceite'] }),
      expect.any(Object),
    );
  });

  it('muestra el aviso de IA no disponible cuando la sugerencia devuelve 503', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onError }: { onError: (err: unknown) => void }) => {
      onError(Object.assign(new Error('503'), { status: 503, body: { message: 'Service Unavailable' } }));
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/la ia no está disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/recargar la clave de minimax/i)).toBeInTheDocument();
  });

  it('no muestra la barra de añadir a la lista cuando la IA falla', async () => {
    const user = userEvent.setup();
    wrap(<MenuPage />);

    mockSuggest.mockImplementation((_input, { onError }: { onError: (err: unknown) => void }) => {
      onError(Object.assign(new Error('503'), { status: 503, body: { message: 'Service Unavailable' } }));
    });

    await user.click(screen.getByRole('button', { name: /sugerir menú/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /añadir a la lista/i }),
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Mis recetas
// ─────────────────────────────────────────────────────────────────────────────

describe('Mis recetas', () => {
  it('renderiza la sección de recetas con el formulario de creación', () => {
    wrap(<MenuPage />);
    expect(screen.getByRole('heading', { name: /mis recetas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre de la receta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar receta/i })).toBeInTheDocument();
  });

  it('el botón de guardar está deshabilitado sin nombre ni ingredientes', () => {
    wrap(<MenuPage />);
    expect(screen.getByRole('button', { name: /guardar receta/i })).toBeDisabled();
  });

  it('llama a useCreateRecipe.mutate con nombre e ingredientes', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn();
    (useMenuModule.useCreateRecipe as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockCreate,
      isPending: false,
    });

    wrap(<MenuPage />);

    await user.type(screen.getByLabelText(/nombre de la receta/i), 'Ensaladilla');
    await user.type(screen.getByLabelText('Ingrediente 1'), 'patata cocida');
    await user.click(screen.getByRole('button', { name: /guardar receta/i }));

    expect(mockCreate).toHaveBeenCalledWith(
      { name: 'Ensaladilla', ingredients: ['patata cocida'] },
      expect.any(Object),
    );
  });

  it('lista las recetas guardadas con su número de ingredientes', () => {
    (useMenuModule.useRecipes as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ id: 'r-1', name: 'Ensaladilla', ingredients: ['patata cocida', 'atún'] }],
      isLoading: false,
    });

    wrap(<MenuPage />);

    expect(screen.getByRole('button', { name: /desplegar ensaladilla/i })).toBeInTheDocument();
    expect(screen.getByText(/2 ingredientes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eliminar ensaladilla/i })).toBeInTheDocument();
  });

  it('llama a useDeleteRecipe.mutate al pulsar eliminar', async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn();
    (useMenuModule.useRecipes as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ id: 'r-1', name: 'Ensaladilla', ingredients: ['atún'] }],
      isLoading: false,
    });
    (useMenuModule.useDeleteRecipe as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockDelete,
      isPending: false,
    });

    wrap(<MenuPage />);

    await user.click(screen.getByRole('button', { name: /eliminar ensaladilla/i }));

    expect(mockDelete).toHaveBeenCalledWith('r-1', expect.any(Object));
  });
});
