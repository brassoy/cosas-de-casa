/* ─── Vista presentacional cozysitcom — group_create ────────────────────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Reestiliza la vista base de crear peña con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozysitcom.tsx → GroupsCreate): cabecera
 * con placa de madera + titular serif + cinta a rayas, formulario en `cz-frame`
 * con `cz-input` y botón primario denim.
 *
 * Mismo contrato `CreateGroupViewProps`, misma funcionalidad y mismos callbacks
 * que la base. Conserva la validación de formulario local (nombre obligatorio)
 * que ya hacía la base y de la que dependen los tests; el error de negocio
 * (`ApiRequestError`) llega por la prop `error` desde el container.
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
    <div className="cz min-h-[100dvh] px-4 py-10" style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-[520px] mx-auto">
        <header className="mb-5 cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">Nueva peña</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">Crea una peña</h1>
          <p className="text-sm opacity-70 mt-1">
            Ponle nombre a tu grupo y empieza a compartir la experiencia con tus amigos.
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

        <form onSubmit={handleSubmit} noValidate className="cz-frame space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="group-name" className="text-xs font-bold uppercase opacity-70 block">
              Nombre <span aria-hidden="true">*</span>
            </label>
            <input
              id="group-name"
              className="cz-input"
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
            <label htmlFor="group-desc" className="text-xs font-bold uppercase opacity-70 block">
              Descripción <span className="font-normal lowercase">(opcional)</span>
            </label>
            <textarea
              id="group-desc"
              className="cz-input resize-y"
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Una descripción breve de la peña"
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="cz-btn-denim w-full disabled:opacity-60" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear peña'}
          </button>
        </form>
      </div>
    </div>
  );
}
