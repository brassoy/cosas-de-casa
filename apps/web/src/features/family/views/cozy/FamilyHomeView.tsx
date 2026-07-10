/* ─── Vista presentacional cozy — family_home ───────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito": papel pautado, tinta
 * marrón, notas con cinta y chinchetas, fonts Caveat/Patrick Hand). Home del
 * hogar: cabecera clicable que lleva a "Gestionar familia", accesos rápidos y
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

import { Bell, BellOff } from 'lucide-react';
import type { FamilyHomeViewProps } from '../types';

// Paleta de chinchetas/avatares del cuaderno (mismo orden que la maqueta del kit).
const PINS: readonly string[] = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

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
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera clicable → Gestionar familia ─────────────────────── */}
        <header className="relative text-center rounded-md transition hover:bg-black/5 focus-within:outline focus-within:outline-2 focus-within:outline-dashed focus-within:outline-[var(--color-border-strong)]">
          <p className="ck-marker text-lg opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary truncate">
            {familyName}
            {/* Pista manuscrita: la casita se gestiona tocando su nombre. */}
            <span className="ml-2 align-middle text-4xl opacity-60" aria-hidden="true">
              ›
            </span>
          </h1>
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
          <h2 className="ck-marker text-2xl mb-3 text-primary">Rincones</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((tile, i) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onOpen(tile.id)}
                className="ck-card p-3 text-left relative"
              >
                <span
                  className="ck-pin"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, #fff, ${PINS[i % PINS.length]!})`,
                  }}
                  aria-hidden="true"
                />
                <div className="text-3xl" aria-hidden="true">
                  {tile.emoji}
                </div>
                <p className="ck-marker text-2xl leading-none mt-1 text-primary">{tile.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Notificaciones (props puras) ──────────────────────────────── */}
        <section className="ck-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {notificationsEnabled ? (
              <Bell className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="ck-marker text-xl text-primary">Notificaciones</p>
              <p className="text-sm opacity-70">
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
        background: checked ? '#5b8a3a' : '#fff',
        borderColor: 'var(--color-border-strong)',
      }}
    >
      <span
        className="absolute top-0.5 h-[1.1rem] w-[1.1rem] rounded-full border-2 bg-white transition-all"
        style={{
          left: checked ? 'calc(100% - 1.35rem)' : '0.125rem',
          borderColor: 'var(--color-border-strong)',
        }}
      />
    </button>
  );
}
