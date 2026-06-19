/**
 * Container de la pantalla `settings`.
 *
 * Cablea el perfil real (useProfile) y las mutaciones (useUpdateName,
 * useChangePassword) UNA sola vez, traduce su estado al contrato de props y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo (con fallback a `base`).
 *
 * La vista valida los formularios (nombre no vacío, contraseña ≥ 6 + confirmar)
 * y emite callbacks ya validados. El error de negocio (backend / Supabase) se
 * captura aquí y se devuelve a la vista por props (`nameError`, `passwordError`).
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ApiRequestError } from '@/shared/lib/api';
import { useProfile, useUpdateName, useChangePassword } from '../hooks/useProfile';
import type { SettingsViewProps } from '../views/types';

export function SettingsPage() {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);

  const profile = useProfile();
  const updateName = useUpdateName();
  const changePassword = useChangePassword();

  const [nameError, setNameError] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);

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

  async function handleLogout() {
    await signOut();
    void navigate({ to: '/login' });
  }

  const props: SettingsViewProps = {
    displayName: profile.data?.displayName ?? null,
    email: profile.data?.email ?? null,
    loading: profile.isLoading,
    onSaveName: handleSaveName,
    savingName: updateName.isPending,
    nameError,
    nameOk,
    onChangePassword: handleChangePassword,
    changingPassword: changePassword.isPending,
    passwordError,
    passwordOk,
    onLogout: () => void handleLogout(),
  };

  return <ThemeView screen="settings" props={props} />;
}
