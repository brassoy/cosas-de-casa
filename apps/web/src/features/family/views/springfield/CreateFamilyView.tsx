/* ─── Vista presentacional springfield — family_create ──────────────────────
 *
 * Theme `springfield` (estética cómic pop). Misma funcionalidad que la vista
 * base: formulario para crear una unidad familiar (nombre obligatorio +
 * descripción opcional).
 *
 * Mantiene la validación de formulario local (nombre no vacío) idéntica a la
 * base — es UI, no negocio, y de ella dependen los tests del contrato. El error
 * de negocio (`ApiRequestError`) llega por la prop `error` desde el container.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { type FormEvent, useState } from 'react';
import type { CreateFamilyViewProps } from '../types';

export default function CreateFamilyView(props: CreateFamilyViewProps) {
  const { isSubmitting, error, onSubmit } = props;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('El nombre de la unidad familiar es obligatorio.');
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[520px] mx-auto">
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <h1 className="sf-bangers text-4xl leading-none mt-1">Crea tu unidad familiar</h1>
          <p className="sf-fredoka text-sm mt-1">
            Da un nombre a tu hogar y empieza a gestionar todo lo de casa juntos.
          </p>
        </header>

        {displayedError && (
          <div role="alert" className="sf-card-p p-4 mb-4 sf-pop">
            <p className="sf-fredoka text-sm">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="sf-card p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="family-name" className="sf-fredoka text-xs uppercase block">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="family-name"
              className="sf-input"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Casa García"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="family-desc" className="sf-fredoka text-xs uppercase block">
              Descripción <span className="normal-case opacity-70">(opcional)</span>
            </label>
            <textarea
              id="family-desc"
              className="sf-input resize-y"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de tu hogar"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="sf-btn sf-btn-r w-full text-lg" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear unidad familiar'}
          </button>
        </form>
      </div>
    </div>
  );
}
