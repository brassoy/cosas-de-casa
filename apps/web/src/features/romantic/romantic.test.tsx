/**
 * Tests de la feature romantic (rincón de pareja).
 *
 * Cubre:
 *  1. PairUpScreen — render básico, selección de pareja, submit
 *  2. ChallengesList — render de retos + marcar hecho
 *  3. NotesThread — render notas + añadir nota
 *  4. RomanticPage (maldad) — botón "Hacer maldad" + feedback visual
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
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      }),
    },
  },
}));

vi.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: vi.fn(
    (selector: (s: { user: { id: string; email: string; user_metadata: Record<string, unknown> } }) => unknown) =>
      selector({ user: { id: 'user-1', email: 'test@example.com', user_metadata: {} } }),
  ),
}));

vi.mock('@/features/family/store/family.store', () => ({
  useFamilyStore: vi.fn(
    (selector: (s: { activeFamily: { id: string; name: string } | null }) => unknown) =>
      selector({ activeFamily: { id: 'family-1', name: 'Mi familia' } }),
  ),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ familyId: 'family-1' }),
  };
});

// ── Mock de useFamily ─────────────────────────────────────────────────────────

vi.mock('@/features/family/hooks/useFamily', () => ({
  useFamilyMembers: vi.fn(() => ({
    data: [
      { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
      { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER', joinedAt: new Date().toISOString() },
    ],
    isLoading: false,
    error: null,
  })),
}));

// ── Mocks de useRomantic ──────────────────────────────────────────────────────

const mockCreateCouple = vi.fn();
const mockMarkChallengeDone = vi.fn();
const mockAddNote = vi.fn();
const mockSendMischief = vi.fn();

/** CoupleDto real: { id, familyId, userA, userB, createdAt } */
const makeCouple = () => ({
  id: 'couple-1',
  familyId: 'family-1',
  userA: 'user-1',
  userB: 'user-2',
  createdAt: new Date().toISOString(),
});

/**
 * CoupleChallengeDto real: { id, coupleId, challengeKey, description, done, doneAt }
 * No hay title ni emoji.
 */
const makeChallenges = () => [
  {
    id: 'ch-1',
    coupleId: 'couple-1',
    challengeKey: 'cocinar-juntos',
    description: 'Elegid una receta que nunca hayáis hecho.',
    done: false,
    doneAt: null,
  },
  {
    id: 'ch-2',
    coupleId: 'couple-1',
    challengeKey: 'ver-el-amanecer',
    description: 'Madrugad y disfrutad del amanecer.',
    done: true,
    doneAt: new Date().toISOString(),
  },
];

/**
 * CoupleNoteDto real: { id, coupleId, authorId, body, createdAt }
 * No hay authorName ni content.
 */
const makeNotes = () => [
  {
    id: 'note-1',
    coupleId: 'couple-1',
    authorId: 'user-1',
    body: '¡Buenos días, cariño!',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    coupleId: 'couple-1',
    authorId: 'user-2',
    body: '¡Buenos días a ti también! 😘',
    createdAt: new Date().toISOString(),
  },
];

vi.mock('@/features/romantic/hooks/useRomantic', () => ({
  useCouple: vi.fn(() => ({
    data: makeCouple(),
    isLoading: false,
    error: null,
  })),
  useChallenges: vi.fn(() => ({
    data: makeChallenges(),
    isLoading: false,
    error: null,
  })),
  useCoupleNotes: vi.fn(() => ({
    data: makeNotes(),
    isLoading: false,
    error: null,
  })),
  useCreateCouple: vi.fn(() => ({
    mutate: mockCreateCouple,
    isPending: false,
  })),
  useMarkChallengeDone: vi.fn(() => ({
    mutate: mockMarkChallengeDone,
    isPending: false,
    variables: undefined,
  })),
  useAddNote: vi.fn(() => ({
    mutate: mockAddNote,
    isPending: false,
  })),
  useSendMischief: vi.fn(() => ({
    mutate: mockSendMischief,
    isPending: false,
  })),
  ApiRequestError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly body: { message: string },
    ) {
      super(body.message);
    }
  },
  romanticKeys: {
    couple: (fid: string) => ['romantic', 'couple', fid],
    challenges: (cid: string) => ['romantic', 'challenges', cid],
    notes: (cid: string) => ['romantic', 'notes', cid],
  },
}));

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

import { PairUpScreen } from './components/PairUpScreen';
import { ChallengesList } from './components/ChallengesList';
import { NotesThread } from './components/NotesThread';
import { RomanticPage } from './pages/RomanticPage';
import { useCouple, useSendMischief } from './hooks/useRomantic';

// ── Limpieza ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. PairUpScreen
// ─────────────────────────────────────────────────────────────────────────────

describe('PairUpScreen', () => {
  const defaultProps = {
    familyId: 'family-1',
    currentUserId: 'user-1',
    members: [
      { userId: 'user-1', displayName: 'Ana', role: 'OWNER' as const, joinedAt: new Date().toISOString() },
      { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER' as const, joinedAt: new Date().toISOString() },
    ],
  };

  it('renderiza el título y la lista de candidatos (excluye al usuario actual)', () => {
    wrap(<PairUpScreen {...defaultProps} />);
    expect(screen.getByText(/rincón de pareja/i)).toBeInTheDocument();
    expect(screen.getByText('Marcos')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Ana/i })).not.toBeInTheDocument();
  });

  it('el botón de emparejar está deshabilitado sin selección', () => {
    wrap(<PairUpScreen {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /emparejarm/i });
    expect(btn).toBeDisabled();
  });

  it('seleccionar un miembro habilita el botón', async () => {
    const user = userEvent.setup();
    wrap(<PairUpScreen {...defaultProps} />);

    await user.click(screen.getByText('Marcos'));

    const btn = screen.getByRole('button', { name: /emparejarm/i });
    expect(btn).not.toBeDisabled();
  });

  it('llama a createCouple.mutate con partnerUserId correcto al hacer submit', async () => {
    const user = userEvent.setup();
    wrap(<PairUpScreen {...defaultProps} />);

    await user.click(screen.getByText('Marcos'));
    await user.click(screen.getByRole('button', { name: /emparejarm/i }));

    await waitFor(() => {
      expect(mockCreateCouple).toHaveBeenCalledWith(
        { partnerUserId: 'user-2' },
        expect.any(Object),
      );
    });
  });

  it('muestra mensaje si no hay candidatos', () => {
    wrap(
      <PairUpScreen
        familyId="family-1"
        currentUserId="user-1"
        members={[
          { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
        ]}
      />,
    );
    expect(screen.getByText(/no hay otros miembros/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ChallengesList — render + marcar hecho
// ─────────────────────────────────────────────────────────────────────────────

describe('ChallengesList', () => {
  it('renderiza los retos de la pareja (por challengeKey)', () => {
    wrap(<ChallengesList coupleId="couple-1" />);
    expect(screen.getByText('cocinar-juntos')).toBeInTheDocument();
    expect(screen.getByText('ver-el-amanecer')).toBeInTheDocument();
  });

  it('el reto completado tiene aria-pressed=true', () => {
    wrap(<ChallengesList coupleId="couple-1" />);
    const doneBtn = screen.getByRole('button', { name: /ver-el-amanecer/i });
    expect(doneBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('el reto pendiente tiene aria-pressed=false', () => {
    wrap(<ChallengesList coupleId="couple-1" />);
    const pendingBtn = screen.getByRole('button', { name: /cocinar-juntos/i });
    expect(pendingBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('al hacer clic en un reto pendiente llama a markDone con challengeKey', async () => {
    const user = userEvent.setup();
    wrap(<ChallengesList coupleId="couple-1" />);

    await user.click(screen.getByRole('button', { name: /cocinar-juntos/i }));

    await waitFor(() => {
      expect(mockMarkChallengeDone).toHaveBeenCalledWith(
        { challengeKey: 'cocinar-juntos' },
      );
    });
  });

  it('el reto ya hecho tiene el botón deshabilitado (no se puede desmarcar)', () => {
    wrap(<ChallengesList coupleId="couple-1" />);
    const doneBtn = screen.getByRole('button', { name: /ver-el-amanecer/i });
    expect(doneBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. NotesThread — render + añadir nota
// ─────────────────────────────────────────────────────────────────────────────

describe('NotesThread', () => {
  it('renderiza el hilo de notas (campo body)', () => {
    wrap(<NotesThread coupleId="couple-1" currentUserId="user-1" />);
    expect(screen.getByText('¡Buenos días, cariño!')).toBeInTheDocument();
    expect(screen.getByText('¡Buenos días a ti también! 😘')).toBeInTheDocument();
  });

  it('el textarea de composer está en el documento', () => {
    wrap(<NotesThread coupleId="couple-1" currentUserId="user-1" />);
    expect(screen.getByRole('textbox', { name: /escribe una nota/i })).toBeInTheDocument();
  });

  it('el botón de enviar está deshabilitado con texto vacío', () => {
    wrap(<NotesThread coupleId="couple-1" currentUserId="user-1" />);
    expect(screen.getByRole('button', { name: /enviar nota/i })).toBeDisabled();
  });

  it('escribir en el textarea habilita el botón de enviar', async () => {
    const user = userEvent.setup();
    wrap(<NotesThread coupleId="couple-1" currentUserId="user-1" />);

    await user.type(screen.getByRole('textbox', { name: /escribe una nota/i }), 'Te quiero');

    expect(screen.getByRole('button', { name: /enviar nota/i })).not.toBeDisabled();
  });

  it('al hacer clic en enviar llama a addNote.mutate con { body } correcto', async () => {
    const user = userEvent.setup();
    wrap(<NotesThread coupleId="couple-1" currentUserId="user-1" />);

    await user.type(screen.getByRole('textbox', { name: /escribe una nota/i }), 'Eres lo mejor');
    await user.click(screen.getByRole('button', { name: /enviar nota/i }));

    await waitFor(() => {
      expect(mockAddNote).toHaveBeenCalledWith(
        { body: 'Eres lo mejor' },
        expect.any(Object),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. RomanticPage — botón "Hacer maldad" + feedback visual
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticPage — botón de maldad', () => {
  it('renderiza el botón "Hacer maldad"', () => {
    wrap(<RomanticPage />);
    expect(screen.getByRole('button', { name: /hacer maldad/i })).toBeInTheDocument();
  });

  it('al hacer clic en "Hacer maldad" llama a sendMischief.mutate', async () => {
    const user = userEvent.setup();
    wrap(<RomanticPage />);

    await user.click(screen.getByRole('button', { name: /hacer maldad/i }));

    await waitFor(() => {
      expect(mockSendMischief).toHaveBeenCalled();
    });
  });

  it('muestra el feedback visual tras la maldad exitosa (204 → mensaje fijo)', async () => {
    const user = userEvent.setup();

    // El backend devuelve 204 (void); el frontend muestra un mensaje fijo
    vi.mocked(useSendMischief).mockReturnValueOnce({
      mutate: vi.fn((_, opts) => {
        opts?.onSuccess?.(undefined, undefined, undefined);
      }),
      isPending: false,
    } as unknown as ReturnType<typeof useSendMischief>);

    wrap(<RomanticPage />);
    await user.click(screen.getByRole('button', { name: /hacer maldad/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/maldad enviada/i)).toBeInTheDocument();
    });
  });

  it('muestra la pantalla de emparejar cuando no hay pareja', () => {
    vi.mocked(useCouple).mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useCouple>);

    wrap(<RomanticPage />);
    expect(screen.getByText(/rincón de pareja/i)).toBeInTheDocument();
    expect(screen.getByText(/elige a tu pareja/i)).toBeInTheDocument();
  });
});
