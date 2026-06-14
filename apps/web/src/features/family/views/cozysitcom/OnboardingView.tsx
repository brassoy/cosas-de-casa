/* ─── Vista presentacional cozysitcom — onboarding ──────────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Misma funcionalidad
 * que la vista base: ofrece crear una unidad familiar o unirse con un PIN.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La navegación la decide el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { OnboardingViewProps } from '../types';

export default function OnboardingView(props: OnboardingViewProps) {
  const { onCreateFamily, onJoinFamily } = props;

  return (
    <div className="cz cz-wallpaper min-h-[80dvh] px-5 py-8">
      <div className="max-w-[520px] mx-auto">
        <header className="mb-6 cz-pop">
          <div className="cz-wood inline-block mb-3">
            <p className="cz-serif text-base">En esta casa</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">¿Cómo empezamos?</h1>
          <p className="text-sm opacity-70 mt-2 leading-relaxed">
            Crea tu unidad familiar o únete a una existente con un PIN de invitación.
          </p>
          <div className="cz-stripe mt-3" />
        </header>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onCreateFamily}
            className="cz-frame cz-pop w-full text-left hover:bg-[#FFF8EA]/60 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                🏡
              </span>
              <div>
                <p className="cz-serif text-2xl">Crea tu unidad familiar</p>
                <p className="text-sm opacity-70 mt-1">
                  Pon nombre a tu hogar e invita al resto.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onJoinFamily}
            className="cz-frame cz-pop w-full text-left hover:bg-[#FFF8EA]/60 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                🔑
              </span>
              <div>
                <p className="cz-serif text-2xl">Únete con un PIN</p>
                <p className="text-sm opacity-70 mt-1">
                  Tengo un código de invitación del propietario.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
