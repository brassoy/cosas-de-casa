/* ─── Vista presentacional cozysitcom — family_create ───────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Misma funcionalidad
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
    <div className="cz min-h-[80dvh] px-5 py-8" style={{ background: '#FFF8EA' }}>
      <div className="max-w-[520px] mx-auto">
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-3">
            <p className="cz-serif text-base">Nueva temporada</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Funda tu casa</h1>
          <p className="text-sm opacity-70 mt-2">
            Da un nombre a tu hogar y empieza a gestionar todo lo de casa juntos.
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

        <form onSubmit={handleSubmit} noValidate className="cz-frame space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="family-name" className="text-xs font-bold uppercase opacity-70 block">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="family-name"
              className="cz-input"
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
            <label htmlFor="family-desc" className="text-xs font-bold uppercase opacity-70 block">
              Descripción <span className="font-normal lowercase">(opcional)</span>
            </label>
            <textarea
              id="family-desc"
              className="cz-input resize-y"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de tu hogar"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="cz-btn-denim w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Fundar casa'}
          </button>
        </form>
      </div>
    </div>
  );
}
