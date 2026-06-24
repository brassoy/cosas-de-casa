/* ─── Vista presentacional cozysitcom — group_settings (ajustes de peña) ─────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s"). Saca de la home del detalle de peña
 * (`group_home`) las acciones de gestión y salida a su propia pantalla: editar la
 * peña y borrarla (solo OWNER), y salir de la peña (cualquier miembro). Espejo de
 * `family_manage`, con la estética del kit (`cz-frame`, `cz-btn-*`, serif).
 *
 * Reparto container ↔ vista:
 *  - El CONTAINER ejecuta las mutaciones (editar, borrar, salir), resuelve el rol
 *    OWNER y el `groupName`, y pasa los datos/estados por props.
 *  - La VISTA mantiene el estado de UI puro: el formulario de edición controlado y
 *    la confirmación en 2 toques de salir/borrar.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { GroupSettingsViewProps } from '../types';

export default function GroupSettingsView({
  groupName,
  isOwner,
  onUpdateGroup,
  groupDescription,
  updateLoading,
  updateError,
  onDeleteGroup,
  deleteLoading,
  deleteError,
  onLeave,
  leaveLoading,
  leaveError,
  onBack,
}: GroupSettingsViewProps) {
  const [confirmLeave, setConfirmLeave] = useState(false);

  function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    onLeave();
  }

  return (
    <div className="cz min-h-[100dvh] px-4 py-8" style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-[520px] mx-auto flex flex-col gap-6">
        {/* ── Cabecera ── */}
        <header className="cz-pop">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold opacity-70 mb-2 hover:opacity-100"
            aria-label="Volver a la peña"
          >
            ← Atrás
          </button>
          <div className="cz-wood inline-block mb-2 block w-fit">
            <p className="cz-serif text-base">Ajustes</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">{groupName}</h1>
          <div className="cz-stripe mt-3" />
        </header>

        {/* ── Editar peña (solo OWNER) ── */}
        {isOwner && onUpdateGroup && (
          <EditGroupSection
            groupName={groupName}
            groupDescription={groupDescription}
            loading={updateLoading}
            error={updateError}
            onSave={onUpdateGroup}
          />
        )}

        {/* ── Borrar peña (solo OWNER) ── */}
        {isOwner && onDeleteGroup && (
          <DeleteGroupSection
            loading={deleteLoading}
            error={deleteError}
            onDelete={onDeleteGroup}
          />
        )}

        {/* ── Salir de la peña ── */}
        <section className="flex flex-col gap-3" aria-labelledby="leave-heading">
          <h2 id="leave-heading" className="cz-serif text-xl">
            Salir de la peña
          </h2>
          {leaveError && (
            <p
              role="alert"
              className="cz-paper p-3 text-sm font-bold"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {leaveError}
            </p>
          )}
          {confirmLeave ? (
            <div className="cz-frame flex flex-col gap-3">
              <p className="text-sm opacity-70">¿Seguro que quieres salir de esta peña?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="cz-btn-garnet disabled:opacity-60"
                  onClick={handleLeave}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Saliendo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="cz-btn-ghost disabled:opacity-60"
                  onClick={() => setConfirmLeave(false)}
                  disabled={leaveLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="cz-btn-garnet self-start" onClick={handleLeave}>
              Salir de la peña
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

interface EditGroupSectionProps {
  groupName: string;
  groupDescription?: string;
  loading?: boolean;
  error?: string | null;
  onSave: (input: { name?: string; description?: string }) => void;
}

function EditGroupSection({
  groupName,
  groupDescription,
  loading,
  error,
  onSave,
}: EditGroupSectionProps) {
  const [name, setName] = useState(groupName);
  const [description, setDescription] = useState(groupDescription ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    onSave({
      name: trimmedName ? trimmedName : undefined,
      description: description.trim(),
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="edit-heading">
      <h2 id="edit-heading" className="cz-serif text-xl">
        Editar peña
      </h2>
      {error && (
        <p
          role="alert"
          className="cz-paper p-3 text-sm font-bold"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}
      <form className="cz-frame space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-xs font-bold uppercase opacity-70 block mb-1">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="cz-input"
            aria-label="Nombre de la peña"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase opacity-70 block mb-1">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="cz-input resize-y"
            aria-label="Descripción de la peña"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="cz-btn-denim self-start disabled:opacity-60"
        >
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </section>
  );
}

interface DeleteGroupSectionProps {
  loading?: boolean;
  error?: string | null;
  onDelete: () => void;
}

function DeleteGroupSection({ loading, error, onDelete }: DeleteGroupSectionProps) {
  const [confirm, setConfirm] = useState(false);

  function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    onDelete();
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="cz-serif text-xl" style={{ color: 'var(--color-error)' }}>
        Borrar peña
      </h2>
      <p className="text-sm opacity-70">
        Se borra la peña entera. Esta acción no se puede deshacer.
      </p>
      {error && (
        <p
          role="alert"
          className="cz-paper p-3 text-sm font-bold"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}
      {confirm ? (
        <div className="cz-frame flex flex-col gap-3">
          <p className="text-sm opacity-70">¿Seguro que quieres borrar esta peña para siempre?</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="cz-btn-garnet disabled:opacity-60"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Borrando…' : 'Sí, borrar peña'}
            </button>
            <button
              type="button"
              className="cz-btn-ghost disabled:opacity-60"
              onClick={() => setConfirm(false)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="cz-btn-garnet self-start" onClick={handleDelete}>
          Borrar peña
        </button>
      )}
    </section>
  );
}
