/**
 * RomanticView — vista presentacional del theme `cozy` (estética cuaderno: papel
 * crema pautado, tinta marrón, boli azul, notas pegadas con cinta y chinchetas,
 * casillas a mano y sellos inclinados) del rincón de pareja.
 *
 * Misma funcionalidad y contrato que `../base/RomanticView`: solo cambia la
 * ESTÉTICA (clases `.ck-*` de `shared/theme/themes/cozy.css` + utilidades Tailwind
 * que resuelven a los tokens del theme vía `[data-theme='cozy']`).
 *
 * PRESENTACIONAL PURO: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navigate. Estado de UI local permitido.
 *
 * NOTA sobre la maqueta del kit (`/screens/themes/cozy.tsx`): tenía título y
 * subtítulo hardcodeados ("rincón"), un único "reto" con `mockChallenges[0]` (sin
 * estado real ni toggle) y notitas de mock con `authorName` falso. Aquí TODO sale
 * de props reales: la lista COMPLETA de retos con su estado y sus toggles, el hilo
 * de notas con autoría resuelta desde `members`, y el feedback de maldad real.
 *
 * Default export obligatorio para `React.lazy` en el registry.
 */

import { useEffect, useRef, useState } from 'react';
import type { CoupleNoteDto, FamilyMemberDto } from '@cosasdecasa/contracts';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { RomanticViewProps } from '../types';

/**
 * Paleta de chinchetas del theme (vía CSS vars semánticas) para los cabezales
 * rotativos de las notas. Tipada como `string[]` para que `pinColor` devuelva
 * siempre `string` pese a `noUncheckedIndexedAccess`.
 */
const PIN_VARS: string[] = [
  'var(--color-error)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
];

/** Acceso seguro y tipado a la paleta por índice (evita `T | undefined`). */
function pinColor(i: number): string {
  return PIN_VARS[i % PIN_VARS.length] as string;
}

/** Inclinación sutil alterna para que las notas parezcan pegadas a mano. */
function tilt(i: number): string {
  return `rotate(${i % 2 ? 1.5 : -1.5}deg)`;
}

export default function RomanticView(props: RomanticViewProps) {
  const {
    couple,
    members,
    challenges,
    notes,
    currentUserId,
    isLoading,
    error,
    tab,
    mischiefFeedback,
    isSendingMischief,
    challengesLoading,
    challengesError,
    markingChallengeKey,
    notesLoading,
    notesError,
    isAddingNote,
    addNoteError,
    isCreatingCouple,
    pairUpError,
    onChangeTab,
    onPairUp,
    onToggleChallenge,
    onAddNote,
    onMischief,
  } = props;

  // Sin pareja (couple === null = 404) → pantalla de emparejamiento.
  // La carga/error iniciales tienen prioridad: durante la carga `couple` puede
  // llegar como null y NO debemos mostrar PairUp hasta que el query resuelva.
  if (couple === null && !isLoading && !error) {
    return (
      <PairUpScreen
        candidates={members.filter((m) => m.userId !== currentUserId)}
        isCreating={isCreatingCouple}
        error={pairUpError}
        onPairUp={onPairUp}
      />
    );
  }

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="mx-auto max-w-[520px] space-y-4">
      <ScreenState isLoading={isLoading} error={error}>
        {/* Cabecera manuscrita estilo diario, con el botón de maldad a un lado. */}
        <header className="relative mb-1 text-center">
          <p className="ck-marker text-base opacity-70">— sólo para vosotros ❤ —</p>
          <div className="mt-1 flex items-end justify-center gap-3">
            <h1 className="ck-marker text-5xl leading-none text-accent">rincón</h1>
          </div>
          <button
            type="button"
            className="ck-btn ck-btn-red absolute right-0 top-0 !px-3 !py-1 !text-base"
            onClick={onMischief}
            disabled={isSendingMischief}
            aria-label="Hacer maldad a tu pareja"
          >
            😈 maldad
          </button>
        </header>

        {mischiefFeedback && (
          <div
            role="status"
            aria-live="polite"
            className="ck-card p-3 text-base"
            style={{ background: '#fff0f0' }}
          >
            <span
              className="ck-tape"
              style={{ background: 'rgba(255,150,150,.6)' }}
              aria-hidden
            />
            ✨ {mischiefFeedback}
          </div>
        )}

        {/* Pestañas como pills manuscritos (azul activo / blanco inactivo). */}
        <div
          role="tablist"
          aria-label="Secciones del rincón de pareja"
          className="flex justify-center gap-3"
        >
          {(['challenges', 'notes'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              id={`tab-${t}`}
              aria-controls={`panel-${t}`}
              onClick={() => onChangeTab(t)}
              className={cn(
                'ck-btn min-h-[44px] !text-base',
                tab === t && 'ck-btn-blue',
              )}
            >
              {t === 'challenges' ? '🎯 retos' : '💌 notitas'}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={tab === 'challenges' ? 'panel-challenges' : 'panel-notes'}
          aria-labelledby={tab === 'challenges' ? 'tab-challenges' : 'tab-notes'}
        >
          {tab === 'challenges' ? (
            <ChallengesList
              challenges={challenges}
              isLoading={challengesLoading}
              error={challengesError}
              markingChallengeKey={markingChallengeKey}
              onToggle={onToggleChallenge}
            />
          ) : (
            <NotesThread
              notes={notes}
              members={members}
              currentUserId={currentUserId}
              isLoading={notesLoading}
              error={notesError}
              isAdding={isAddingNote}
              addError={addNoteError}
              onAddNote={onAddNote}
            />
          )}
        </div>
      </ScreenState>
      </div>
    </div>
  );
}

/* ── PairUp ──────────────────────────────────────────────────────────────────── */

function PairUpScreen({
  candidates,
  isCreating,
  error,
  onPairUp,
}: {
  candidates: FamilyMemberDto[];
  isCreating?: boolean;
  error?: string | null;
  onPairUp: (partnerUserId: string) => void;
}) {
  const [pick, setPick] = useState('');

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="mx-auto max-w-[480px]">
      <div className="ck-card space-y-5 p-6 text-center">
        <span className="ck-tape" aria-hidden />
        <div className="text-5xl">💕</div>
        <h1 className="ck-marker text-4xl leading-none text-accent">
          ¡crea tu rincón de pareja!
        </h1>
        <p className="text-base opacity-80">
          Elige a tu persona especial dentro de la familia para compartir retos,
          notas y alguna que otra maldad cariñosa.
        </p>

        {candidates.length === 0 ? (
          <p className="text-base opacity-80">
            No hay otros miembros en la familia todavía. Invita a alguien primero.
          </p>
        ) : (
          <>
            <p className="ck-marker text-left text-2xl text-accent">
              elige a tu pareja:
            </p>
            <ul
              role="listbox"
              aria-label="Miembros de la familia"
              className="space-y-3"
            >
              {candidates.map((m, i) => {
                const selected = pick === m.userId;
                return (
                  <li
                    key={m.userId}
                    role="option"
                    aria-selected={selected}
                    onClick={() => setPick(m.userId)}
                    className={cn(
                      'ck-card relative flex cursor-pointer items-center gap-3 p-3 text-left',
                      selected && 'ring-2 ring-accent',
                    )}
                    style={
                      selected ? { background: '#fff0f0' } : undefined
                    }
                  >
                    {selected ? (
                      <span className="ck-tape" aria-hidden />
                    ) : (
                      <span
                        className="ck-pin"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, #fff, ${pinColor(i)})`,
                        }}
                        aria-hidden
                      />
                    )}
                    <span
                      className="ck-marker grid h-10 w-10 flex-shrink-0 place-items-center overflow-hidden rounded-full text-xl text-text-inverse"
                      style={{ background: pinColor(i) }}
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        m.displayName[0]?.toUpperCase()
                      )}
                    </span>
                    <span className="flex-1 text-lg">{m.displayName}</span>
                    {selected && (
                      <span
                        aria-hidden
                        className="ck-marker text-3xl text-error"
                      >
                        ✓
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p
                role="alert"
                className="ck-marker rounded-card p-3 text-lg text-error"
                style={{ border: '1.5px dashed var(--color-error)' }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              className="ck-btn ck-btn-red w-full disabled:opacity-50"
              disabled={!pick || isCreating}
              onClick={() => pick && onPairUp(pick)}
            >
              {isCreating ? 'creando vínculo…' : '💑 emparejarme'}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

/* ── Retos ───────────────────────────────────────────────────────────────────── */

function ChallengesList({
  challenges,
  isLoading,
  error,
  markingChallengeKey,
  onToggle,
}: {
  challenges: RomanticViewProps['challenges'];
  isLoading?: boolean;
  error?: string | null;
  markingChallengeKey?: string | null;
  onToggle: (challengeKey: string) => void;
}) {
  return (
    <ScreenState
      isLoading={isLoading}
      error={error}
      isEmpty={!challenges.length}
      emptyIcon={<span className="text-4xl">🎯</span>}
      emptyTitle="Aún no hay retos. ¡El backend los generará pronto para vosotros!"
    >
      <ul className="space-y-4" aria-label="Lista de retos de pareja">
        {challenges.map((c, i) => {
          const pending = markingChallengeKey === c.challengeKey;
          const disabled = c.done || pending;
          return (
            <li key={c.id}>
              <div
                className="ck-card relative p-4"
                style={{ transform: tilt(i) }}
              >
                <span
                  className="ck-pin"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, #fff, ${pinColor(i)})`,
                  }}
                  aria-hidden
                />
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.done}
                    disabled={disabled}
                    onClick={() => {
                      if (!c.done) onToggle(c.challengeKey);
                    }}
                    aria-label={
                      c.done
                        ? `Reto completado: "${c.challengeKey}"`
                        : `Marcar "${c.challengeKey}" como hecho`
                    }
                    className={cn(
                      'ck-check mt-1 flex-shrink-0 cursor-pointer',
                      c.done && 'on',
                      disabled && 'cursor-default',
                    )}
                  />
                  <div className="flex-1">
                    <p
                      className={cn(
                        'ck-marker text-2xl text-accent',
                        c.done && 'line-through opacity-60',
                      )}
                    >
                      {c.challengeKey}
                    </p>
                    {c.description && (
                      <p className="mt-1 text-base opacity-80">{c.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="ck-stamp">
                        {c.done ? 'HECHO' : 'EN CURSO'}
                      </span>
                      {c.doneAt && (
                        <time
                          dateTime={c.doneAt}
                          className="text-sm italic opacity-60"
                          title={new Date(c.doneAt).toLocaleString('es-ES')}
                        >
                          {new Date(c.doneAt).toLocaleDateString('es-ES')}
                        </time>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </ScreenState>
  );
}

/* ── Notas ───────────────────────────────────────────────────────────────────── */

function NotesThread({
  notes,
  members,
  currentUserId,
  isLoading,
  error,
  isAdding,
  addError,
  onAddNote,
}: {
  notes: CoupleNoteDto[];
  members: FamilyMemberDto[];
  currentUserId: string;
  isLoading?: boolean;
  error?: string | null;
  isAdding?: boolean;
  addError?: string | null;
  onAddNote: (body: string) => void;
}) {
  const [body, setBody] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje cuando llegan notas nuevas.
  // `scrollTo` no existe en jsdom (entorno de test) → guardamos su presencia.
  useEffect(() => {
    const el = ref.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [notes.length]);

  // El DTO no trae authorName → lo resolvemos desde members.
  const nameById = (authorId: string) =>
    members.find((m) => m.userId === authorId)?.displayName ?? 'Tu pareja';

  function send() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddNote(trimmed);
    setBody('');
  }

  return (
    <ScreenState isLoading={isLoading} error={error}>
      <p className="ck-marker mb-2 text-2xl text-accent">notitas</p>
      <div
        ref={ref}
        className="h-72 space-y-4 overflow-y-auto rounded-card p-3"
        style={{
          background:
            'repeating-linear-gradient(0deg, #fbf4e4 0 31px, #e8d9b8 31px 32px), #fbf4e4',
        }}
        aria-label="Hilo de notas de pareja"
      >
        {notes.map((n, i) => {
          const mine = n.authorId === currentUserId;
          return (
            <div
              key={n.id}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className="ck-card relative max-w-[78%] p-3"
                style={{
                  transform: tilt(i),
                  ...(mine ? { background: '#fff0f0' } : {}),
                }}
              >
                {mine ? (
                  <span className="ck-tape" aria-hidden />
                ) : (
                  <span className="ck-pin" aria-hidden />
                )}
                {!mine && (
                  <p className="ck-marker mb-0.5 text-base opacity-70">
                    — {nameById(n.authorId)}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-lg">{n.body}</p>
              </div>
            </div>
          );
        })}
        {!notes.length && (
          <p className="pt-8 text-center text-base opacity-70">
            Empieza la conversación 💌
          </p>
        )}
      </div>

      {addError && (
        <p role="alert" className="ck-marker mt-2 text-base text-error">
          {addError}
        </p>
      )}

      <div className="mt-3 flex items-end gap-2">
        <input
          className="ck-input flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="escribe una nota…"
          aria-label="Escribe una nota para tu pareja"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && body.trim()) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          className="ck-btn ck-btn-blue flex-shrink-0 !text-base disabled:opacity-50"
          onClick={send}
          disabled={!body.trim() || isAdding}
          aria-label="Enviar nota"
        >
          {isAdding ? '…' : 'enviar'}
        </button>
      </div>
    </ScreenState>
  );
}
