/* ─── Vista presentacional cozy — group_settings (ajustes de peña) ───────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito"). Saca de la home del detalle de
 * peña (`group_home`) las acciones de gestión y salida a su propia pantalla:
 * editar la peña y borrarla (solo OWNER), y salir de la peña (cualquier miembro).
 * Espejo de `family_manage`, con la estética del kit (notas `ck-card`, botones
 * `ck-btn`, tipografías manuscritas).
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
    <div className="ck ck-page min-h-[100dvh]">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-24 flex flex-col gap-6">
        {/* ── Cabecera ── */}
        <header className="text-center relative mb-2">
          <button
            type="button"
            onClick={onBack}
            className="ck-marker text-xl absolute left-0 top-0 text-accent hover:opacity-80"
            aria-label="Volver a la peña"
          >
            ← atrás
          </button>
          <p className="ck-marker text-base opacity-70">— ajustes de la peña —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">{groupName}</h1>
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
          <h2 id="leave-heading" className="ck-marker text-2xl text-accent">
            salir de la peña
          </h2>
          {leaveError && (
            <p
              role="alert"
              className="ck-card p-3 ck-marker text-xl"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {leaveError}
            </p>
          )}
          {confirmLeave ? (
            <div className="ck-card p-4 flex flex-col gap-3">
              <p className="text-base opacity-80">¿Seguro que quieres salir de esta peña?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ck-btn ck-btn-red disabled:opacity-60"
                  onClick={handleLeave}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Saliendo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="ck-btn disabled:opacity-60"
                  onClick={() => setConfirmLeave(false)}
                  disabled={leaveLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="ck-btn ck-btn-red self-start"
              onClick={handleLeave}
            >
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
      <h2 id="edit-heading" className="ck-marker text-2xl text-accent">
        editar la peña
      </h2>
      {error && (
        <p
          role="alert"
          className="ck-card p-3 ck-marker text-xl"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}
      <form className="ck-card p-4 flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span className="ck-marker text-xl text-accent">nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="ck-input"
            aria-label="Nombre de la peña"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ck-marker text-xl text-accent">descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="ck-input"
            aria-label="Descripción de la peña"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="ck-btn ck-btn-blue self-start disabled:opacity-60"
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
      <h2 id="delete-heading" className="ck-marker text-2xl text-error">
        borrar la peña
      </h2>
      <p className="text-base opacity-80">
        Se borra la peña entera. Esto no tiene vuelta atrás.
      </p>
      {error && (
        <p
          role="alert"
          className="ck-card p-3 ck-marker text-xl"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          {error}
        </p>
      )}
      {confirm ? (
        <div className="ck-card p-4 flex flex-col gap-3">
          <p className="text-base opacity-80">¿Seguro que quieres borrar esta peña para siempre?</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="ck-btn ck-btn-red disabled:opacity-60"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Borrando…' : 'Sí, borrar peña'}
            </button>
            <button
              type="button"
              className="ck-btn disabled:opacity-60"
              onClick={() => setConfirm(false)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ck-btn ck-btn-red self-start" onClick={handleDelete}>
          Borrar peña
        </button>
      )}
    </section>
  );
}
