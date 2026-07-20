/* ─── Vista presentacional springfield — family_join ────────────────────────
 *
 * Theme `springfield` (estética cómic pop). Misma funcionalidad que la vista
 * base: formulario para unirse a una familia con un PIN de 8 caracteres (Base32
 * Crockford).
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
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[480px] mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="sf-btn sf-btn-w mb-3 !px-3 !py-1.5 text-sm"
          aria-label="Volver"
        >
          ← Volver
        </button>
        <header className="sf-card-s p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">Únete con un PIN</h1>
          <p className="sf-fredoka text-sm mt-1">
            Introduce el PIN de {JOIN_PIN_LENGTH} caracteres que te ha compartido el propietario de
            la unidad familiar.
          </p>
        </header>

        {displayedError && (
          <div role="alert" className="sf-card-p p-4 mb-4 sf-pop">
            <p className="sf-fredoka text-sm">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="sf-card p-5 space-y-3">
          <label htmlFor="join-pin" className="sf-fredoka text-xs uppercase block">
            PIN de invitación
          </label>
          <input
            id="join-pin"
            className="sf-input sf-bangers text-center text-2xl tracking-widest"
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
          <p id="pin-hint" className="sf-fredoka text-xs opacity-60 text-right">
            {pin.length}/{JOIN_PIN_LENGTH} caracteres
          </p>

          <button
            type="submit"
            className="sf-btn w-full text-lg"
            disabled={isSubmitting || pin.length !== JOIN_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirse a la familia'}
          </button>
        </form>
      </div>
    </div>
  );
}
