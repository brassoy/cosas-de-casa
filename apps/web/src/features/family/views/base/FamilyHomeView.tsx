/* ─── Vista presentacional base — family_home ───────────────────────────────
 *
 * Theme `base` (estética shadcn del kit de Lovable). Home del hogar: cabecera
 * clicable que lleva a "Gestionar familia", accesos rápidos y notificaciones.
 *
 * La invitación por PIN, la lista de miembros y "Salir de la familia" viven
 * ahora en la pantalla "Gestionar familia" (`FamilyManageView`).
 *
 * Reconciliación con la app real:
 *  - El kit leía `HOME_ITEMS`/`SOCIAL_ITEMS` de su `AppShell`; aquí el grid lo
 *    construye el container y llega por la prop `quickAccess`.
 *  - Notificaciones como props puras (plan §7.E): la vista pinta el estado y
 *    emite `onToggleNotifications`; nada de `NotificationToggle` real aquí.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Switch } from '@/shared/ui/switch';
import type { FamilyHomeViewProps } from '../types';

export default function FamilyHomeView(props: FamilyHomeViewProps) {
  const {
    familyName,
    quickAccess,
    notificationsEnabled,
    notificationsDisabled,
    notificationsHint,
    notificationsLoading,
    onToggleNotifications,
    onOpen,
    onManageFamily,
  } = props;

  return (
    <div className="mx-auto max-w-[640px] p-4 space-y-8">
      {/* ── Cabecera clicable → Gestionar familia ────────────────────────── */}
      <header className="relative border-b border-border pb-4 rounded-md transition hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring">
        <div className="flex items-center justify-between gap-3 pr-1">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tu hogar</p>
            <h1 className="text-2xl font-bold truncate">{familyName}</h1>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {/* Botón extendido: hace clicable toda la cabecera sin meter el h1 en un button. */}
        <button
          type="button"
          onClick={onManageFamily}
          aria-label="Gestionar familia"
          className="absolute inset-0 cursor-pointer rounded-md focus:outline-none"
        />
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
    </div>
  );
}
