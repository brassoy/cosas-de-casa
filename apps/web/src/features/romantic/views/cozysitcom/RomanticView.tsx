/**
 * RomanticView — vista presentacional del theme `cozysitcom` (retro cálido,
 * madera y mostaza, sitcom 70s) del rincón de pareja.
 *
 * Misma funcionalidad y contrato que `../base/RomanticView`: solo cambia la
 * ESTÉTICA (clases `.cz-*` de `shared/theme/themes/cozysitcom.css` + utilidades
 * Tailwind que resuelven a los tokens del theme vía `[data-theme='cozysitcom']`).
 *
 * PRESENTACIONAL PURO: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navigate. Estado de UI local permitido.
 *
 * Default export obligatorio para `React.lazy` en el registry.
 */

import { useEffect, useRef, useState } from 'react';
import type { CoupleNoteDto, FamilyMemberDto } from '@cosasdecasa/contracts';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { RomanticViewProps } from '../types';

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
    <div className="cz mx-auto max-w-[520px] space-y-4 px-5">
      <ScreenState isLoading={isLoading} error={error}>
        {/* Cabecera estilo cintillo de madera + cinta a rayas. */}
        <header className="cz-pop">
          <div className="cz-wood mb-2 inline-block">
            <p className="cz-serif text-base">Rincón de pareja</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <h1 className="cz-serif text-4xl leading-none">💕 Sólo para vosotros</h1>
            <button
              type="button"
              className="cz-btn-garnet text-xs"
              onClick={onMischief}
              disabled={isSendingMischief}
              aria-label="Hacer maldad a tu pareja"
            >
              😈 Maldad
            </button>
          </div>
          <div className="cz-stripe mt-3" />
        </header>

        {mischiefFeedback && (
          <p
            role="status"
            aria-live="polite"
            className="cz-frame cz-pop text-sm font-bold"
          >
            ✨ {mischiefFeedback}
          </p>
        )}

        {/* Pestañas como pestañas de carpeta retro. */}
        <div
          role="tablist"
          aria-label="Secciones del rincón de pareja"
          className="grid grid-cols-2 gap-2"
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
                'cz-serif min-h-[44px] text-sm',
                tab === t ? 'cz-btn-denim' : 'cz-btn-ghost',
              )}
            >
              {t === 'challenges' ? '🎯 Retos' : '💌 Notas'}
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
    <div className="cz mx-auto max-w-[480px] px-5">
      <div className="cz-frame cz-pop space-y-5 text-center">
        <div className="text-5xl">💕</div>
        <h1 className="cz-serif text-3xl leading-none">¡Crea tu rincón de pareja!</h1>
        <p className="text-sm opacity-70">
          Elige a tu persona especial dentro de la familia para compartir retos,
          notas y alguna que otra maldad cariñosa.
        </p>

        {candidates.length === 0 ? (
          <p className="text-sm opacity-70">
            No hay otros miembros en la familia todavía. Invita a alguien primero.
          </p>
        ) : (
          <>
            <p className="cz-serif text-left text-base">Elige a tu pareja:</p>
            <ul
              role="listbox"
              aria-label="Miembros de la familia"
              className="space-y-2"
            >
              {candidates.map((m) => {
                const selected = pick === m.userId;
                return (
                  <li
                    key={m.userId}
                    role="option"
                    aria-selected={selected}
                    onClick={() => setPick(m.userId)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-card p-3 text-left transition-colors',
                      selected
                        ? 'cz-paper ring-2 ring-[color:var(--color-error)]'
                        : 'cz-paper',
                    )}
                  >
                    <span
                      className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white font-extrabold text-white shadow"
                      style={{
                        background: selected
                          ? 'var(--color-error)'
                          : 'var(--color-accent)',
                      }}
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="cz-serif">
                          {m.displayName[0]?.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="cz-serif flex-1">{m.displayName}</span>
                    {selected && (
                      <span
                        aria-hidden
                        className="cz-serif text-lg"
                        style={{ color: 'var(--color-error)' }}
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
                className="rounded-md p-3 text-sm font-bold"
                style={{
                  color: 'var(--color-error)',
                  border: '2px dashed var(--color-error)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              className="cz-btn-denim w-full disabled:opacity-50"
              disabled={!pick || isCreating}
              onClick={() => pick && onPairUp(pick)}
            >
              {isCreating ? 'Creando vínculo…' : '💑 Emparejarme'}
            </button>
          </>
        )}
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
      <ul className="space-y-3" aria-label="Lista de retos de pareja">
        {challenges.map((c) => {
          const pending = markingChallengeKey === c.challengeKey;
          const disabled = c.done || pending;
          return (
            <li key={c.id}>
              <div className="cz-frame cz-pop flex items-center gap-3">
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
                    'cz-check flex-shrink-0 cursor-pointer',
                    c.done && 'on',
                    disabled && 'cursor-default',
                  )}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      'cz-serif text-base',
                      c.done && 'line-through opacity-60',
                    )}
                  >
                    {c.challengeKey}
                  </p>
                  {c.description && (
                    <p className="text-sm opacity-70">{c.description}</p>
                  )}
                  {c.doneAt && (
                    <time
                      dateTime={c.doneAt}
                      className="text-xs italic opacity-60"
                      title={new Date(c.doneAt).toLocaleString('es-ES')}
                    >
                      Completado el {new Date(c.doneAt).toLocaleDateString('es-ES')}
                    </time>
                  )}
                </div>
                {c.done ? (
                  <span className="cz-tag" style={{ background: 'var(--color-success)', color: 'var(--color-text-inverse)' }}>
                    Hecho
                  </span>
                ) : (
                  <span className="cz-stamp">EN CURSO</span>
                )}
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
      <p className="cz-serif mb-2 text-xl">Notas</p>
      <div
        ref={ref}
        className="cz-wallpaper h-72 space-y-3 overflow-y-auto rounded-card p-3"
        aria-label="Hilo de notas de pareja"
      >
        {notes.map((n) => {
          const mine = n.authorId === currentUserId;
          return (
            <div key={n.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'cz-frame max-w-[78%] !p-3',
                  mine && 'text-[color:var(--color-text-inverse)]',
                )}
                style={mine ? { background: 'var(--color-accent)' } : undefined}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-bold opacity-60">
                    — {nameById(n.authorId)}
                  </p>
                )}
                <p className="cz-serif whitespace-pre-wrap text-sm">{n.body}</p>
              </div>
            </div>
          );
        })}
        {!notes.length && (
          <p className="cz-serif pt-8 text-center text-sm opacity-70">
            Empieza la conversación 💌
          </p>
        )}
      </div>

      {addError && (
        <p
          role="alert"
          className="mt-2 text-xs font-bold"
          style={{ color: 'var(--color-error)' }}
        >
          {addError}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="cz-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe una nota…"
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
          className="cz-btn-mustard flex-shrink-0 disabled:opacity-50"
          onClick={send}
          disabled={!body.trim() || isAdding}
          aria-label="Enviar nota"
        >
          {isAdding ? '…' : 'Enviar'}
        </button>
      </div>
    </ScreenState>
  );
}
