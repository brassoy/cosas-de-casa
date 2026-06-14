/**
 * OnboardingPage — CONTAINER de la pantalla de bienvenida.
 *
 * Solo cablea la navegación (crear / unirse) y delega el render en `ThemeView`,
 * que monta la vista presentacional del theme activo.
 */

import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import type { OnboardingViewProps } from '../views/types';

export function OnboardingPage() {
  const navigate = useNavigate();

  const viewProps: OnboardingViewProps = {
    onCreateFamily: () => void navigate({ to: '/family/create' }),
    onJoinFamily: () => void navigate({ to: '/family/join' }),
  };

  return <ThemeView screen="onboarding" props={viewProps} />;
}
