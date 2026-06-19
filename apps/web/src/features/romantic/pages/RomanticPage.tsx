/**
 * RomanticPage — CONTAINER de la ruta /family/$familyId/romantic.
 *
 * Cablea TODA la lógica real una sola vez (hooks, mutaciones, store, guards) y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo (`romantic`). Las vistas son tontas: props in / callbacks out.
 *
 * Funcionalidad conservada:
 *  - couple === null (404) → PairUp dentro de la vista.
 *  - Pestañas Retos | Notas (estado en `useRomanticStore`).
 *  - Maldad: POST 204 → feedback fijo que se borra a los 4 s.
 *  - Optimistic challenge/note (vive en los onSuccess de los hooks).
 */

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useFamilyMembers } from '@/features/family/hooks/useFamily';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useCouple,
  useChallenges,
  useCoupleNotes,
  useChallengeCatalog,
  useCreateCouple,
  useMarkChallengeDone,
  useAddChallenge,
  useAddNote,
  useDeleteNote,
  useDissolveCouple,
  useSendMischief,
} from '../hooks/useRomantic';
import { useRomanticStore } from '../store/romantic.store';
import type { RomanticViewProps } from '../views/types';

export function RomanticPage() {
  const { familyId } = useParams({ strict: false }) as { familyId?: string };
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const resolvedFamilyId = familyId ?? activeFamily?.id;

  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? '';

  const activeTab = useRomanticStore((s) => s.activeTab);
  const setActiveTab = useRomanticStore((s) => s.setActiveTab);

  // ── Datos ──────────────────────────────────────────────────────────────────
  const { data: couple, isLoading: coupleLoading, error: coupleError } = useCouple(resolvedFamilyId);
  const { data: members = [] } = useFamilyMembers(resolvedFamilyId);

  const coupleId = couple?.id ?? '';
  const {
    data: challenges = [],
    isLoading: challengesLoading,
    error: challengesError,
  } = useChallenges(coupleId);
  const {
    data: notes = [],
    isLoading: notesLoading,
    error: notesError,
  } = useCoupleNotes(coupleId);

  // ── Estado de UI del container ───────────────────────────────────────────────
  const [mischiefFeedback, setMischiefFeedback] = useState<string | null>(null);
  const [pairUpError, setPairUpError] = useState<string | null>(null);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  // El catálogo se carga bajo demanda (al abrir el selector de "añadir reto").
  const [catalogEnabled, setCatalogEnabled] = useState(false);

  // ── Datos bajo demanda: catálogo de retos ────────────────────────────────────
  const {
    data: catalog = [],
    isLoading: catalogLoading,
    error: catalogError,
  } = useChallengeCatalog(catalogEnabled);

  // ── Mutaciones ───────────────────────────────────────────────────────────────
  const createCouple = useCreateCouple(resolvedFamilyId ?? '');
  const markDone = useMarkChallengeDone(coupleId);
  const addChallenge = useAddChallenge(coupleId);
  const addNote = useAddNote(coupleId);
  const deleteNote = useDeleteNote(coupleId);
  const dissolveCouple = useDissolveCouple(coupleId, resolvedFamilyId ?? '');
  const sendMischief = useSendMischief(coupleId);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handlePairUp(partnerUserId: string) {
    setPairUpError(null);
    createCouple.mutate(
      { partnerUserId },
      {
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido crear la pareja. Inténtalo de nuevo.';
          setPairUpError(msg);
        },
      },
    );
  }

  function handleToggleChallenge(challengeKey: string) {
    markDone.mutate(
      { challengeKey },
      {
        onError: () =>
          toast.error('No se ha podido marcar el reto. Inténtalo de nuevo.'),
      },
    );
  }

  function handleLoadCatalog() {
    // Activa la query del catálogo la primera vez que se abre el selector.
    setCatalogEnabled(true);
  }

  function handleAddChallenge(challengeKey: string) {
    addChallenge.mutate(
      { challengeKey },
      {
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido añadir el reto. Inténtalo de nuevo.';
          toast.error(msg);
        },
      },
    );
  }

  function handleAddNote(body: string) {
    setAddNoteError(null);
    addNote.mutate(
      { body },
      {
        onError: () =>
          setAddNoteError('No se ha podido enviar la nota. Inténtalo de nuevo.'),
      },
    );
  }

  function handleDeleteNote(noteId: string) {
    deleteNote.mutate(noteId, {
      onError: () =>
        toast.error('No se ha podido borrar la nota. Inténtalo de nuevo.'),
    });
  }

  function handleDissolveCouple() {
    if (!couple) return;
    dissolveCouple.mutate(undefined, {
      onSuccess: () => toast.success('Pareja disuelta.'),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido disolver la pareja. Inténtalo de nuevo.';
        toast.error(msg);
      },
    });
  }

  function handleMischief() {
    if (!couple) return;
    setMischiefFeedback(null);
    sendMischief.mutate(undefined, {
      onSuccess: () => {
        setMischiefFeedback('¡Maldad enviada! 😈');
        setTimeout(() => setMischiefFeedback(null), 4000);
      },
      onError: () =>
        setMischiefFeedback('Algo ha salido mal con la maldad… inténtalo de nuevo.'),
    });
  }

  // ── Guard: sin familia activa (precondición dura, no es un estado de pantalla) ──
  if (!resolvedFamilyId) {
    return (
      <div className="flex h-[60dvh] items-center justify-center">
        <p className="text-text-muted">No hay ninguna familia activa.</p>
      </div>
    );
  }

  // ── Contrato → vista ─────────────────────────────────────────────────────────
  // couple === undefined mientras carga; lo mapeamos a null sólo cuando el query
  // ha resuelto sin pareja. Distinguimos carga (isLoading) de "sin pareja" (null).
  const props: RomanticViewProps = {
    couple: couple ?? null,
    members,
    challenges,
    notes,
    currentUserId,
    isLoading: coupleLoading,
    error: coupleError ? 'No se ha podido cargar la información de pareja.' : null,
    tab: activeTab,
    mischiefFeedback,
    isSendingMischief: sendMischief.isPending,
    isDissolving: dissolveCouple.isPending,
    challengesLoading,
    challengesError: challengesError ? 'No se han podido cargar los retos.' : null,
    markingChallengeKey: markDone.isPending ? markDone.variables?.challengeKey ?? null : null,
    challengeCatalog: catalog,
    isLoadingCatalog: catalogLoading,
    catalogError: catalogError ? 'No se ha podido cargar el catálogo de retos.' : null,
    addingChallengeKey: addChallenge.isPending
      ? addChallenge.variables?.challengeKey ?? null
      : null,
    notesLoading,
    notesError: notesError ? 'No se han podido cargar las notas.' : null,
    isAddingNote: addNote.isPending,
    addNoteError,
    deletingNoteId: deleteNote.isPending ? deleteNote.variables ?? null : null,
    isCreatingCouple: createCouple.isPending,
    pairUpError,
    onChangeTab: setActiveTab,
    onPairUp: handlePairUp,
    onToggleChallenge: handleToggleChallenge,
    onLoadCatalog: handleLoadCatalog,
    onAddChallenge: handleAddChallenge,
    onAddNote: handleAddNote,
    onDeleteNote: handleDeleteNote,
    onMischief: handleMischief,
    onDissolveCouple: handleDissolveCouple,
  };

  return <ThemeView screen="romantic" props={props} />;
}
