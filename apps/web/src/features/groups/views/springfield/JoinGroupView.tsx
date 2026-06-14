/* ─── Vista presentacional springfield — group_join ─────────────────────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos de tinta, hard shadows con
 * offset, colores planos saturados). Reestiliza la vista base de unirse con PIN
 * con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/springfield.tsx → GroupsJoin): fondo
 * celeste (sky), cabecera `sf-card-y` con sticker + Bangers + Fredoka, formulario
 * `sf-card` con el PIN en `sf-input` Bangers centrado y botón primario amarillo.
 *
 * Mismo contrato `JoinGroupViewProps`, misma funcionalidad y mismos callbacks
 * que la base. Conserva idéntica la sanitización del PIN (uppercase, filtro a
 * base32 Crockford, recorte a 8) y la validación de UI de la que dependen los
 * tests; el error de negocio (`friendlyJoinError` 404/410/409) llega por la prop
 * `error` desde el container.
 *
 * Datos REALES: el kit prerellenaba el input con "PEÑA2026"; aquí el PIN es un
 * estado controlado vacío y el contador refleja la longitud real.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import { GROUP_PIN_LENGTH, GROUP_PIN_REGEX } from '../../contracts';
import type { JoinGroupViewProps } from '../types';

const INK = '#1A1A1A';

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
    <div className="sf min-h-[100dvh] px-5 py-6" style={{ background: '#70C5FF' }}>
      <div className="max-w-[520px] mx-auto">
        {/* ── Cabecera (sf-card-y + sticker + Bangers) ── */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">Unirse a peña</h1>
          <p className="sf-fredoka text-sm mt-1">Pega el código de invitación</p>
          <Lightning className="absolute -top-3 right-3 w-7 sf-wob" />
        </header>

        {displayedError && (
          <div
            role="alert"
            className="sf-card p-3 mb-3 sf-pop text-sm font-bold"
            style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="sf-card p-5 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="join-pin" className="sf-fredoka text-sm block">
              PIN de invitación
            </label>
            <input
              id="join-pin"
              className="sf-input text-center sf-bangers text-2xl tracking-widest"
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
            <p id="pin-hint" className="text-right text-xs opacity-70">
              {pin.length}/{GROUP_PIN_LENGTH} caracteres
            </p>
          </div>

          <button
            type="submit"
            className="sf-btn w-full disabled:opacity-60"
            disabled={isSubmitting || pin.length !== GROUP_PIN_LENGTH}
          >
            {isSubmitting ? 'Uniéndose…' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Lightning(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
