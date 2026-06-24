/* ─── Vista presentacional cozy — family_home ───────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito": papel pautado, tinta
 * marrón, notas con cinta y chinchetas, fonts Caveat/Patrick Hand). Misma
 * funcionalidad que la vista base: accesos rápidos, notificaciones, invitación
 * por PIN (solo OWNER) y lista de miembros con estados de carga/error/vacío.
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

// Paleta de chinchetas/avatares del cuaderno (mismo orden que la maqueta del kit).
const PINS: readonly string[] = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

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
    onRevokePin,
    pinRevoking,
    pinRevokeError,
    onLeaveFamily,
    leaveLoading,
    leaveError,
  } = props;

  return (
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="text-center">
          <p className="ck-marker text-lg opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-primary truncate">
            {familyName}
          </h1>
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

        {/* ── Invitar miembros (solo OWNER) ─────────────────────────────── */}
        {isOwner && (
          <section className="ck-card p-4 space-y-3 relative">
            <span className="ck-tape" aria-hidden="true" />
            <div>
              <h2 className="ck-marker text-2xl text-primary">Invitar miembros</h2>
              <p className="text-sm opacity-70">Comparte un PIN de un solo uso.</p>
            </div>

            {pinError && (
              <div role="alert">
                <p className="text-base text-error">{pinError}</p>
              </div>
            )}
            {pinRevokeError && (
              <div role="alert">
                <p className="text-base text-error">{pinRevokeError}</p>
              </div>
            )}

            {generatedPin ? (
              <InvitePinBox
                pin={generatedPin}
                onCopy={onCopyPin}
                onShare={onShare}
                onRevoke={onRevokePin}
                revoking={pinRevoking}
              />
            ) : (
              <button
                type="button"
                onClick={onGeneratePin}
                disabled={pinLoading}
                className="ck-btn ck-btn-blue w-full"
              >
                {pinLoading ? 'Generando…' : 'Generar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Miembros ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="ck-marker text-2xl mb-3 text-primary">
            Quién vive aquí {members.length ? `(${members.length})` : ''}
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
                <MemberRow key={m.userId} member={m} color={PINS[i % PINS.length]!} />
              ))}
            </ul>
          </ScreenState>
        </section>

        {/* ── Salir de la familia ─────────────────────────────────────────── */}
        {onLeaveFamily && (
          <section className="ck-card p-4 space-y-3">
            <h2 className="ck-marker text-2xl text-error">Salir de la familia</h2>
            {leaveError && (
              <div role="alert">
                <p className="text-base text-error">{leaveError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={onLeaveFamily}
              disabled={leaveLoading}
              className="ck-btn ck-btn-red self-start disabled:opacity-60"
            >
              {leaveLoading ? 'Saliendo…' : 'Salir de la familia'}
            </button>
          </section>
        )}
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
        <code className="ck-input ck-marker flex-1 text-3xl tracking-widest text-center">
          {pin.code}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copiar PIN"
          className="ck-btn shrink-0 grid place-items-center !px-3"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onShare('whatsapp')}
          className="ck-btn ck-btn-blue flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => onShare('telegram')}
          className="ck-btn flex items-center justify-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Telegram
        </button>
      </div>
      <p className="text-sm opacity-70">
        Caduca: {new Date(pin.expiresAt).toLocaleString('es-ES')}
      </p>
      {onRevoke && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="ck-marker text-xl text-error self-start hover:opacity-80 disabled:opacity-60"
        >
          {revoking ? 'Revocando…' : 'Revocar PIN'}
        </button>
      )}
    </div>
  );
}

// ── Subcomponente: fila de miembro ────────────────────────────────────────────

function MemberRow({ member, color }: { member: FamilyMemberDto; color: string }) {
  const initial = member.displayName.charAt(0).toUpperCase();
  return (
    <li className="ck-card p-3 flex items-center gap-3">
      <span
        className="h-10 w-10 rounded-full overflow-hidden grid place-items-center text-text-inverse shrink-0 ck-marker text-2xl"
        style={{ background: color }}
      >
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-lg truncate">{member.displayName}</p>
        <p className="text-sm opacity-70">
          Desde {new Date(member.joinedAt).toLocaleDateString('es-ES')}
        </p>
      </div>
      <span className="ck-marker text-xl text-error">
        {member.role === 'OWNER' ? 'Propietario' : 'Miembro'}
      </span>
    </li>
  );
}
