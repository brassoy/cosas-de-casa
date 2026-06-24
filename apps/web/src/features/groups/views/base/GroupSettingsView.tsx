/**
 * GroupSettingsView — vista presentacional `base` (shadcn) de los ajustes de peña.
 *
 * Saca de la home del detalle de peña (`group_home`) las acciones de gestión y
 * salida a su propia pantalla: editar la peña y borrarla (solo OWNER), y salir de
 * la peña (cualquier miembro). Espejo de `family_manage`.
 *
 * Reparto container ↔ vista:
 *  - El CONTAINER ejecuta las mutaciones (editar, borrar, salir), resuelve el rol
 *    OWNER y el `groupName`, y pasa los datos/estados por props.
 *  - La VISTA mantiene el estado de UI puro: el formulario de edición controlado y
 *    la confirmación en 2 toques de salir/borrar (es feedback de interfaz: el
 *    primer toque arma, el segundo llama al callback).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
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
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {/* ── Cabecera ── */}
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm text-primary hover:underline"
          aria-label="Volver a la peña"
        >
          ← Atrás
        </button>
        <h2 className="text-3xl font-bold">Ajustes de la peña</h2>
        <p className="text-muted-foreground">{groupName}</p>
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
      <section className="flex flex-col gap-4" aria-labelledby="leave-heading">
        <h3 id="leave-heading" className="text-lg font-semibold">
          Salir de la peña
        </h3>
        {leaveError && (
          <p
            role="alert"
            className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          >
            {leaveError}
          </p>
        )}
        {confirmLeave ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que quieres salir de esta peña?
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleLeave} disabled={leaveLoading}>
                {leaveLoading ? 'Saliendo…' : 'Confirmar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmLeave(false)}
                disabled={leaveLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="destructive" onClick={handleLeave} className="self-start">
            Salir de la peña
          </Button>
        )}
      </section>
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
    const trimmedDesc = description.trim();
    onSave({
      name: trimmedName ? trimmedName : undefined,
      description: trimmedDesc,
    });
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="edit-heading">
      <h3 id="edit-heading" className="text-lg font-semibold">
        Editar peña
      </h3>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="rounded-md border border-border bg-background p-2"
            aria-label="Nombre de la peña"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Descripción</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="rounded-md border border-border bg-background p-2"
            aria-label="Descripción de la peña"
          />
        </label>
        <Button type="submit" disabled={loading} className="self-start">
          {loading ? 'Guardando…' : 'Guardar cambios'}
        </Button>
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
    <section className="flex flex-col gap-4" aria-labelledby="delete-heading">
      <h3 id="delete-heading" className="text-lg font-semibold text-destructive">
        Borrar peña
      </h3>
      <p className="text-sm text-muted-foreground">
        Borra la peña y todo su contenido. Esta acción no se puede deshacer.
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {confirm ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres borrar esta peña para siempre?
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Borrando…' : 'Sí, borrar peña'}
            </Button>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="destructive" onClick={handleDelete} className="self-start">
          Borrar peña
        </Button>
      )}
    </section>
  );
}
