/* ─── Vista presentacional cozy — family_create ─────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito"). Misma funcionalidad
 * que la vista base: formulario para crear una unidad familiar (nombre
 * obligatorio + descripción opcional).
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
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[520px] mx-auto">
        <header className="text-center mb-6">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary">
            Abrir cuaderno
          </h1>
          <p className="text-base mt-2 opacity-80">
            Da un nombre a tu hogar y empieza a gestionar todo lo de casa juntos.
          </p>
        </header>

        {displayedError && (
          <div role="alert" className="ck-card p-4 mb-4 relative">
            <span className="ck-pin" aria-hidden="true" />
            <p className="text-base text-error">{displayedError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="ck-card p-5 space-y-4 relative">
          <span className="ck-tape" aria-hidden="true" />

          <div>
            <label htmlFor="family-name" className="ck-marker text-xl block">
              Nombre de la familia <span aria-hidden="true">*</span>
            </label>
            <input
              id="family-name"
              className="ck-input"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Casa García"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="family-desc" className="ck-marker text-xl block">
              Lema o dedicatoria{' '}
              <span className="text-base opacity-70">(opcional)</span>
            </label>
            <textarea
              id="family-desc"
              className="ck-input resize-y"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="con cariño, hecho a mano"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="ck-btn ck-btn-blue w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Abriendo…' : 'Abrir cuaderno'}
          </button>
        </form>
      </div>
    </div>
  );
}
