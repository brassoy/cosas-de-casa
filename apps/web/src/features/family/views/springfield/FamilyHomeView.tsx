/* ─── Vista presentacional springfield — family_home ────────────────────────
 *
 * Theme `springfield` (estética cómic pop). Misma funcionalidad que la vista
 * base: accesos rápidos, notificaciones, invitación por PIN (solo OWNER) y lista
 * de miembros con estados de carga/error/vacío.
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

// Paleta cómic para avatares y tiles (mismo orden que la maqueta del kit).
const AVATAR_COLORS: readonly string[] = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'];

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
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="sf-card-y p-5 relative sf-pop">
          <span className="sf-sticker">¡Hola, vecina!</span>
          <h1 className="sf-bangers text-5xl leading-none mt-2 truncate">{familyName}</h1>
          <p className="sf-fredoka text-sm mt-1 uppercase tracking-wide opacity-70">Tu hogar</p>
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

        {/* ── Invitar miembros (solo OWNER) ─────────────────────────────── */}
        {isOwner && (
          <section className="sf-card p-4 space-y-3">
            <div>
              <h2 className="sf-bangers text-2xl">Invitar miembros</h2>
              <p className="text-xs opacity-70">Comparte un PIN de un solo uso.</p>
            </div>

            {pinError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{pinError}</p>
              </div>
            )}

            {generatedPin ? (
              <InvitePinBox pin={generatedPin} onCopy={onCopyPin} onShare={onShare} />
            ) : (
              <button
                type="button"
                onClick={onGeneratePin}
                disabled={pinLoading}
                className="sf-btn w-full text-lg"
              >
                {pinLoading ? 'Generando…' : 'Generar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Separador cómic ───────────────────────────────────────────── */}
        <div className="sf-zig rounded" aria-hidden="true" />

        {/* ── Miembros ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="sf-bangers text-2xl mb-3">
            Miembros {members.length ? `(${members.length})` : ''}
          </h2>
          <ScreenState
            isLoading={membersLoading}
            error={membersError}
            isEmpty={!members.length}
            emptyTitle="Aún no hay miembros."
            skeleton={<ListSkeleton rows={3} />}
          >
            <ul className="space-y-3 list-none p-0 m-0">
              {members.map((m, i) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  color={AVATAR_COLORS[i % AVATAR_COLORS.length]!}
                />
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
    <div className="space-y-3 sf-pop">
      <div className="flex items-center gap-2">
        <code className="sf-input sf-bangers flex-1 text-2xl tracking-widest text-center">
          {pin.code}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copiar PIN"
          className="sf-btn sf-btn-w shrink-0 grid place-items-center !px-3"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onShare('whatsapp')}
          className="sf-btn sf-btn-g flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => onShare('telegram')}
          className="sf-btn flex items-center justify-center gap-2"
          style={{ background: '#70C5FF', color: '#1A1A1A' }}
        >
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
    <li className="sf-card p-3 flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-full overflow-hidden grid place-items-center sf-bangers text-xl border-[3px] shrink-0"
        style={{ background: color, borderColor: '#1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
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
        <p className="sf-fredoka truncate">{member.displayName}</p>
        <p className="text-xs opacity-70">
          Desde {new Date(member.joinedAt).toLocaleDateString('es-ES')}
        </p>
      </div>
      <span className="sf-tag">{member.role === 'OWNER' ? 'Propietario' : 'Miembro'}</span>
    </li>
  );
}
