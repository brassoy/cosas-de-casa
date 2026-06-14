/* ─── Vista presentacional cozysitcom — family_join ─────────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Misma funcionalidad
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
  const { isSubmitting, error, onSubmit } = props;

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
    <div className="cz cz-wallpaper min-h-[80dvh] px-5 py-8">
      <div className="max-w-[480px] mx-auto">
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-3">
            <p className="cz-serif text-base">Llaves de la casa</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Únete con un PIN</h1>
          <p className="text-sm opacity-70 mt-2">
            Introduce el PIN de {JOIN_PIN_LENGTH} caracteres que te ha compartido el
            propietario de la unidad familiar.
          </p>
          <div className="cz-stripe mt-3" />
        </header>

        {displayedError && (
          <div
            role="alert"
            className="cz-frame mb-4 cz-pop"
            style={{ borderColor: '#A63A3A', color: '#A63A3A' }}
          >
            <p className="font-bold text-sm">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="cz-frame space-y-3">
          <label htmlFor="join-pin" className="text-xs font-bold uppercase opacity-70 block">
            PIN de invitación
          </label>
          <input
            id="join-pin"
            className="cz-input cz-serif text-center text-2xl tracking-[0.25em]"
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
          <p id="pin-hint" className="text-xs opacity-60 text-right">
            {pin.length}/{JOIN_PIN_LENGTH} caracteres
          </p>

          <button
            type="submit"
            className="cz-btn-mustard w-full"
            disabled={isSubmitting || pin.length !== JOIN_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Pasar y sentarse'}
          </button>
        </form>
      </div>
    </div>
  );
}
