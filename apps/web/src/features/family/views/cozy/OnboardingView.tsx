/* ─── Vista presentacional cozy — onboarding ────────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito": papel pautado, tinta
 * marrón, boli azul, notas con cinta y chinchetas, fonts Caveat/Patrick Hand).
 * Misma funcionalidad que la vista base: ofrece crear una unidad familiar o
 * unirse con un PIN.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. La navegación la decide el container.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { OnboardingViewProps } from '../types';

export default function OnboardingView(props: OnboardingViewProps) {
  const { onCreateFamily, onJoinFamily } = props;

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[520px] mx-auto">
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary">
            ¡Bienvenido a Cosas de Casa!
          </h1>
          <p className="text-base mt-2 opacity-80">
            Para empezar, crea tu unidad familiar o únete a una existente con un PIN de
            invitación.
          </p>
        </header>

        <div className="space-y-4">
          <button
            type="button"
            onClick={onCreateFamily}
            className="ck-card w-full p-5 text-left relative"
          >
            <span className="ck-pin" aria-hidden="true" />
            <p className="ck-marker text-3xl text-primary">Crea tu unidad familiar</p>
            <p className="text-base mt-1 opacity-80">Pon nombre a tu hogar e invita al resto.</p>
          </button>

          <button
            type="button"
            onClick={onJoinFamily}
            className="ck-card w-full p-5 text-left relative"
          >
            <span
              className="ck-pin"
              style={{ background: 'radial-gradient(circle at 30% 30%, #88f, #2d4a8a)' }}
              aria-hidden="true"
            />
            <p className="ck-marker text-3xl text-error">Únete con un PIN</p>
            <p className="text-base mt-1 opacity-80">Tengo un código de invitación del propietario.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
