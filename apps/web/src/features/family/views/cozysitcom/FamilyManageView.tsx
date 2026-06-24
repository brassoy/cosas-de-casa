/* ─── Vista presentacional cozysitcom — family_manage ───────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Pantalla "Gestionar
 * familia" (solo OWNER): gestión de miembros (cambiar rol / expulsar), edición
 * del nombre y descripción, y borrado de la familia. Extraída de la home a su
 * propia pantalla.
 *
 * Toda la lógica (confirmaciones, llamadas a la API, navegación) vive en el
 * container; la vista solo pinta el estado y emite callbacks.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import type { FamilyManageProps, FamilyManageViewProps } from '../types';

export default function FamilyManageView({ manage, members, onBack }: FamilyManageViewProps) {
  return (
    <div className="cz min-h-[80dvh] px-5 py-8" style={{ background: '#FFF8EA' }}>
      <div className="max-w-[640px] mx-auto space-y-8">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="cz-pop flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="cz-btn-ghost shrink-0 flex items-center gap-1 !px-3"
            aria-label="Volver a la familia"
          >
            <ArrowLeft className="h-4 w-4" />
            Familia
          </button>
          <h1 className="cz-serif text-3xl leading-none truncate">Gestionar familia</h1>
        </header>

        <FamilyManageSection manage={manage} members={members} />
      </div>
    </div>
  );
}

// ── Subcomponente: sección "Gestionar familia" (solo OWNER) ───────────────────

function FamilyManageSection({
  manage,
  members,
}: {
  manage: FamilyManageProps;
  members: FamilyMemberDto[];
}) {
  const {
    onChangeRole,
    onRemoveMember,
    currentUserId,
    roleChangingId,
    removingId,
    memberError,
    initialName,
    initialDescription,
    onSaveDetails,
    detailsSaving,
    detailsError,
    onDeleteFamily,
    deleteLoading,
    deleteError,
  } = manage;

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const dirty = name.trim() !== initialName || description.trim() !== initialDescription;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: { name?: string; description?: string } = {};
    if (name.trim() !== initialName) input.name = name.trim();
    if (description.trim() !== initialDescription) input.description = description.trim();
    if (input.name === undefined && input.description === undefined) return;
    onSaveDetails(input);
  }

  return (
    <section aria-labelledby="manage-family-heading" className="space-y-4">
      <h2 id="manage-family-heading" className="sr-only">
        Gestionar familia
      </h2>

      {/* — Gestión de miembros — */}
      <div className="cz-frame space-y-3">
        <h3 className="cz-serif text-lg">Miembros</h3>
        {memberError && (
          <div role="alert" style={{ color: '#A63A3A' }}>
            <p className="font-bold text-sm">{memberError}</p>
          </div>
        )}
        <ul className="space-y-2 list-none p-0 m-0">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const busy = roleChangingId === m.userId || removingId === m.userId;
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0 truncate cz-serif">{m.displayName}</span>
                <select
                  value={m.role}
                  disabled={isSelf || busy}
                  onChange={(e) =>
                    onChangeRole(m.userId, e.target.value as FamilyMemberDto['role'])
                  }
                  className="cz-input !py-1 !px-2 text-sm disabled:opacity-50"
                  aria-label={`Rol de ${m.displayName}`}
                >
                  <option value="OWNER">Propietario</option>
                  <option value="MEMBER">Miembro</option>
                </select>
                <button
                  type="button"
                  disabled={isSelf || busy}
                  onClick={() => onRemoveMember(m.userId)}
                  className="text-sm font-bold underline disabled:opacity-40"
                  style={{ color: '#A63A3A' }}
                  aria-label={`Expulsar a ${m.displayName}`}
                >
                  {removingId === m.userId ? 'Expulsando…' : 'Expulsar'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* — Editar nombre/descripción — */}
      <div className="cz-frame space-y-3">
        <h3 className="cz-serif text-lg">Nombre y descripción</h3>
        {detailsError && (
          <div role="alert" style={{ color: '#A63A3A' }}>
            <p className="font-bold text-sm">{detailsError}</p>
          </div>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="family-name" className="text-xs uppercase tracking-wide opacity-70">
              Nombre
            </label>
            <input
              id="family-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="cz-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="family-description"
              className="text-xs uppercase tracking-wide opacity-70"
            >
              Descripción
            </label>
            <textarea
              id="family-description"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="cz-input w-full"
            />
          </div>
          <button
            type="submit"
            disabled={detailsSaving || !dirty || !name.trim()}
            className="cz-btn-denim disabled:opacity-60"
          >
            {detailsSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* — Borrar la familia — */}
      <div className="cz-frame space-y-3">
        <h3 className="cz-serif text-lg" style={{ color: '#A63A3A' }}>
          Zona peligrosa
        </h3>
        <p className="text-xs opacity-70">
          Borrar la familia elimina sus listas, tareas y datos para todos los miembros. Esta
          acción no se puede deshacer.
        </p>
        {deleteError && (
          <div role="alert" style={{ color: '#A63A3A' }}>
            <p className="font-bold text-sm">{deleteError}</p>
          </div>
        )}
        <button
          type="button"
          disabled={deleteLoading}
          onClick={onDeleteFamily}
          className="cz-btn-garnet disabled:opacity-60"
        >
          {deleteLoading ? 'Borrando…' : 'Borrar la familia'}
        </button>
      </div>
    </section>
  );
}
