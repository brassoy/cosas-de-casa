/**
 * RomanticView — vista presentacional (theme `base`, estética shadcn) del rincón
 * de pareja. Portada del componente base del kit Lovable (`/screens/romantic.tsx`)
 * y reconciliada con los DTOs reales.
 *
 * PRESENTACIONAL PURO: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. Toda la lógica vive en el container `RomanticPage`.
 *
 * Default export obligatorio para `React.lazy` en el registry.
 */

import { useEffect, useRef, useState } from 'react';
import type { CoupleNoteDto, FamilyMemberDto } from '@cosasdecasa/contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/checkbox';
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
    <div className="mx-auto max-w-[640px] space-y-4 p-6">
      <ScreenState isLoading={isLoading} error={error}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">💕 Rincón de pareja</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={onMischief}
            disabled={isSendingMischief}
            aria-label="Hacer maldad a tu pareja"
          >
            😈 Hacer maldad
          </Button>
        </div>

        {mischiefFeedback && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-card border border-accent bg-accent-subtle px-4 py-3 text-sm font-medium text-foreground"
          >
            ✨ {mischiefFeedback}
          </p>
        )}

        <div
          role="tablist"
          aria-label="Secciones del rincón de pareja"
          className="grid grid-cols-2 overflow-hidden rounded-md border border-border"
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
                'min-h-[44px] py-2 text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-accent text-text-inverse'
                  : 'text-text-muted hover:bg-surface-raised',
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
    <div className="mx-auto max-w-[480px] space-y-4 p-6">
      <Card className="space-y-5 p-6 text-center">
        <div className="text-5xl">💕</div>
        <h1 className="text-2xl font-bold">¡Crea tu rincón de pareja!</h1>
        <p className="text-sm text-text-muted">
          Elige a tu persona especial dentro de la familia para compartir retos,
          notas y alguna que otra maldad cariñosa.
        </p>

        {candidates.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay otros miembros en la familia todavía. Invita a alguien primero.
          </p>
        ) : (
          <>
            <p className="text-left text-sm font-semibold">Elige a tu pareja:</p>
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
                      'flex cursor-pointer items-center gap-3 rounded-card border-2 p-3 text-left transition-colors',
                      selected
                        ? 'border-accent bg-accent-subtle'
                        : 'border-border bg-surface',
                    )}
                  >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-subtle">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-accent">
                          {m.displayName[0]?.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 font-medium">{m.displayName}</span>
                    {selected && (
                      <span aria-hidden className="font-bold text-accent">
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
                className="rounded-md border border-error bg-error/10 p-3 text-sm text-error"
              >
                {error}
              </p>
            )}

            <Button
              className="w-full"
              disabled={!pick || isCreating}
              onClick={() => pick && onPairUp(pick)}
            >
              {isCreating ? 'Creando vínculo…' : '💑 Emparejarme'}
            </Button>
          </>
        )}
      </Card>
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
      <ul className="space-y-2" aria-label="Lista de retos de pareja">
        {challenges.map((c) => {
          const pending = markingChallengeKey === c.challengeKey;
          return (
            <li key={c.id}>
              <Card className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={c.done}
                  disabled={c.done || pending}
                  onCheckedChange={() => {
                    if (!c.done) onToggle(c.challengeKey);
                  }}
                  aria-label={
                    c.done
                      ? `Reto completado: "${c.challengeKey}"`
                      : `Marcar "${c.challengeKey}" como hecho`
                  }
                  className="h-5 w-5"
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      c.done && 'text-text-muted line-through',
                    )}
                  >
                    {c.challengeKey}
                  </p>
                  {c.description && (
                    <p className="text-sm text-text-muted">{c.description}</p>
                  )}
                  {c.doneAt && (
                    <time
                      dateTime={c.doneAt}
                      className="text-xs italic text-text-muted"
                      title={new Date(c.doneAt).toLocaleString('es-ES')}
                    >
                      Completado el {new Date(c.doneAt).toLocaleDateString('es-ES')}
                    </time>
                  )}
                </div>
              </Card>
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
      <div
        ref={ref}
        className="h-72 space-y-2 overflow-y-auto rounded-card bg-surface-raised p-3"
        aria-label="Hilo de notas de pareja"
      >
        {notes.map((n) => {
          const mine = n.authorId === currentUserId;
          return (
            <div key={n.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[78%] rounded-2xl px-3 py-2 text-sm',
                  mine ? 'bg-accent text-text-inverse' : 'bg-surface',
                )}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] opacity-70">{nameById(n.authorId)}</p>
                )}
                <p className="whitespace-pre-wrap">{n.body}</p>
              </div>
            </div>
          );
        })}
        {!notes.length && (
          <p className="pt-8 text-center text-sm text-text-muted">
            Empieza la conversación 💌
          </p>
        )}
      </div>

      {addError && (
        <p role="alert" className="mt-2 text-xs text-error">
          {addError}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <Input
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
        <Button onClick={send} disabled={!body.trim() || isAdding} aria-label="Enviar nota">
          {isAdding ? '…' : 'Enviar'}
        </Button>
      </div>
    </ScreenState>
  );
}
