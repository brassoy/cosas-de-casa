/* ─── Vista presentacional cozy — family_join ───────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito"). Misma funcionalidad
 * que la vista base: formulario para unirse a una familia con un PIN de 8
 * caracteres (Base32 Crockford).
 *
 * Reparto de responsabilidades idéntico a la base (plan §4, fila 5):
 *  - La VISTA sanitiza el input (uppercase, filtra no-base32, recorta a 8),
 *    lleva el contador, deshabilita el botón hasta tener 8 y valida la longitud
 *    local antes de emitir.
 *  - El CONTAINER valida el formato Crockford definitivo y traduce los errores
 *    de negocio (`friendlyJoinError`: 404/410/409) que llegan por `error`.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { JOIN_PIN_LENGTH } from '@cosasdecasa/contracts';
import type { JoinFamilyViewProps } from '../types';

export default function JoinFamilyView(props: JoinFamilyViewProps) {
  const { isSubmitting, error, onSubmit, onBack } = props;

  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error ?? null;

  function handlePinChange(value: string) {
    // Solo mayúsculas; elimina caracteres no válidos; recorta a la longitud PIN.
    setPin(value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, JOIN_PIN_LENGTH));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (pin.length !== JOIN_PIN_LENGTH) {
      setLocalError(`El PIN debe tener ${JOIN_PIN_LENGTH} caracteres.`);
      return;
    }

    onSubmit(pin);
  }

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[480px] mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="ck-marker mb-3 text-base opacity-70"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary">Unirme</h1>
          <p className="text-base mt-2 opacity-80">
            Introduce el PIN de {JOIN_PIN_LENGTH} caracteres que te ha compartido el propietario de
            la unidad familiar.
          </p>
        </header>

        {displayedError && (
          <div role="alert" className="ck-card p-4 mb-4 relative">
            <span className="ck-pin" aria-hidden="true" />
            <p className="text-base text-error">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="ck-card p-5 space-y-3 relative">
          <span className="ck-tape" aria-hidden="true" />

          <label htmlFor="join-pin" className="ck-marker text-xl text-center block">
            Código de invitación
          </label>
          <input
            id="join-pin"
            className="ck-input ck-marker text-center text-3xl tracking-widest"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            required
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="XXXXXXXX"
            maxLength={JOIN_PIN_LENGTH}
            disabled={isSubmitting}
            aria-describedby="pin-hint"
          />
          <p id="pin-hint" className="text-sm opacity-60 text-right">
            {pin.length}/{JOIN_PIN_LENGTH} caracteres
          </p>

          <button
            type="submit"
            className="ck-btn ck-btn-blue w-full"
            disabled={isSubmitting || pin.length !== JOIN_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Pasar al cuaderno'}
          </button>
        </form>
      </div>
    </div>
  );
}
