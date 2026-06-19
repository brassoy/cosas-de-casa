/**
 * PlanDetailPage — CONTAINER del detalle de un plan.
 *
 * Cablea TODA la lógica real una sola vez y delega el render en `ThemeView`:
 *   - carga del plan (`usePlan`) y de las familias amigas (`useFriendFamilies`),
 *   - RSVP (`useSetRsvp`), compartir (`useSharePlan`), eliminar (`useDeletePlan`),
 *   - chat realtime (`usePlanChat` + `buildParticipantNames`): suscripción,
 *     dedup y resolución de nombres viven aquí; la vista solo pinta `messages`
 *     y emite `onSendMessage`,
 *   - detección de owner, filtrado de familias amigas por `sharedWithFamilyIds`,
 *   - estados de error por acción y navegación.
 *
 * `usePlanChat` se llama incondicionalmente en el container (regla de hooks);
 * antes vivía en un subcomponente `ChatThread` que el container ya no necesita
 * porque la vista presentacional pinta el chat.
 */

import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFriendFamilies } from '@/features/friends/hooks/useFriends';
import {
  usePlan,
  useSetRsvp,
  useSharePlan,
  useDeletePlan,
  useUpdatePlan,
  useDeletePlace,
  useSavedPlaces,
} from '../hooks/usePlans';
import { usePlanChat, buildParticipantNames } from '../hooks/usePlanChat';
import type { PlanRsvpStatus, UpdatePlanInput } from '../contracts';
import type { PlanDetailViewProps } from '../views/types';
import { ApiRequestError } from '@/shared/lib/api';

export function PlanDetailPage() {
  const navigate = useNavigate();
  const { planId } = useParams({ from: '/plans/$planId' });
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const user = useAuthStore((s) => s.user);

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deletePlaceError, setDeletePlaceError] = useState<string | null>(null);

  const { data: plan, isLoading, error } = usePlan(planId);
  const { data: friendFamilies } = useFriendFamilies(activeFamily?.id);
  const { data: savedPlaces } = useSavedPlaces(activeFamily?.id);

  const setRsvp = useSetRsvp(planId);
  const sharePlan = useSharePlan(planId);
  const deletePlan = useDeletePlan(activeFamily?.id);
  const updatePlan = useUpdatePlan(planId, activeFamily?.id);
  const deletePlace = useDeletePlace(activeFamily?.id);

  // Chat realtime: el mapa de nombres se construye desde los participantes del
  // plan para resolver el displayName de los INSERTs ajenos (la tabla no lo trae).
  const participantNames = buildParticipantNames(plan?.participants ?? []);
  const {
    messages,
    isLoading: messagesLoading,
    sendMessage,
  } = usePlanChat(planId, { participantNames });

  const isOwner = plan?.createdBy === user?.id;

  // Familias amigas candidatas: las que aún NO están compartidas con el plan.
  const shareableFamilies = (friendFamilies ?? []).filter(
    (f) => !(plan?.sharedWithFamilyIds.includes(f.familyId) ?? false),
  );

  function handleRsvp(status: PlanRsvpStatus) {
    setRsvpError(null);
    setRsvp.mutate(
      { status },
      {
        onError: (err) => {
          setRsvpError(
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido guardar tu respuesta. Inténtalo de nuevo.',
          );
        },
      },
    );
  }

  function handleShare(familyId: string) {
    setShareError(null);
    sharePlan.mutate(
      { familyId },
      {
        onError: (err) => {
          setShareError(
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido compartir el plan. Inténtalo de nuevo.',
          );
        },
      },
    );
  }

  function handleSendMessage(body: string) {
    sendMessage.mutate({ body });
  }

  function handleDelete() {
    setDeleteError(null);
    deletePlan.mutate(planId, {
      onSuccess: () => {
        void navigate({ to: '/plans' });
      },
      onError: (err) => {
        setDeleteError(
          err instanceof ApiRequestError ? err.body.message : 'No se ha podido eliminar el plan.',
        );
      },
    });
  }

  function handleUpdatePlan(body: UpdatePlanInput) {
    setUpdateError(null);
    updatePlan.mutate(body, {
      onError: (err) => {
        setUpdateError(
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido guardar los cambios. Inténtalo de nuevo.',
        );
      },
    });
  }

  function handleDeletePlace(placeId: string) {
    setDeletePlaceError(null);
    deletePlace.mutate(placeId, {
      onError: (err) => {
        setDeletePlaceError(
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido borrar el lugar. Inténtalo de nuevo.',
        );
      },
    });
  }

  if (!planId) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'var(--color-text-muted)' }}>Plan no encontrado.</p>
      </div>
    );
  }

  // Mientras carga o si falla, no hay `plan` para construir el contrato de la
  // vista (que requiere `plan: PlanDto`). Render mínimo de estado.
  if (!plan) {
    return (
      <div style={styles.center}>
        {isLoading && <p style={{ color: 'var(--color-text-muted)' }}>Cargando plan…</p>}
        {error && (
          <p role="alert" style={styles.error}>
            No se ha podido cargar el plan.
          </p>
        )}
      </div>
    );
  }

  const viewProps: PlanDetailViewProps = {
    plan,
    messages,
    currentUserId: user?.id ?? '',
    isOwner,
    friendFamilies: shareableFamilies,
    isLoading,
    error: error ? 'No se ha podido cargar el plan.' : null,
    messagesLoading,
    isSavingRsvp: setRsvp.isPending,
    isSharing: sharePlan.isPending,
    isSendingMessage: sendMessage.isPending,
    isDeleting: deletePlan.isPending,
    rsvpError,
    shareError,
    deleteError,
    savedPlaces: savedPlaces ?? [],
    isUpdating: updatePlan.isPending,
    updateError,
    isDeletingPlace: deletePlace.isPending,
    deletePlaceError,
    onBack: () => void navigate({ to: '/plans' }),
    onRsvp: handleRsvp,
    onShare: handleShare,
    onSendMessage: handleSendMessage,
    onDelete: handleDelete,
    onUpdatePlan: handleUpdatePlan,
    onDeletePlace: handleDeletePlace,
  };

  return <ThemeView screen="plan_detail" props={viewProps} />;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60dvh',
  },
  error: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    color: 'var(--color-error)',
    fontSize: 'var(--font-size-sm)',
  },
};
