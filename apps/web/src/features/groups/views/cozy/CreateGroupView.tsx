/* ─── Vista presentacional cozy — group_create (crear peña) ──────────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel crema pautado, tinta
 * marrón, boli azul, notas con cinta, fuentes manuscritas). Reestiliza la vista
 * base de crear peña con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozy.tsx → GroupsCreate): página `ck-page`,
 * cabecera con "← volver" + titular Caveat, formulario en una nota `ck-card` con
 * cinta (`ck-tape`), labels manuscritos (`ck-marker`), campos `ck-input` (línea
 * de puntos) y botón primario azul (`ck-btn ck-btn-blue`).
 *
 * Mismo contrato `CreateGroupViewProps`, misma funcionalidad y mismos callbacks
 * que la base. Conserva la validación de formulario local (nombre obligatorio)
 * que ya hacía la base; el error de negocio (`ApiRequestError`) llega por la prop
 * `error` desde el container.
 *
 * Datos REALES: el kit prerellenaba el input con "Cuadrilla del pueblo"; aquí los
 * campos arrancan vacíos (estado controlado) y los textos son los del producto.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import type { CreateGroupViewProps } from '../types';

export default function CreateGroupView({ isSubmitting, error, onSubmit }: CreateGroupViewProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Prioriza la validación de UI; si no, el error de negocio del container.
  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('El nombre de la peña es obligatorio.');
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="ck ck-page min-h-[100dvh]">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-24">
        {/* ── Cabecera ── */}
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">Crea una peña</h1>
          <p className="text-base mt-2 opacity-80">
            Ponle nombre a tu grupo y empieza a compartir la experiencia con tus amigos.
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
            <label htmlFor="group-name" className="ck-marker text-xl block">
              nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="group-name"
              className="ck-input"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Peña Los Compadres"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="group-desc" className="ck-marker text-xl block">
              descripción <span className="opacity-70">(opcional)</span>
            </label>
            <textarea
              id="group-desc"
              className="ck-input resize-y"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de la peña"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="ck-btn ck-btn-blue w-full disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creando…' : 'Crear peña'}
          </button>
        </form>
      </div>
    </div>
  );
}
