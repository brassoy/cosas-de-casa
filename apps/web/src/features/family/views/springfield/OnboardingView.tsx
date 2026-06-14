/* ─── Vista presentacional springfield — onboarding ─────────────────────────
 *
 * Theme `springfield` (estética cómic pop: bordes gruesos de tinta, hard shadows
 * con offset, colores planos saturados). Misma funcionalidad que la vista base:
 * ofrece crear una unidad familiar o unirse con un PIN.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La navegación la decide el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { OnboardingViewProps } from '../types';

export default function OnboardingView(props: OnboardingViewProps) {
  const { onCreateFamily, onJoinFamily } = props;

  return (
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[520px] mx-auto">
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <span className="sf-sticker">¡Hola, vecina!</span>
          <h1 className="sf-bangers text-4xl leading-none mt-2">¿Cómo empezamos?</h1>
          <p className="sf-fredoka text-sm mt-1">
            Crea tu unidad familiar o únete a una existente con un PIN de invitación.
          </p>
        </header>

        <div className="space-y-4">
          <button
            type="button"
            onClick={onCreateFamily}
            className="sf-card-y w-full p-5 text-left sf-wob"
          >
            <p className="sf-bangers text-3xl">Crea tu unidad familiar</p>
            <p className="sf-fredoka text-sm mt-1">Pon nombre a tu hogar e invita al resto.</p>
          </button>

          <button
            type="button"
            onClick={onJoinFamily}
            className="sf-card-s w-full p-5 text-left sf-wob"
          >
            <p className="sf-bangers text-3xl">Únete con un PIN</p>
            <p className="sf-fredoka text-sm mt-1">Tengo un código de invitación del propietario.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
