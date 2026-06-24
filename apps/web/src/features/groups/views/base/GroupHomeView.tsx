/**
 * GroupHomeView — vista presentacional `base` (shadcn) del detalle de peña.
 *
 * Equivale a un `family_home` reducido: cabecera con nombre, volver y acceso a
 * "Ajustes", sección de miembros (con gestión de rol/expulsar para el OWNER) y
 * sección "invitar" (solo OWNER) con generación y compartición de PIN.
 *
 * Las acciones de editar, borrar y salir de la peña viven en su propia pantalla
 * (`group_settings`), accesible desde el botón "⚙️ Ajustes" de la cabecera.
 *
 * Reparto container ↔ vista:
 *  - El CONTAINER ejecuta las mutaciones (generar PIN, gestión de miembros),
 *    resuelve el rol OWNER y el `groupName`, y pasa los datos/estados por props.
 *  - La VISTA mantiene el estado de UI puro: copiado al portapapeles y enlaces de
 *    compartir (WhatsApp/Telegram).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupMemberDto, GroupRole } from '../../contracts';
import type { GroupHomeViewProps } from '../types';

function buildShareText(pin: string): string {
  return `¡Únete a mi peña en Cosas de Casa! Usa el PIN: ${pin}`;
}

export default function GroupHomeView({
  groupName,
  isOwner,
  members,
  membersLoading,
  membersError,
  generatedPin,
  pinLoading,
  pinError,
  pinRevoking,
  pinRevokeError,
  onBack,
  onGeneratePin,
  onRevokePin,
  onOpenSettings,
  currentUserId,
  onChangeMemberRole,
  changingRoleUserId,
  onExpelMember,
  expellingUserId,
}: GroupHomeViewProps) {
  // El usuario gestiona si es OWNER y el container cableó los callbacks.
  const canManage = isOwner && Boolean(onChangeMemberRole || onExpelMember);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {/* ── Cabecera ── */}
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm text-primary hover:underline"
          aria-label="Volver a mis peñas"
        >
          ← Mis peñas
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-3xl font-bold">{groupName}</h2>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            ⚙️ Ajustes
          </Button>
        </div>
      </header>

      {/* ── Miembros ── */}
      <section className="flex flex-col gap-4" aria-labelledby="members-heading">
        <h3 id="members-heading" className="text-lg font-semibold">
          Miembros {members ? `(${members.length})` : ''}
        </h3>
        <ScreenState
          isLoading={membersLoading}
          error={membersError ?? undefined}
          isEmpty={!membersLoading && !membersError && (members?.length ?? 0) === 0}
          emptyTitle="Todavía no hay miembros en esta peña."
        >
          <ul className="flex flex-col gap-2" aria-label="Miembros de la peña">
            {members?.map((m) => (
              <li key={m.userId}>
                <MemberRow
                  member={m}
                  canManage={canManage && m.userId !== currentUserId}
                  onChangeRole={onChangeMemberRole}
                  changingRole={changingRoleUserId === m.userId}
                  onExpel={onExpelMember}
                  expelling={expellingUserId === m.userId}
                />
              </li>
            ))}
          </ul>
        </ScreenState>
      </section>

      {/* ── Invitar (solo OWNER) ── */}
      {isOwner && (
        <section className="flex flex-col gap-4" aria-labelledby="invite-heading">
          <h3 id="invite-heading" className="text-lg font-semibold">
            Invitar miembros
          </h3>
          <Button onClick={onGeneratePin} disabled={pinLoading} className="self-start">
            {pinLoading ? 'Generando…' : 'Generar PIN'}
          </Button>
          {pinError && (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {pinError}
            </p>
          )}
          {pinRevokeError && (
            <p
              role="alert"
              className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            >
              {pinRevokeError}
            </p>
          )}
          {generatedPin && <PinShare pin={generatedPin} />}
          {onRevokePin && (
            <Button
              variant="ghost"
              onClick={onRevokePin}
              disabled={pinRevoking}
              className="self-start text-destructive hover:text-destructive"
            >
              {pinRevoking ? 'Revocando…' : 'Revocar PIN'}
            </Button>
          )}
        </section>
      )}

    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

interface MemberRowProps {
  member: GroupMemberDto;
  /** ¿Mostrar los controles de gestión (cambiar rol, expulsar) para este miembro? */
  canManage?: boolean;
  onChangeRole?: (userId: string, role: GroupRole) => void;
  changingRole?: boolean;
  onExpel?: (userId: string) => void;
  expelling?: boolean;
}

function MemberRow({
  member,
  canManage,
  onChangeRole,
  changingRole,
  onExpel,
  expelling,
}: MemberRowProps) {
  const roleLabel = member.role === 'OWNER' ? 'Propietario' : 'Miembro';
  const nextRole: GroupRole = member.role === 'OWNER' ? 'MEMBER' : 'OWNER';
  const roleActionLabel = member.role === 'OWNER' ? 'Hacer miembro' : 'Hacer propietario';

  return (
    <Card className="flex flex-wrap items-center gap-3 p-3">
      <MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{member.displayName}</p>
      </div>
      <Badge variant="secondary">{roleLabel}</Badge>
      {canManage && (
        <div className="flex w-full gap-2 sm:w-auto">
          {onChangeRole && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeRole(member.userId, nextRole)}
              disabled={changingRole || expelling}
            >
              {changingRole ? 'Guardando…' : roleActionLabel}
            </Button>
          )}
          {onExpel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExpel(member.userId)}
              disabled={changingRole || expelling}
              className="text-destructive hover:text-destructive"
            >
              {expelling ? 'Expulsando…' : 'Expulsar'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-subtle text-lg font-bold text-accent">
      <span aria-hidden="true">{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function PinShare({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(pin);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(
    window.location.origin,
  )}&text=${encodeURIComponent(text)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">PIN generado</p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-bold tracking-[0.2em]">{pin}</span>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </Button>
      </div>
      <div className="flex gap-4">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Compartir por WhatsApp
        </a>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Compartir por Telegram
        </a>
      </div>
    </Card>
  );
}
