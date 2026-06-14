/* ─── Vista presentacional springfield — group_create ───────────────────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos de tinta, hard shadows con
 * offset, colores planos saturados). Reestiliza la vista base de crear peña con
 * la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/springfield.tsx → GroupsCreate): cabecera
 * `sf-card-y` con sticker + titular Bangers + subtítulo Fredoka, formulario en
 * `sf-card` con `sf-input` y botón primario rojo (`sf-btn sf-btn-r`).
 *
 * Mismo contrato `CreateGroupViewProps`, misma funcionalidad y mismos callbacks
 * que la base. Conserva la validación de formulario local (nombre obligatorio)
 * que ya hacía la base y de la que dependen los tests; el error de negocio
 * (`ApiRequestError`) llega por la prop `error` desde el container.
 *
 * Datos REALES: el kit prerellenaba el input con "Cuadrilla del pueblo"; aquí los
 * campos arrancan vacíos (estado controlado) y los textos son los del producto.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import type { CreateGroupViewProps } from '../types';

const INK = '#1A1A1A';

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
    <div className="sf min-h-[100dvh] px-5 py-6" style={{ background: '#FFF3C4' }}>
      <div className="max-w-[520px] mx-auto">
        {/* ── Cabecera (sf-card-y + sticker + Bangers) ── */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">Crear peña</h1>
          <p className="sf-fredoka text-sm mt-1">Reúne a los tuyos</p>
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
            <label htmlFor="group-name" className="sf-fredoka text-sm block">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="group-name"
              className="sf-input"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Peña Los Compadres"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="group-desc" className="sf-fredoka text-sm block">
              Descripción <span className="font-normal opacity-70">(opcional)</span>
            </label>
            <textarea
              id="group-desc"
              className="sf-input resize-y"
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
            className="sf-btn sf-btn-r w-full disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creando…' : 'Crear peña'}
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
