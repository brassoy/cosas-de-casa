/* ─── Vista presentacional cozysitcom — family_home ─────────────────────────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar). Misma funcionalidad
 * que la vista base: accesos rápidos, notificaciones, invitación por PIN (solo
 * OWNER) y lista de miembros con estados de carga/error/vacío.
 *
 * Sub-flujos preservados:
 *  - Notificaciones como props puras (plan §7.E): se pinta el estado y se emite
 *    `onToggleNotifications` con un toggle accesible nativo (no `Switch` shadcn).
 *  - Invitación: botón "Generar PIN" o, si ya hay PIN, la caja `InvitePinBox`
 *    (copiar + compartir WhatsApp/Telegram) reestilizada al theme.
 *  - Miembros: estados de carga/error/vacío vía `ScreenState`/`ListSkeleton`
 *    (componentes neutros que resuelven colores por el theme activo).
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { Bell, BellOff, Copy, Share2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyHomeViewProps } from '../types';

// Acentos retro para los avatares (mismo orden que la maqueta del kit).
const AVATAR_COLORS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'];

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
    <div className="cz min-h-[80dvh] px-5 py-8" style={{ background: '#FFF8EA' }}>
      <div className="max-w-[640px] mx-auto space-y-8">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="cz-pop">
          <div className="cz-wood inline-block mb-2">
            <p className="cz-serif text-base">En directo</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none truncate">{familyName}</h1>
          <p className="text-xs uppercase tracking-wide opacity-60 mt-2">Tu hogar</p>
          <div className="cz-stripe mt-3" />
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

        {/* ── Invitar miembros (solo OWNER) ─────────────────────────────── */}
        {isOwner && (
          <section className="cz-frame space-y-3">
            <div>
              <h2 className="cz-serif text-2xl">Invitar miembros</h2>
              <p className="text-xs opacity-70">Comparte un PIN de un solo uso.</p>
            </div>

            {pinError && (
              <div role="alert" style={{ color: '#A63A3A' }}>
                <p className="font-bold text-sm">{pinError}</p>
              </div>
            )}

            {generatedPin ? (
              <InvitePinBox pin={generatedPin} onCopy={onCopyPin} onShare={onShare} />
            ) : (
              <button onClick={onGeneratePin} disabled={pinLoading} className="cz-btn-denim w-full">
                {pinLoading ? 'Generando…' : 'Generar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Miembros ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="cz-serif text-2xl mb-3">
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
              {members.map((m, i) => (
                <MemberRow key={m.userId} member={m} color={AVATAR_COLORS[i % AVATAR_COLORS.length]!} />
              ))}
            </ul>
          </ScreenState>
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
    <div className="space-y-3 cz-pop">
      <div className="flex items-center gap-2">
        <code className="cz-input cz-serif flex-1 text-xl tracking-[0.3em] text-center">
          {pin.code}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copiar PIN"
          className="cz-btn-ghost shrink-0 grid place-items-center !px-3"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onShare('whatsapp')} className="cz-btn-ghost flex items-center justify-center gap-2">
          <Share2 className="h-4 w-4" />
          WhatsApp
        </button>
        <button type="button" onClick={() => onShare('telegram')} className="cz-btn-ghost flex items-center justify-center gap-2">
          <Share2 className="h-4 w-4" />
          Telegram
        </button>
      </div>
      <p className="text-xs opacity-70">
        Caduca: {new Date(pin.expiresAt).toLocaleString('es-ES')}
      </p>
    </div>
  );
}

// ── Subcomponente: fila de miembro ────────────────────────────────────────────

function MemberRow({ member, color }: { member: FamilyMemberDto; color: string }) {
  const initial = member.displayName.charAt(0).toUpperCase();
  return (
    <li className="cz-frame flex items-center gap-3">
      <div
        className="h-11 w-11 rounded-full overflow-hidden grid place-items-center font-extrabold text-white border-2 border-white shadow shrink-0"
        style={{ background: color }}
      >
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="cz-serif truncate">{member.displayName}</p>
        <p className="text-xs opacity-70">
          Desde {new Date(member.joinedAt).toLocaleDateString('es-ES')}
        </p>
      </div>
      <span className="cz-tag">{member.role === 'OWNER' ? 'Propietario' : 'Miembro'}</span>
    </li>
  );
}
