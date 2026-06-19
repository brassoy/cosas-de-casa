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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  CoupleDto,
  CoupleChallengeDto,
  CoupleNoteDto,
  ChallengeCatalogEntryDto,
  FamilyMemberDto,
} from '@cosasdecasa/contracts';

import RomanticView from './views/base/RomanticView';
import RomanticViewCozy from './views/cozy/RomanticView';
import RomanticViewCozysitcom from './views/cozysitcom/RomanticView';
import RomanticViewSpringfield from './views/springfield/RomanticView';
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

const catalog: ChallengeCatalogEntryDto[] = [
  { key: 'cocinar-juntos', description: 'Elegid una receta que nunca hayáis hecho.' },
  { key: 'cita-sorpresa', description: 'Organiza una cita sorpresa para tu pareja.' },
  { key: 'carta-amor', description: 'Escribe una carta de amor a mano.' },
];

function makeProps(overrides: Partial<RomanticViewProps> = {}): RomanticViewProps {
  return {
    couple,
    members,
    challenges,
    notes,
    currentUserId: 'user-1',
    tab: 'challenges',
    challengeCatalog: catalog,
    onChangeTab: vi.fn(),
    onPairUp: vi.fn(),
    onToggleChallenge: vi.fn(),
    onLoadCatalog: vi.fn(),
    onAddChallenge: vi.fn(),
    onAddNote: vi.fn(),
    onDeleteNote: vi.fn(),
    onMischief: vi.fn(),
    onDissolveCouple: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // `window.confirm` por defecto confirma (true) salvo que un test lo cambie.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
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
// 4b. Añadir reto (catálogo)
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Añadir reto (catálogo)', () => {
  it('abrir el selector carga el catálogo (onLoadCatalog) y lo muestra', async () => {
    const user = userEvent.setup();
    const onLoadCatalog = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'challenges', onLoadCatalog })} />);

    await user.click(screen.getByRole('button', { name: /añadir reto del catálogo/i }));
    expect(onLoadCatalog).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('list', { name: /retos disponibles para añadir/i }),
    ).toBeInTheDocument();
  });

  it('filtra del catálogo los retos ya añadidos a la pareja', async () => {
    const user = userEvent.setup();
    // `challenges` (fixture) ya incluye 'cocinar-juntos' → no debe ofrecerse.
    render(<RomanticView {...makeProps({ tab: 'challenges' })} />);

    await user.click(screen.getByRole('button', { name: /añadir reto del catálogo/i }));
    const list = screen.getByRole('list', { name: /retos disponibles para añadir/i });
    expect(within(list).queryByText('cocinar-juntos')).not.toBeInTheDocument();
    expect(within(list).getByText('cita-sorpresa')).toBeInTheDocument();
    expect(within(list).getByText('carta-amor')).toBeInTheDocument();
  });

  it('añadir un reto del catálogo llama a onAddChallenge con su key', async () => {
    const user = userEvent.setup();
    const onAddChallenge = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'challenges', onAddChallenge })} />);

    await user.click(screen.getByRole('button', { name: /añadir reto del catálogo/i }));
    await user.click(screen.getByRole('button', { name: /añadir reto "cita-sorpresa"/i }));
    await waitFor(() => expect(onAddChallenge).toHaveBeenCalledWith('cita-sorpresa'));
  });

  it('muestra el estado vacío cuando todos los retos ya están añadidos', async () => {
    const user = userEvent.setup();
    // El catálogo entero coincide con los retos ya añadidos.
    const allAdded: CoupleChallengeDto[] = catalog.map((entry, i) => ({
      id: `ch-${i}`,
      coupleId: 'couple-1',
      challengeKey: entry.key,
      description: entry.description,
      done: false,
      doneAt: null,
    }));
    render(
      <RomanticView {...makeProps({ tab: 'challenges', challenges: allAdded })} />,
    );

    await user.click(screen.getByRole('button', { name: /añadir reto del catálogo/i }));
    expect(screen.getByText(/ya habéis añadido todos los retos/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4c. Borrar nota
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Borrar nota', () => {
  it('borrar una nota (confirmada) llama a onDeleteNote con su id', async () => {
    const user = userEvent.setup();
    const onDeleteNote = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'notes', onDeleteNote })} />);

    const buttons = screen.getAllByRole('button', { name: /borrar nota/i });
    await user.click(buttons[0]!);
    await waitFor(() => expect(onDeleteNote).toHaveBeenCalledWith('note-1'));
  });

  it('si el usuario cancela el confirm, NO llama a onDeleteNote', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    const onDeleteNote = vi.fn();
    render(<RomanticView {...makeProps({ tab: 'notes', onDeleteNote })} />);

    await user.click(screen.getAllByRole('button', { name: /borrar nota/i })[0]!);
    expect(onDeleteNote).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4d. Disolver pareja
// ─────────────────────────────────────────────────────────────────────────────

describe('RomanticView — Disolver pareja', () => {
  it('disolver (confirmado) llama a onDissolveCouple', async () => {
    const user = userEvent.setup();
    const onDissolveCouple = vi.fn();
    render(<RomanticView {...makeProps({ onDissolveCouple })} />);

    await user.click(screen.getByRole('button', { name: /disolver la pareja/i }));
    await waitFor(() => expect(onDissolveCouple).toHaveBeenCalledTimes(1));
  });

  it('si el usuario cancela el confirm, NO disuelve la pareja', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    const onDissolveCouple = vi.fn();
    render(<RomanticView {...makeProps({ onDissolveCouple })} />);

    await user.click(screen.getByRole('button', { name: /disolver la pareja/i }));
    expect(onDissolveCouple).not.toHaveBeenCalled();
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. Paridad entre themes — las 3 acciones nuevas funcionan en los 4 themes
// ─────────────────────────────────────────────────────────────────────────────

const themedViews = [
  ['base', RomanticView],
  ['cozy', RomanticViewCozy],
  ['cozysitcom', RomanticViewCozysitcom],
  ['springfield', RomanticViewSpringfield],
] as const;

describe.each(themedViews)('RomanticView[%s] — paridad de acciones nuevas', (_name, View) => {
  it('añadir reto: carga el catálogo y añade con su key', async () => {
    const user = userEvent.setup();
    const onLoadCatalog = vi.fn();
    const onAddChallenge = vi.fn();
    render(
      <View {...makeProps({ tab: 'challenges', onLoadCatalog, onAddChallenge })} />,
    );

    await user.click(screen.getByRole('button', { name: /añadir reto del catálogo/i }));
    expect(onLoadCatalog).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /añadir reto "cita-sorpresa"/i }));
    await waitFor(() => expect(onAddChallenge).toHaveBeenCalledWith('cita-sorpresa'));
  });

  it('borrar nota: confirma y llama a onDeleteNote con su id', async () => {
    const user = userEvent.setup();
    const onDeleteNote = vi.fn();
    render(<View {...makeProps({ tab: 'notes', onDeleteNote })} />);

    await user.click(screen.getAllByRole('button', { name: /borrar nota/i })[0]!);
    await waitFor(() => expect(onDeleteNote).toHaveBeenCalledWith('note-1'));
  });

  it('disolver pareja: confirma y llama a onDissolveCouple', async () => {
    const user = userEvent.setup();
    const onDissolveCouple = vi.fn();
    render(<View {...makeProps({ onDissolveCouple })} />);

    await user.click(screen.getByRole('button', { name: /disolver la pareja/i }));
    await waitFor(() => expect(onDissolveCouple).toHaveBeenCalledTimes(1));
  });
});
