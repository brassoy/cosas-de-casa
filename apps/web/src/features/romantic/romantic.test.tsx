/**
 * Tests de la feature romantic (rincón de pareja) — arquitectura container/view.
 *
 * `RomanticView` (theme `base`) es PRESENTACIONAL PURO: se prueba directamente
 * con props, sin mockear hooks ni stores. El cableado real vive en el container
 * `RomanticPage` (que delega en ThemeView/registry, cubierto por la fase de
 * theming).
 *
 * Cubre sobre la vista base:
 *  1. PairUp (couple === null) — render, selección, submit, sin candidatos.
 *  2. Retos — render, marcado, item ya hecho deshabilitado.
 *  3. Notas — render (resolución de autor desde members), composer, envío.
 *  4. Maldad — botón + feedback visual (status).
 *  5. Estados — loading/error iniciales tienen prioridad sobre PairUp.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  CoupleDto,
  CoupleChallengeDto,
  CoupleNoteDto,
  FamilyMemberDto,
} from '@cosasdecasa/contracts';

import RomanticView from './views/base/RomanticView';
import type { RomanticViewProps } from './views/types';

// ── Fixtures ────────────────────────────────────────────────────────────────────

const members: FamilyMemberDto[] = [
  { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
  { userId: 'user-2', displayName: 'Marcos', role: 'MEMBER', joinedAt: new Date().toISOString() },
];

const couple: CoupleDto = {
  id: 'couple-1',
  familyId: 'family-1',
  userA: 'user-1',
  userB: 'user-2',
  createdAt: new Date().toISOString(),
};

const challenges: CoupleChallengeDto[] = [
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

const notes: CoupleNoteDto[] = [
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

function makeProps(overrides: Partial<RomanticViewProps> = {}): RomanticViewProps {
  return {
    couple,
    members,
    challenges,
    notes,
    currentUserId: 'user-1',
    tab: 'challenges',
    onChangeTab: vi.fn(),
    onPairUp: vi.fn(),
    onToggleChallenge: vi.fn(),
    onAddNote: vi.fn(),
    onMischief: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. PairUp (couple === null)
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — PairUp (couple === null)', () => {
  it('renderiza el título y los candidatos (excluye al usuario actual)', () => {
    render(<RomanticView {...makeProps({ couple: null })} />);
    expect(screen.getByText(/rincón de pareja/i)).toBeInTheDocument();
    expect(screen.getByText('Marcos')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Ana/i })).not.toBeInTheDocument();
  });

  it('el botón de emparejar está deshabilitado sin selección', () => {
    render(<RomanticView {...makeProps({ couple: null })} />);
    expect(screen.getByRole('button', { name: /emparejarm/i })).toBeDisabled();
  });

  it('seleccionar un candidato habilita el botón y llama a onPairUp', async () => {
    const user = userEvent.setup();
    const onPairUp = vi.fn();
    render(<RomanticView {...makeProps({ couple: null, onPairUp })} />);

    await user.click(screen.getByText('Marcos'));
    const btn = screen.getByRole('button', { name: /emparejarm/i });
    expect(btn).not.toBeDisabled();

    await user.click(btn);
    await waitFor(() => expect(onPairUp).toHaveBeenCalledWith('user-2'));
  });

  it('muestra mensaje cuando no hay candidatos', () => {
    render(
      <RomanticView
        {...makeProps({
          couple: null,
          members: [
            { userId: 'user-1', displayName: 'Ana', role: 'OWNER', joinedAt: new Date().toISOString() },
          ],
        })}
      />,
    );
    expect(screen.getByText(/no hay otros miembros/i)).toBeInTheDocument();
  });

  it('muestra el error de emparejamiento', () => {
    render(
      <RomanticView {...makeProps({ couple: null, pairUpError: 'Ya tienes pareja' })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/ya tienes pareja/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Retos
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Retos', () => {
  it('renderiza los retos por challengeKey', () => {
    render(<RomanticView {...makeProps({ tab: 'challenges' })} />);
    expect(screen.getByText('cocinar-juntos')).toBeInTheDocument();
    expect(screen.getByText('ver-el-amanecer')).toBeInTheDocument();
  });

  it('marca un reto pendiente llamando a onToggleChallenge con su key', async () => {
    const user = userEvent.setup();
    const onToggleChallenge = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'challenges', onToggleChallenge })} />);

    await user.click(
      screen.getByRole('checkbox', { name: /marcar "cocinar-juntos" como hecho/i }),
    );
    await waitFor(() =>
      expect(onToggleChallenge).toHaveBeenCalledWith('cocinar-juntos'),
    );
  });

  it('el reto ya hecho está deshabilitado (no se puede desmarcar)', () => {
    render(<RomanticView {...makeProps({ tab: 'challenges' })} />);
    expect(
      screen.getByRole('checkbox', { name: /reto completado: "ver-el-amanecer"/i }),
    ).toBeDisabled();
  });

  it('muestra el estado vacío sin retos', () => {
    render(<RomanticView {...makeProps({ tab: 'challenges', challenges: [] })} />);
    expect(screen.getByText(/aún no hay retos/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Notas
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Notas', () => {
  it('renderiza el hilo y resuelve el nombre del autor ajeno desde members', () => {
    render(<RomanticView {...makeProps({ tab: 'notes' })} />);
    expect(screen.getByText('¡Buenos días, cariño!')).toBeInTheDocument();
    expect(screen.getByText('¡Buenos días a ti también! 😘')).toBeInTheDocument();
    // La nota de user-2 (no soy yo) muestra el displayName resuelto.
    expect(screen.getByText('Marcos')).toBeInTheDocument();
  });

  it('el botón de enviar está deshabilitado con texto vacío', () => {
    render(<RomanticView {...makeProps({ tab: 'notes' })} />);
    expect(screen.getByRole('button', { name: /enviar nota/i })).toBeDisabled();
  });

  it('escribir habilita el envío y llama a onAddNote con el body', async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'notes', onAddNote })} />);

    const input = screen.getByRole('textbox', { name: /escribe una nota/i });
    await user.type(input, 'Eres lo mejor');
    const send = screen.getByRole('button', { name: /enviar nota/i });
    expect(send).not.toBeDisabled();

    await user.click(send);
    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('Eres lo mejor'));
  });

  it('muestra el error de añadir nota', () => {
    render(
      <RomanticView
        {...makeProps({ tab: 'notes', addNoteError: 'No se ha podido enviar la nota.' })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/no se ha podido enviar la nota/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Maldad
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Maldad', () => {
  it('el botón "Hacer maldad" llama a onMischief', async () => {
    const user = userEvent.setup();
    const onMischief = vi.fn();
    render(<RomanticView {...makeProps({ onMischief })} />);

    await user.click(screen.getByRole('button', { name: /hacer maldad/i }));
    await waitFor(() => expect(onMischief).toHaveBeenCalled());
  });

  it('muestra el feedback de maldad (role=status)', () => {
    render(<RomanticView {...makeProps({ mischiefFeedback: '¡Maldad enviada! 😈' })} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/maldad enviada/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Estados (prioridad de carga/error sobre PairUp)
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — estados', () => {
  it('durante la carga no muestra PairUp aunque couple sea null', () => {
    render(<RomanticView {...makeProps({ couple: null, isLoading: true })} />);
    expect(screen.queryByText(/¡crea tu rincón de pareja!/i)).not.toBeInTheDocument();
  });

  it('en error no muestra PairUp aunque couple sea null', () => {
    render(
      <RomanticView
        {...makeProps({ couple: null, error: 'No se ha podido cargar.' })}
      />,
    );
    expect(screen.queryByText(/¡crea tu rincón de pareja!/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no se ha podido cargar/i)).toBeInTheDocument();
  });
});
