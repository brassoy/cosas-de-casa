/**
 * Container de la pantalla `settings`.
 *
 * Cablea el perfil real (useProfile) y las mutaciones (useUpdateName,
 * useChangeEmail, useChangePassword, useLeaveFamily) UNA sola vez, traduce su
 * estado al contrato de props y delega el render en `ThemeView`, que monta la
 * vista presentacional del theme activo (con fallback a `base`).
 *
 * La vista valida los formularios (nombre no vacío, email con formato,
 * contraseña ≥ 6 + confirmar) y emite callbacks ya validados. El error de
 * negocio (backend / Supabase) se captura aquí y se devuelve a la vista por
 * props (`nameError`, `emailError`, `passwordError`, `leaveError`).
 *
 * Salir de una familia es destructivo: se confirma con `window.confirm` (no hay
 * AlertDialog compartido) y, tras el éxito, se navega a "/" (onboarding).
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useFamilyStore } from '@/features/family/store/family.store';
import { useLeaveFamily } from '@/features/family/hooks/useFamily';
import { ApiRequestError } from '@/shared/lib/api';
import { useProfile, useUpdateName, useChangeEmail, useChangePassword } from '../hooks/useProfile';
import type { SettingsFamily, SettingsViewProps } from '../views/types';

export function SettingsPage() {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const activeFamily = useFamilyStore((s) => s.activeFamily);

  const profile = useProfile();
  const updateName = useUpdateName();
  const changeEmail = useChangeEmail();
  const changePassword = useChangePassword();
  // El hook recibe el id de la familia a abandonar. Solo permitimos salir de la
  // familia activa, así que lo cableamos con su id (cadena vacía si no hay).
  const leaveFamily = useLeaveFamily(activeFamily?.id ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  function handleSaveName(name: string) {
    setNameError(null);
    setNameOk(false);
    updateName.mutate(
      { displayName: name },
      {
        onSuccess: () => setNameOk(true),
        onError: (err) => {
          const msg =
            err instanceof ApiRequestError
              ? err.body.message
              : 'No se ha podido guardar el nombre. Inténtalo de nuevo.';
          setNameError(msg ?? 'No se ha podido guardar el nombre. Inténtalo de nuevo.');
        },
      },
    );
  }

  function handleChangeEmail(email: string) {
    setEmailError(null);
    setEmailOk(false);
    changeEmail.mutate(
      { email },
      {
        onSuccess: () => setEmailOk(true),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : null;
          setEmailError(msg ?? 'No se ha podido cambiar el correo. Inténtalo de nuevo.');
        },
      },
    );
  }

  function handleChangePassword(password: string) {
    setPasswordError(null);
    setPasswordOk(false);
    changePassword.mutate(
      { password },
      {
        onSuccess: () => setPasswordOk(true),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : null;
          setPasswordError(msg ?? 'No se ha podido cambiar la contraseña. Inténtalo de nuevo.');
        },
      },
    );
  }

  function handleLeaveFamily(familyId: string) {
    // Solo soportamos salir de la familia activa (el hook se cableó con su id).
    if (familyId !== activeFamily?.id) return;
    // Confirmación FUERTE: la salida es destructiva (pierde acceso a la familia).
    if (
      !window.confirm(
        '¿Seguro que quieres salir de esta familia? Perderás el acceso a sus listas, tareas, etc.',
      )
    ) {
      return;
    }
    setLeaveError(null);
    // El hook ya limpia la familia activa del store (clearFamily). Navegamos a
    // onboarding ("/") tras el éxito, como hace el resto de la app.
    leaveFamily.mutate(undefined, {
      onSuccess: async () => {
        await navigate({ to: '/' });
      },
      onError: (err) => {
        const msg =
          err instanceof ApiRequestError
            ? err.body.message
            : 'No se ha podido salir de la familia. Inténtalo de nuevo.';
        setLeaveError(msg ?? 'No se ha podido salir de la familia. Inténtalo de nuevo.');
      },
    });
  }

  async function handleLogout() {
    await signOut();
    void navigate({ to: '/login' });
  }

  // Lista de familias para la vista. La fuente de verdad es `GET /auth/me`
  // (perfil), y marcamos como `active` la que esté seleccionada en el store.
  const families: SettingsFamily[] = (profile.data?.families ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    active: f.id === activeFamily?.id,
  }));

  const props: SettingsViewProps = {
    displayName: profile.data?.displayName ?? null,
    email: profile.data?.email ?? null,
    loading: profile.isLoading,
    onSaveName: handleSaveName,
    savingName: updateName.isPending,
    nameError,
    nameOk,
    onChangeEmail: handleChangeEmail,
    changingEmail: changeEmail.isPending,
    emailError,
    emailOk,
    onChangePassword: handleChangePassword,
    changingPassword: changePassword.isPending,
    passwordError,
    passwordOk,
    families,
    onLeaveFamily: handleLeaveFamily,
    leavingFamily: leaveFamily.isPending,
    leaveError,
    onLogout: () => void handleLogout(),
  };

  return <ThemeView screen="settings" props={props} />;
}
