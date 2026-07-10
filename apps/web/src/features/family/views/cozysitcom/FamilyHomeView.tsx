/* ─── Vista presentacional cozysitcom — family_home ─────────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Home del hogar:
 * cabecera clicable que lleva a "Gestionar familia", accesos rápidos y
 * notificaciones.
 *
 * La invitación por PIN, la lista de miembros y "Salir de la familia" viven
 * ahora en la pantalla "Gestionar familia" (`FamilyManageView`).
 *
 * Sub-flujos preservados:
 *  - Notificaciones como props puras (plan §7.E): se pinta el estado y se emite
 *    `onToggleNotifications` con un toggle accesible nativo (no `Switch` shadcn).
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { Bell, BellOff, ChevronRight } from 'lucide-react';
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
    <div className="cz min-h-[80dvh] px-5 py-8" style={{ background: '#FFF8EA' }}>
      <div className="max-w-[640px] mx-auto space-y-8">
        {/* ── Cabecera clicable → Gestionar familia ─────────────────────── */}
        <header className="cz-pop relative rounded-md transition hover:bg-[#F4E3C1]/50 focus-within:outline focus-within:outline-2 focus-within:outline-[#2F5D8C]">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">En directo</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="cz-serif text-4xl leading-none truncate">{familyName}</h1>
            <ChevronRight
              className="h-6 w-6 shrink-0 opacity-60"
              style={{ color: '#2F5D8C' }}
              aria-hidden="true"
            />
          </div>
          <p className="text-xs uppercase tracking-wide opacity-60 mt-2">Tu hogar</p>
          <div className="cz-stripe mt-3" />
          {/* Botón extendido: hace clicable toda la cabecera sin meter el h1 en un button. */}
          <button
            type="button"
            onClick={onManageFamily}
            aria-label="Gestionar familia"
            className="absolute inset-0 cursor-pointer focus:outline-none"
          />
        </header>

        {/* ── Accesos rápidos ───────────────────────────────────────────── */}
        <section>
          <h2 className="cz-serif text-2xl mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onOpen(tile.id)}
                className="cz-frame text-left hover:bg-[#FFF8EA]/70 active:scale-[0.98] transition flex flex-col gap-2"
              >
                <span className="text-3xl" aria-hidden="true">
                  {tile.emoji}
                </span>
                <span className="cz-serif text-sm leading-tight">{tile.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Notificaciones (props puras) ──────────────────────────────── */}
        <section className="cz-frame flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {notificationsEnabled ? (
              <Bell className="h-5 w-5 shrink-0" style={{ color: '#2F5D8C' }} aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="cz-serif">Notificaciones</p>
              <p className="text-xs opacity-70">
                {notificationsHint ?? 'Avisos del hogar en este dispositivo.'}
              </p>
            </div>
          </div>
          <NotificationToggle
            checked={notificationsEnabled}
            disabled={notificationsDisabled || notificationsLoading}
            onToggle={onToggleNotifications}
          />
        </section>
      </div>
    </div>
  );
}

// ── Subcomponente: toggle de notificaciones accesible ─────────────────────────

function NotificationToggle({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Activar notificaciones"
      disabled={disabled}
      onClick={onToggle}
      className="relative h-7 w-12 shrink-0 rounded-full border-2 transition disabled:opacity-50"
      style={{
        background: checked ? '#5F7A4F' : '#F4E3C1',
        borderColor: checked ? '#5F7A4F' : '#8B5E3C',
      }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 'calc(100% - 1.375rem)' : '0.125rem' }}
      />
    </button>
  );
}
