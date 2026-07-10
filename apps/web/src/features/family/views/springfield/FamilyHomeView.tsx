/* ─── Vista presentacional springfield — family_home ────────────────────────
 *
 * Theme `springfield` (estética cómic pop). Home del hogar: cabecera clicable
 * que lleva a "Gestionar familia", accesos rápidos y notificaciones.
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

// Paleta cómic para avatares y tiles (mismo orden que la maqueta del kit).
const AVATAR_COLORS: readonly string[] = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'];

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
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera clicable → Gestionar familia ─────────────────────── */}
        <header className="sf-card-y p-5 relative sf-pop transition hover:-translate-y-0.5 focus-within:outline focus-within:outline-[3px] focus-within:outline-[#1A1A1A]">
          <span className="sf-sticker">¡Hola, vecina!</span>
          <div className="flex items-center justify-between gap-3">
            <h1 className="sf-bangers text-5xl leading-none mt-2 truncate">{familyName}</h1>
            <span
              className="mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] bg-white"
              style={{ borderColor: '#1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
              aria-hidden="true"
            >
              <ChevronRight className="h-5 w-5" style={{ color: '#1A1A1A' }} />
            </span>
          </div>
          <p className="sf-fredoka text-sm mt-1 uppercase tracking-wide opacity-70">Tu hogar</p>
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
          <h2 className="sf-bangers text-2xl mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickAccess.map((tile, i) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onOpen(tile.id)}
                className="sf-card p-3 text-left sf-wob flex items-center gap-3"
              >
                <div
                  className="w-12 h-12 rounded-2xl grid place-items-center text-2xl border-[3px] shrink-0"
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length]!,
                    borderColor: '#1A1A1A',
                    boxShadow: '3px 3px 0 #1A1A1A',
                  }}
                  aria-hidden="true"
                >
                  {tile.emoji}
                </div>
                <span className="sf-fredoka text-base leading-tight min-w-0">{tile.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Notificaciones (props puras) ──────────────────────────────── */}
        <section className="sf-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {notificationsEnabled ? (
              <Bell className="h-5 w-5 shrink-0" style={{ color: '#7CB342' }} aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="sf-fredoka">Notificaciones</p>
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
      className="relative h-7 w-12 shrink-0 rounded-full border-[3px] transition disabled:opacity-50"
      style={{
        background: checked ? '#7CB342' : '#FFFFFF',
        borderColor: '#1A1A1A',
        boxShadow: '3px 3px 0 #1A1A1A',
      }}
    >
      <span
        className="absolute top-0.5 h-[1.1rem] w-[1.1rem] rounded-full border-2 border-[#1A1A1A] bg-white transition-all"
        style={{ left: checked ? 'calc(100% - 1.35rem)' : '0.125rem' }}
      />
    </button>
  );
}
