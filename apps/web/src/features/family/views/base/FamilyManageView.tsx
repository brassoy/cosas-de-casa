/* ─── Vista presentacional base — family_manage ─────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Pantalla "Gestionar
 * familia", accesible a TODO miembro:
 *  - Para todos: lista de miembros (solo lectura) y "Salir de la familia".
 *  - Solo OWNER (si llegan `invite`/`manage`): invitación por PIN, controles de
 *    rol/expulsión en la lista, edición de nombre/descripción y borrado.
 *
 * Toda la lógica (confirmaciones, llamadas a la API, navegación) vive en el
 * container; la vista solo pinta el estado y emite callbacks.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ArrowLeft, Copy, Share2, Trash2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyManageProps, FamilyManageViewProps } from '../types';

export default function FamilyManageView({
  manage,
  invite,
  members,
  membersLoading,
  membersError,
  onLeaveFamily,
  leaveLoading,
  leaveError,
  onBack,
}: FamilyManageViewProps) {
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

      {/* ── Invitar miembros (solo OWNER) ────────────────────────────────── */}
      {invite && (
        <Card className="p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Invitar miembros</h2>
            <p className="text-xs text-muted-foreground">Comparte un PIN de un solo uso.</p>
          </div>

          {invite.pinError && (
            <Alert variant="destructive">
              <AlertDescription>{invite.pinError}</AlertDescription>
            </Alert>
          )}
          {invite.pinRevokeError && (
            <Alert variant="destructive">
              <AlertDescription>{invite.pinRevokeError}</AlertDescription>
            </Alert>
          )}

          {invite.generatedPin ? (
            <InvitePinBox
              pin={invite.generatedPin}
              onCopy={invite.onCopyPin}
              onShare={invite.onShare}
              onRevoke={invite.onRevokePin}
              revoking={invite.pinRevoking}
            />
          ) : (
            <Button
              onClick={invite.onGeneratePin}
              disabled={invite.pinLoading}
              className="w-full h-11"
            >
              {invite.pinLoading ? 'Generando…' : 'Generar PIN'}
            </Button>
          )}
        </Card>
      )}

      {/* ── Miembros: lectura para todos; controles de admin si es OWNER ─── */}
      <section>
        <h2 className="font-semibold mb-3">
          Miembros {members.length ? `(${members.length})` : ''}
        </h2>
        {manage?.memberError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{manage.memberError}</AlertDescription>
          </Alert>
        )}
        <ScreenState
          isLoading={membersLoading}
          error={membersError}
          isEmpty={!members.length}
          emptyTitle="Aún no hay miembros."
          skeleton={<ListSkeleton rows={3} />}
        >
          <ul className="space-y-2 list-none p-0 m-0">
            {members.map((m) => (
              <MemberRow key={m.userId} member={m} manage={manage} />
            ))}
          </ul>
        </ScreenState>
      </section>

      {/* ── Nombre/descripción + zona peligrosa (solo OWNER) ─────────────── */}
      {manage && <OwnerAdminSection manage={manage} />}

      {/* ── Salir de la familia (todos) ──────────────────────────────────── */}
      <section>
        <h2 className="font-semibold mb-3">Salir de la familia</h2>
        {leaveError && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{leaveError}</AlertDescription>
          </Alert>
        )}
        <Button
          variant="destructive"
          onClick={onLeaveFamily}
          disabled={leaveLoading}
          className="h-11"
        >
          {leaveLoading ? 'Saliendo…' : 'Salir de la familia'}
        </Button>
      </section>
    </div>
  );
}

// ── Subcomponente: caja del PIN generado ──────────────────────────────────────

export function InvitePinBox({
  pin,
  onCopy,
  onShare,
  onRevoke,
  revoking,
}: {
  pin: GeneratePinResponse;
  onCopy: () => void;
  onShare: (channel: 'whatsapp' | 'telegram') => void;
  onRevoke?: () => void;
  revoking?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xl tracking-[0.3em] text-center bg-background border border-border rounded-md py-3">
          {pin.code}
        </code>
        <Button
          variant="outline"
          size="icon"
          onClick={onCopy}
          aria-label="Copiar PIN"
          className="h-11 w-11 shrink-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onShare('whatsapp')} className="h-11">
          <Share2 className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        <Button variant="outline" onClick={() => onShare('telegram')} className="h-11">
          <Share2 className="h-4 w-4 mr-2" />
          Telegram
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Caduca: {new Date(pin.expiresAt).toLocaleString('es-ES')}
      </p>
      {onRevoke && (
        <Button
          variant="ghost"
          onClick={onRevoke}
          disabled={revoking}
          className="h-9 text-destructive hover:text-destructive"
        >
          {revoking ? 'Revocando…' : 'Revocar PIN'}
        </Button>
      )}
    </div>
  );
}

// ── Subcomponente: fila de miembro (lectura + controles de admin si OWNER) ───

function MemberRow({
  member,
  manage,
}: {
  member: FamilyMemberDto;
  manage?: FamilyManageProps;
}) {
  const initial = member.displayName.charAt(0).toUpperCase();
  const isSelf = manage ? member.userId === manage.currentUserId : false;
  const busy = manage
    ? manage.roleChangingId === member.userId || manage.removingId === member.userId
    : false;
  const showAdmin = Boolean(manage) && !isSelf;

  return (
    <li className="flex flex-wrap items-center gap-3 p-3 rounded-card bg-card border border-border">
      <div className="h-10 w-10 rounded-full overflow-hidden bg-accent-subtle grid place-items-center font-semibold shrink-0">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-accent">{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{member.displayName}</p>
        <p className="text-xs text-muted-foreground">
          Desde {new Date(member.joinedAt).toLocaleDateString('es-ES')}
        </p>
      </div>
      {showAdmin && manage ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`role-${member.userId}`}>
            Rol de {member.displayName}
          </label>
          <select
            id={`role-${member.userId}`}
            value={member.role}
            disabled={busy}
            onChange={(e) =>
              manage.onChangeRole(member.userId, e.target.value as FamilyMemberDto['role'])
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-50"
            aria-label={`Rol de ${member.displayName}`}
          >
            <option value="OWNER">Propietario</option>
            <option value="MEMBER">Miembro</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => manage.onRemoveMember(member.userId)}
            className="text-destructive hover:text-destructive"
            aria-label={`Expulsar a ${member.displayName}`}
          >
            {manage.removingId === member.userId ? 'Expulsando…' : 'Expulsar'}
          </Button>
        </div>
      ) : (
        <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
          {member.role === 'OWNER' ? 'Propietario' : 'Miembro'}
        </Badge>
      )}
    </li>
  );
}

// ── Subcomponente: administración del OWNER (nombre/descr. + borrado) ────────

function OwnerAdminSection({ manage }: { manage: FamilyManageProps }) {
  const {
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
    <section aria-labelledby="owner-admin-heading" className="space-y-5">
      <h2 id="owner-admin-heading" className="sr-only">
        Administración de la familia
      </h2>

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
