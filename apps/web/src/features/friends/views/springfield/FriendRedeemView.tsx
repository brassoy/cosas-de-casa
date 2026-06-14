/**
 * FriendRedeemView — vista presentacional `springfield` de "Canjear código".
 *
 * Reestilizado cómic pop (bordes gruesos de tinta, hard shadows con offset,
 * colores planos saturados, fuentes Bangers/Fredoka/Nunito) sobre el MISMO
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
    <div className="sf min-h-screen bg-[#70C5FF]">
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 pb-24 pt-6">
        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <header className="sf-card-y sf-pop relative p-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver a familias amigas"
            className="sf-sticker sf-bangers"
          >
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Familias amigas
          </button>
          <h2 className="sf-bangers mt-2 text-3xl leading-none">Canjear código de amistad</h2>
        </header>

        <p className="sf-fredoka text-sm leading-relaxed">
          Introduce el código que te ha compartido otra familia para conectaros en{' '}
          <strong className="sf-bangers text-base">{familyName ?? 'tu familia'}</strong>.
        </p>

        <form onSubmit={handleSubmit} className="sf-card flex flex-col gap-4 p-5">
          <label htmlFor="friend-code" className="sf-fredoka text-xs uppercase">
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
            className="sf-input sf-bangers text-center text-2xl tracking-widest"
          />

          {error && (
            <div className="sf-card-p p-3 sf-fredoka text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="sf-btn sf-btn-r w-full text-lg disabled:opacity-60"
          >
            {isSubmitting ? 'Canjeando…' : 'Canjear código'}
          </button>
        </form>
      </div>
    </div>
  );
}
