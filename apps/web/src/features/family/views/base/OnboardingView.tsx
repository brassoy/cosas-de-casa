/* ─── Vista presentacional base — onboarding ────────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Pantalla de bienvenida que
 * ofrece crear una unidad familiar o unirse con un PIN.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La navegación la decide el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { Button } from '@/shared/ui/button';
import type { OnboardingViewProps } from '../types';

export default function OnboardingView(props: OnboardingViewProps) {
  const { onCreateFamily, onJoinFamily } = props;

  return (
    <div className="min-h-[80dvh] grid place-items-center px-4">
      <div className="w-full max-w-[480px] bg-card text-card-foreground rounded-card shadow-lg border border-border p-8 text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl" aria-hidden="true">
            🏡
          </div>
          <h2 className="text-2xl font-bold">¡Bienvenido a Cosas de Casa!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para empezar, crea tu unidad familiar o únete a una existente con un PIN de
            invitación.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button className="h-11" onClick={onCreateFamily}>
            Crea tu unidad familiar
          </Button>
          <Button variant="outline" className="h-11" onClick={onJoinFamily}>
            Únete con un PIN
          </Button>
        </div>
      </div>
    </div>
  );
}
