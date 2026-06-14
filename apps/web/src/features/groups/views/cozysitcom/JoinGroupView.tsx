/* ─── Vista presentacional cozysitcom — group_join ──────────────────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Reestiliza la vista base de unirse con PIN con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozysitcom.tsx → GroupsJoin): fondo de
 * papel pintado (`cz-wallpaper`), cabecera con placa de madera + titular serif +
 * cinta a rayas, formulario en `cz-frame` con el PIN en `cz-input` serif
 * centrado y botón mostaza (igual que la maqueta de "Unirse").
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
    <div className="cz cz-wallpaper min-h-[100dvh] px-4 py-10">
      <div className="w-full max-w-[520px] mx-auto">
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">Llaves de la peña</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Únete con un PIN</h1>
          <p className="text-sm opacity-70 mt-1">
            Introduce el PIN de 8 caracteres que te ha compartido el propietario de la peña.
          </p>
          <div className="cz-stripe mt-3" />
        </header>

        {displayedError && (
          <div
            role="alert"
            className="cz-paper p-3 mb-3 cz-pop text-sm font-bold"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="cz-frame space-y-3">
          <div className="space-y-1.5">
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
              maxLength={GROUP_PIN_LENGTH}
              aria-describedby="pin-hint"
              disabled={isSubmitting}
            />
            <p id="pin-hint" className="text-right text-xs opacity-60">
              {pin.length}/{GROUP_PIN_LENGTH} caracteres
            </p>
          </div>

          <button
            type="submit"
            className="cz-btn-mustard w-full disabled:opacity-60"
            disabled={isSubmitting || pin.length !== GROUP_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirse a la peña'}
          </button>
        </form>
      </div>
    </div>
  );
}
