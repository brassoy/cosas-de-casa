/**
 * FriendRedeemView — vista presentacional `cozy` de "Canjear código".
 *
 * Reestilizado "cuaderno de papel manuscrito": papel crema pautado (.ck-page),
 * nota de papel con cinta (.ck-card + .ck-tape), campo manuscrito con línea de
 * puntos (.ck-input), botón de bolígrafo azul (.ck-btn-blue), sobre el MISMO
 * contrato `FriendRedeemViewProps` que la vista base. Misma funcionalidad,
 * mismos callbacks; solo cambia la estética.
 *
 * Presentacional pura: solo props in / callbacks out. El container
 * (`RedeemFriendPage`) posee familyId (del store), la mutación de canje, la
 * validación y la navegación.
 *
 * Se conservan los nombres accesibles y textos que la suite espera: heading
 * "Canjear código de amistad", label "Código de invitación" ligado al input,
 * botón "Canjear código" y `role="alert"` para los errores.
 */

import { ArrowLeft } from 'lucide-react';
import type { FriendRedeemViewProps } from '../types';

export default function FriendRedeemView({
  code,
  familyName,
  error,
  isSubmitting,
  onCodeChange,
  onSubmit,
  onBack,
}: FriendRedeemViewProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <div className="ck ck-page min-h-screen">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-24 pt-8">
        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <header className="relative text-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a familias amigas"
            className="ck-marker absolute left-0 top-0 text-xl text-[#2d4a8a]"
          >
            <ArrowLeft className="mr-0.5 inline h-4 w-4" aria-hidden="true" />
            volver
          </button>
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h2 className="ck-marker mt-1 text-4xl leading-none text-[#2d4a8a]">
            Canjear código de amistad
          </h2>
        </header>

        <p className="text-base leading-relaxed opacity-80">
          Introduce el código que te ha compartido otra familia para conectaros en{' '}
          <strong className="ck-marker text-xl text-[#c0392b]">
            {familyName ?? 'tu familia'}
          </strong>
          .
        </p>

        <form onSubmit={handleSubmit} className="ck-card relative flex flex-col gap-5 p-5">
          <span className="ck-tape" aria-hidden="true" />
          <label htmlFor="friend-code" className="ck-marker text-center text-xl">
            Código de invitación
          </label>
          <input
            id="friend-code"
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="p. ej. ABC123XY"
            autoComplete="off"
            autoFocus
            className="ck-input ck-marker text-center text-3xl tracking-widest"
          />

          {error && (
            <div className="ck-card p-3 text-base text-[#c0392b]" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="ck-btn ck-btn-blue w-full disabled:opacity-60"
          >
            {isSubmitting ? 'Canjeando…' : 'Canjear código'}
          </button>
        </form>
      </div>
    </div>
  );
}
