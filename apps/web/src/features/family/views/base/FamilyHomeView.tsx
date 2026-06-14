/* ─── Vista presentacional base — family_home ───────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Home del hogar: accesos
 * rápidos, notificaciones, invitación por PIN (solo OWNER) y lista de miembros.
 *
 * Reconciliación con la app real:
 *  - El kit leía `HOME_ITEMS`/`SOCIAL_ITEMS` de su `AppShell`; aquí el grid lo
 *    construye el container y llega por la prop `quickAccess`.
 *  - `members` es `FamilyMemberDto[]` real; `generatedPin` es `GeneratePinResponse`.
 *  - Notificaciones como props puras (plan §7.E): la vista pinta el estado y
 *    emite `onToggleNotifications`; nada de `NotificationToggle` real aquí.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { Bell, BellOff, Copy, Share2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyHomeViewProps } from '../types';

export default function FamilyHomeView(props: FamilyHomeViewProps) {
  const {
    familyName,
    isOwner,
    members,
    membersLoading,
    membersError,
    quickAccess,
    generatedPin,
    pinLoading,
    pinError,
    notificationsEnabled,
    notificationsDisabled,
    notificationsHint,
    notificationsLoading,
    onToggleNotifications,
    onGeneratePin,
    onCopyPin,
    onShare,
    onOpen,
  } = props;

  return (
    <div className="mx-auto max-w-[640px] p-4 space-y-8">
      <header className="border-b border-border pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu hogar</p>
        <h1 className="text-2xl font-bold truncate">{familyName}</h1>
      </header>

      {/* ── Accesos rápidos ──────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickAccess.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => onOpen(tile.id)}
              className="aspect-[4/3] min-h-[88px] rounded-card border border-border bg-card hover:bg-accent active:scale-[0.98] transition flex flex-col items-center justify-center gap-2 p-3 text-center"
            >
              <span className="text-3xl" aria-hidden="true">
                {tile.emoji}
              </span>
              <span className="text-sm font-medium leading-tight">{tile.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Notificaciones (props puras) ─────────────────────────────────── */}
      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {notificationsEnabled ? (
            <Bell className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="font-medium">Notificaciones</p>
            <p className="text-xs text-muted-foreground">
              {notificationsHint ?? 'Avisos del hogar en este dispositivo.'}
            </p>
          </div>
        </div>
        <Switch
          checked={notificationsEnabled}
          onCheckedChange={onToggleNotifications}
          disabled={notificationsDisabled || notificationsLoading}
          aria-label="Activar notificaciones"
        />
      </Card>

      {/* ── Invitar miembros (solo OWNER) ────────────────────────────────── */}
      {isOwner && (
        <Card className="p-4 space-y-3">
          <div>
            <h2 className="font-semibold">Invitar miembros</h2>
            <p className="text-xs text-muted-foreground">Comparte un PIN de un solo uso.</p>
          </div>

          {pinError && (
            <Alert variant="destructive">
              <AlertDescription>{pinError}</AlertDescription>
            </Alert>
          )}

          {generatedPin ? (
            <InvitePinBox pin={generatedPin} onCopy={onCopyPin} onShare={onShare} />
          ) : (
            <Button onClick={onGeneratePin} disabled={pinLoading} className="w-full h-11">
              {pinLoading ? 'Generando…' : 'Generar PIN'}
            </Button>
          )}
        </Card>
      )}

      {/* ── Miembros ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold mb-3">
          Miembros {members.length ? `(${members.length})` : ''}
        </h2>
        <ScreenState
          isLoading={membersLoading}
          error={membersError}
          isEmpty={!members.length}
          emptyTitle="Aún no hay miembros."
          skeleton={<ListSkeleton rows={3} />}
        >
          <ul className="space-y-2 list-none p-0 m-0">
            {members.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </ul>
        </ScreenState>
      </section>
    </div>
  );
}

// ── Subcomponente: caja del PIN generado ──────────────────────────────────────

export function InvitePinBox({
  pin,
  onCopy,
  onShare,
}: {
  pin: GeneratePinResponse;
  onCopy: () => void;
  onShare: (channel: 'whatsapp' | 'telegram') => void;
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
    </div>
  );
}

// ── Subcomponente: fila de miembro ────────────────────────────────────────────

function MemberRow({ member }: { member: FamilyMemberDto }) {
  const initial = member.displayName.charAt(0).toUpperCase();
  return (
    <li className="flex items-center gap-3 p-3 rounded-card bg-card border border-border">
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
      <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
        {member.role === 'OWNER' ? 'Propietario' : 'Miembro'}
      </Badge>
    </li>
  );
}
