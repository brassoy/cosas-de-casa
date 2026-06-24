/* ─── Vista presentacional base — family_manage ─────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Pantalla "Gestionar
 * familia" (solo OWNER): reúne las tres acciones de administración —gestión de
 * miembros (cambiar rol / expulsar), edición del nombre y descripción, y borrado
 * de la familia—, extraídas de la home a su propia pantalla.
 *
 * Toda la lógica (confirmaciones, llamadas a la API, navegación) vive en el
 * container; la vista solo pinta el estado y emite callbacks.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ArrowLeft, Trash2, UserCog } from 'lucide-react';
import type { FamilyMemberDto } from '@cosasdecasa/contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import type { FamilyManageProps, FamilyManageViewProps } from '../types';

export default function FamilyManageView({ manage, members, onBack }: FamilyManageViewProps) {
  return (
    <div className="mx-auto max-w-[640px] p-4 space-y-8">
      <header className="border-b border-border pb-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0"
          aria-label="Volver a la familia"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Familia
        </Button>
        <h1 className="text-2xl font-bold truncate">Gestionar familia</h1>
      </header>

      <FamilyManageSection manage={manage} members={members} />
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
    <section aria-labelledby="manage-family-heading" className="space-y-5">
      <div className="flex items-center gap-2">
        <UserCog className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="manage-family-heading" className="font-semibold">
          Gestionar familia
        </h2>
      </div>

      {/* — Gestión de miembros — */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Miembros</h3>
        {memberError && (
          <Alert variant="destructive">
            <AlertDescription>{memberError}</AlertDescription>
          </Alert>
        )}
        <ul className="space-y-2 list-none p-0 m-0">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const busy = roleChangingId === m.userId || removingId === m.userId;
            return (
              <li
                key={m.userId}
                className="flex flex-wrap items-center gap-2 p-2 rounded-card border border-border"
              >
                <span className="flex-1 min-w-0 truncate font-medium">{m.displayName}</span>
                <label className="sr-only" htmlFor={`role-${m.userId}`}>
                  Rol de {m.displayName}
                </label>
                <select
                  id={`role-${m.userId}`}
                  value={m.role}
                  disabled={isSelf || busy}
                  onChange={(e) =>
                    onChangeRole(m.userId, e.target.value as FamilyMemberDto['role'])
                  }
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
                  aria-label={`Rol de ${m.displayName}`}
                >
                  <option value="OWNER">Propietario</option>
                  <option value="MEMBER">Miembro</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSelf || busy}
                  onClick={() => onRemoveMember(m.userId)}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Expulsar a ${m.displayName}`}
                >
                  {removingId === m.userId ? 'Expulsando…' : 'Expulsar'}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* — Editar nombre/descripción — */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Nombre y descripción</h3>
        {detailsError && (
          <Alert variant="destructive">
            <AlertDescription>{detailsError}</AlertDescription>
          </Alert>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="family-name" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="family-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-md border border-border bg-background px-3"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="family-description" className="text-sm font-medium">
              Descripción
            </label>
            <textarea
              id="family-description"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </div>
          <Button
            type="submit"
            disabled={detailsSaving || !dirty || !name.trim()}
            className="h-11"
          >
            {detailsSaving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </Card>

      {/* — Borrar la familia — */}
      <Card className="p-4 space-y-3 border-destructive/40">
        <h3 className="text-sm font-semibold text-destructive">Zona peligrosa</h3>
        <p className="text-xs text-muted-foreground">
          Borrar la familia elimina sus listas, tareas y datos para todos los miembros. Esta
          acción no se puede deshacer.
        </p>
        {deleteError && (
          <Alert variant="destructive">
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}
        <Button
          type="button"
          variant="destructive"
          disabled={deleteLoading}
          onClick={onDeleteFamily}
          className="h-11"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleteLoading ? 'Borrando…' : 'Borrar la familia'}
        </Button>
      </Card>
    </section>
  );
}
