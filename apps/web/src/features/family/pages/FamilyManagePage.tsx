/**
 * FamilyManagePage — CONTAINER de la pantalla "Gestionar familia".
 *
 * Reúne TODA la gestión de la familia, accesible a cualquier miembro:
 *  - Miembros (lista, visible para todos) — `useFamilyMembers`.
 *  - Salir de la familia (todos) — `useLeaveFamily` con confirmación propia
 *    (`ConfirmDialog`, no `window.confirm`).
 *  - Invitar con PIN (generar/copiar/compartir/revocar) — SOLO OWNER.
 *  - Administración (cambiar rol/expulsar, nombre/descripción, borrar) — SOLO
 *    OWNER, vía `useFamilyManage` (`manage` llega `undefined` para no-OWNER y
 *    la vista oculta esas secciones).
 *
 * Delega el render en `ThemeView`.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { GeneratePinResponse } from '@cosasdecasa/contracts';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useFamilyMembers,
  useGenerateJoinPin,
  useLeaveFamily,
  useRevokeFamilyPin,
} from '../hooks/useFamily';
import { useFamilyMembersRealtime } from '../hooks/useFamilyMembersRealtime';
import { useFamilyManage } from '../hooks/useFamilyManage';
import { useFamilyStore } from '../store/family.store';
import type { FamilyInviteProps, FamilyManageViewProps } from '../views/types';

function buildShareText(pin: string): string {
  return `¡Únete a mi familia en Cosas de Casa! Usa el PIN: ${pin}`;
}

export function FamilyManagePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const familyId = activeFamily?.id ?? '';
  const {
    data: members,
    isLoading: membersLoading,
    error: membersQueryError,
  } = useFamilyMembers(activeFamily?.id);
  const { isOwner, manage } = useFamilyManage();
  const generatePin = useGenerateJoinPin(familyId);
  const revokePin = useRevokeFamilyPin(familyId);
  const leaveFamily = useLeaveFamily(familyId);

  // Realtime: refresca la lista de miembros cuando alguien se une/sale/cambia de
  // rol, para que el OWNER no se quede con una lista obsoleta (ver hook).
  useFamilyMembersRealtime(activeFamily?.id);

  // El único OWNER no puede "Salir" (el backend lo bloquea con LastOwnerError):
  // la familia se quedaría sin propietario. Lo detectamos en cliente para guiar
  // hacia "Borrar familia" en vez de lanzar una llamada que va a fallar.
  const ownerCount = (members ?? []).filter((m) => m.role === 'OWNER').length;
  const isSoleOwner = isOwner && ownerCount <= 1;

  // ── Invitación por PIN (solo OWNER) ─────────────────────────────────────────
  const [generatedPin, setGeneratedPin] = useState<GeneratePinResponse | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinRevokeError, setPinRevokeError] = useState<string | null>(null);

  // ── Salir de la familia (todos) ─────────────────────────────────────────────
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  function handleGeneratePin() {
    setPinError(null);
    generatePin.mutate(undefined, {
      onSuccess: (res) => setGeneratedPin(res),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido generar el PIN.';
        setPinError(msg);
      },
    });
  }

  function handleRevokePin() {
    // Confirmación bloqueante heredada de la home (el ConfirmDialog compartido
    // se reserva de momento para "Salir de la familia").
    if (
      !window.confirm(
        '¿Seguro que quieres revocar el PIN de invitación activo? Dejará de funcionar para quien intente unirse con él.',
      )
    ) {
      return;
    }
    setPinRevokeError(null);
    revokePin.mutate(undefined, {
      // Tras revocar, el PIN mostrado deja de ser válido: lo ocultamos.
      onSuccess: () => setGeneratedPin(null),
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido revocar el PIN.';
        setPinRevokeError(msg);
      },
    });
  }

  function handleCopyPin() {
    if (!generatedPin) return;
    void navigator.clipboard.writeText(generatedPin.code);
  }

  function handleShare(channel: 'whatsapp' | 'telegram') {
    if (!generatedPin) return;
    const text = buildShareText(generatedPin.code);
    const url =
      channel === 'whatsapp'
        ? `https://wa.me/?text=${encodeURIComponent(text)}`
        : `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleConfirmLeave() {
    setConfirmLeaveOpen(false);
    setLeaveError(null);
    leaveFamily.mutate(undefined, {
      // El hook ya limpia la familia activa del store (clearFamily). Navegamos a
      // onboarding ("/") como hace el AppHeader al cerrar sesión.
      onSuccess: async () => {
        await navigate({ to: '/' });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido salir de la familia. Inténtalo de nuevo.';
        setLeaveError(msg);
      },
    });
  }

  if (!activeFamily) {
    return (
      <div className="min-h-[60dvh] grid place-items-center px-4">
        <p className="text-muted-foreground">No hay ninguna familia activa.</p>
      </div>
    );
  }

  // Invitación con PIN: solo se cablea para el OWNER (la vista oculta la
  // sección si `invite` llega undefined).
  const invite: FamilyInviteProps | undefined = isOwner
    ? {
        generatedPin,
        pinLoading: generatePin.isPending,
        pinError,
        onGeneratePin: handleGeneratePin,
        onCopyPin: handleCopyPin,
        onShare: handleShare,
        // Revocar PIN: solo si hay un PIN recién generado a la vista.
        onRevokePin: generatedPin ? handleRevokePin : undefined,
        pinRevoking: revokePin.isPending,
        pinRevokeError,
      }
    : undefined;

  const viewProps: FamilyManageViewProps = {
    manage,
    invite,
    members: members ?? [],
    membersLoading,
    membersError: membersQueryError ? 'No se han podido cargar los miembros.' : null,
    onLeaveFamily: () => {
      // Guard del OWNER único: en vez de abrir el diálogo y fallar en el backend,
      // explicamos la salida real (transferir propiedad o borrar la familia).
      if (isSoleOwner) {
        setLeaveError(
          'Eres el único propietario de la familia. Para dejarla, primero pasa el rol de propietario a otro miembro, o bórrala con «Borrar familia» aquí abajo.',
        );
        return;
      }
      setLeaveError(null);
      setConfirmLeaveOpen(true);
    },
    leaveLoading: leaveFamily.isPending,
    leaveError,
    onBack: () =>
      void navigate({
        to: '/family/$familyId',
        params: { familyId: activeFamily.id },
      }),
  };

  return (
    <>
      <ThemeView screen="family_manage" props={viewProps} />
      <ConfirmDialog
        open={confirmLeaveOpen}
        title="¿Salir de la familia?"
        description="Perderás el acceso a sus listas, tareas y demás datos del hogar."
        confirmLabel="Salir de la familia"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmLeave}
        onCancel={() => setConfirmLeaveOpen(false)}
      />
    </>
  );
}
