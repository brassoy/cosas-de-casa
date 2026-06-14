/**
 * FriendRedeemView — vista presentacional `cozysitcom` de "Canjear código".
 *
 * Reestilizado retro-sitcom 70s (madera, mostaza, granate, denim) sobre el
 * MISMO contrato `FriendRedeemViewProps` que la vista base. Misma
 * funcionalidad, mismos callbacks; solo cambia la estética.
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
    <div className="cz cz-wallpaper min-h-screen">
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pb-24 pt-6">
        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <header className="cz-pop">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a familias amigas"
            className="mb-2 text-xs font-bold opacity-70 hover:opacity-100"
          >
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Familias amigas
          </button>
          <div className="cz-wood mb-2 inline-block">
            <p className="cz-serif text-base">Familias amigas</p>
          </div>
          <h2 className="cz-serif text-3xl leading-none">Canjear código de amistad</h2>
          <div className="cz-stripe mt-3" />
        </header>

        <p className="text-sm leading-relaxed opacity-80">
          Introduce el código que te ha compartido otra familia para conectaros en{' '}
          <strong className="cz-serif opacity-100">{familyName ?? 'tu familia'}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="cz-paper flex flex-col gap-4 p-5">
          <label htmlFor="friend-code" className="cz-serif text-sm">
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
            className="cz-input tracking-[0.1em]"
          />

          {error && (
            <div className="cz-frame !border-error text-sm text-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="cz-btn-denim disabled:opacity-60"
          >
            {isSubmitting ? 'Canjeando…' : 'Canjear código'}
          </button>
        </form>
      </div>
    </div>
  );
}
