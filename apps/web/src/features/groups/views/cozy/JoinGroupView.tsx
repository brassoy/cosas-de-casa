/* ─── Vista presentacional cozy — group_join (unirse con PIN) ────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel crema pautado, tinta
 * marrón, boli azul, notas con cinta, fuentes manuscritas). Reestiliza la vista
 * base de unirse con PIN con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozy.tsx → GroupsJoin): página `ck-page`,
 * cabecera con titular Caveat, formulario en una nota `ck-card` con cinta
 * (`ck-tape`) y el PIN en un `ck-input` manuscrito (`ck-marker`) centrado y
 * espaciado, más botón primario azul (`ck-btn ck-btn-blue`).
 *
 * Mismo contrato `JoinGroupViewProps`, misma funcionalidad y mismos callbacks
 * que la base. Conserva idéntica la sanitización del PIN (uppercase, filtro a
 * base32 Crockford, recorte a 8) y la validación de UI de la que dependen los
 * tests; el error de negocio (`friendlyJoinError` 404/410/409) llega por la prop
 * `error` desde el container.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { GROUP_PIN_LENGTH, GROUP_PIN_REGEX } from '../../contracts';
import type { JoinGroupViewProps } from '../types';

export default function JoinGroupView({ isSubmitting, error, onSubmit }: JoinGroupViewProps) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Prioriza la validación de UI; si no, el error de negocio del container.
  const displayedError = localError ?? error ?? null;

  function handlePinChange(value: string) {
    setPin(value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, GROUP_PIN_LENGTH));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (pin.length !== GROUP_PIN_LENGTH) {
      setLocalError(`El PIN debe tener ${GROUP_PIN_LENGTH} caracteres.`);
      return;
    }

    if (!GROUP_PIN_REGEX.test(pin)) {
      setLocalError(
        'El PIN contiene caracteres no válidos. Usa solo letras (sin I, L, O, U) y números.',
      );
      return;
    }

    onSubmit(pin);
  }

  return (
    <div className="ck ck-page min-h-[100dvh]">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-24">
        {/* ── Cabecera ── */}
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">Únete con un PIN</h1>
          <p className="text-base mt-2 opacity-80">
            Introduce el PIN de 8 caracteres que te ha compartido el propietario de la peña.
          </p>
        </header>

        {displayedError && (
          <div
            role="alert"
            className="ck-card p-3 mb-4"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            <p className="ck-marker text-xl">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="ck-card p-5 space-y-4">
          <span className="ck-tape" />

          <div>
            <label htmlFor="join-pin" className="ck-marker text-xl block text-center">
              código de invitación
            </label>
            <input
              id="join-pin"
              className="ck-input ck-marker text-center text-3xl tracking-[0.25em]"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              required
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="XXXXXXXX"
              maxLength={GROUP_PIN_LENGTH}
              aria-describedby="pin-hint"
              disabled={isSubmitting}
            />
            <p id="pin-hint" className="text-right text-sm opacity-60 mt-1">
              {pin.length}/{GROUP_PIN_LENGTH} caracteres
            </p>
          </div>

          <button
            type="submit"
            className="ck-btn ck-btn-blue w-full disabled:opacity-60"
            disabled={isSubmitting || pin.length !== GROUP_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirse a la peña'}
          </button>
        </form>
      </div>
    </div>
  );
}
