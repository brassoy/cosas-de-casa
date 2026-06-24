/* ─── Vista presentacional springfield — group_settings (ajustes de peña) ────
 *
 * Theme `springfield` ("Cómic pop"). Saca de la home del detalle de peña
 * (`group_home`) las acciones de gestión y salida a su propia pantalla: editar la
 * peña y borrarla (solo OWNER), y salir de la peña (cualquier miembro). Espejo de
 * `family_manage`, con la estética del kit (`sf-card`, `sf-btn-*`, Bangers).
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

const INK = '#1A1A1A';

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
    <div className="sf min-h-[100dvh] px-5 py-6" style={{ background: '#FFF3C4' }}>
      <div className="max-w-[520px] mx-auto">
        {/* ── Cabecera (sf-card-y + sticker "← Atrás" + Bangers) ── */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <button
            type="button"
            onClick={onBack}
            className="sf-sticker"
            style={{ background: '#fff' }}
            aria-label="Volver a la peña"
          >
            ← Atrás
          </button>
          <h1 className="sf-bangers text-4xl leading-none mt-1">Ajustes de la peña</h1>
          <p className="sf-fredoka text-sm mt-1">{groupName}</p>
          <Lightning className="absolute -top-3 right-3 w-7 sf-wob" />
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
        <section aria-labelledby="leave-heading">
          <p id="leave-heading" className="sf-bangers text-xl mb-2">
            Salir de la peña
          </p>
          {leaveError && (
            <p
              role="alert"
              className="sf-card p-3 mb-3 text-sm font-bold"
              style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
            >
              {leaveError}
            </p>
          )}
          {confirmLeave ? (
            <div className="sf-card p-4 space-y-3">
              <p className="sf-fredoka text-sm">¿Seguro que quieres salir de esta peña?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="sf-btn sf-btn-r disabled:opacity-60"
                  onClick={handleLeave}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Saliendo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn-w disabled:opacity-60"
                  onClick={() => setConfirmLeave(false)}
                  disabled={leaveLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="sf-btn sf-btn-r" onClick={handleLeave}>
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
    <section className="mb-4" aria-labelledby="edit-heading">
      <p id="edit-heading" className="sf-bangers text-xl mb-2">
        Editar peña
      </p>
      {error && (
        <p
          role="alert"
          className="sf-card p-3 mb-3 text-sm font-bold"
          style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
        >
          {error}
        </p>
      )}
      <form className="sf-card p-3 space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sf-fredoka text-sm block mb-1">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="sf-input"
            aria-label="Nombre de la peña"
          />
        </label>
        <label className="block">
          <span className="sf-fredoka text-sm block mb-1">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="sf-input resize-y"
            aria-label="Descripción de la peña"
          />
        </label>
        <button type="submit" className="sf-btn sf-btn-r disabled:opacity-60" disabled={loading}>
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
    <section className="mb-4" aria-labelledby="delete-heading">
      <p id="delete-heading" className="sf-bangers text-xl mb-2" style={{ color: '#E53935' }}>
        Borrar peña
      </p>
      <p className="sf-fredoka text-sm mb-2">
        Se borra la peña entera. Esta acción no se puede deshacer.
      </p>
      {error && (
        <p
          role="alert"
          className="sf-card p-3 mb-3 text-sm font-bold"
          style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
        >
          {error}
        </p>
      )}
      {confirm ? (
        <div className="sf-card p-4 space-y-3">
          <p className="sf-fredoka text-sm">¿Seguro que quieres borrar esta peña para siempre?</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="sf-btn sf-btn-r disabled:opacity-60"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Borrando…' : 'Sí, borrar peña'}
            </button>
            <button
              type="button"
              className="sf-btn sf-btn-w disabled:opacity-60"
              onClick={() => setConfirm(false)}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="sf-btn sf-btn-r" onClick={handleDelete}>
          Borrar peña
        </button>
      )}
    </section>
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
