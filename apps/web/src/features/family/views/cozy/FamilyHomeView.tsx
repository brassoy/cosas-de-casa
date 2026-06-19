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

import { useState } from 'react';
import { Bell, BellOff, Copy, Share2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyHomeViewProps, FamilyManageProps } from '../types';

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
    manage,
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

        {/* ── Gestionar familia (solo OWNER) ──────────────────────────────── */}
        {isOwner && manage && (
          <FamilyManageSection manage={manage} members={members} />
        )}

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

// ── Subcomponente: sección "Gestionar familia" (solo OWNER) ───────────────────

export function FamilyManageSection({
  manage,
  members,
}: {
  manage: FamilyManageProps;
  members: FamilyMemberDto[];
}) {
  const {
    onChangeRole,
    onRemoveMember,
    currentUserId,
    roleChangingId,
    removingId,
    memberError,
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
    <section aria-labelledby="manage-family-heading" className="space-y-4">
      <h2 id="manage-family-heading" className="ck-marker text-3xl text-primary">
        Gestionar familia
      </h2>

      {/* — Gestión de miembros — */}
      <div className="ck-card p-4 space-y-3">
        <h3 className="ck-marker text-2xl text-primary">Miembros</h3>
        {memberError && (
          <div role="alert">
            <p className="text-base text-error">{memberError}</p>
          </div>
        )}
        <ul className="space-y-2 list-none p-0 m-0">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const busy = roleChangingId === m.userId || removingId === m.userId;
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0 truncate text-lg">{m.displayName}</span>
                <select
                  value={m.role}
                  disabled={isSelf || busy}
                  onChange={(e) =>
                    onChangeRole(m.userId, e.target.value as FamilyMemberDto['role'])
                  }
                  className="ck-input !py-1 !px-2 text-sm disabled:opacity-50"
                  aria-label={`Rol de ${m.displayName}`}
                >
                  <option value="OWNER">Propietario</option>
                  <option value="MEMBER">Miembro</option>
                </select>
                <button
                  type="button"
                  disabled={isSelf || busy}
                  onClick={() => onRemoveMember(m.userId)}
                  className="ck-marker text-xl text-error disabled:opacity-40 hover:opacity-80"
                  aria-label={`Expulsar a ${m.displayName}`}
                >
                  {removingId === m.userId ? 'Expulsando…' : 'Expulsar'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* — Editar nombre/descripción — */}
      <div className="ck-card p-4 space-y-3 relative">
        <span className="ck-tape" aria-hidden="true" />
        <h3 className="ck-marker text-2xl text-primary">Nombre y descripción</h3>
        {detailsError && (
          <div role="alert">
            <p className="text-base text-error">{detailsError}</p>
          </div>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="family-name" className="text-base opacity-70">
              Nombre
            </label>
            <input
              id="family-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="ck-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="family-description" className="text-base opacity-70">
              Descripción
            </label>
            <textarea
              id="family-description"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="ck-input w-full"
            />
          </div>
          <button
            type="submit"
            disabled={detailsSaving || !dirty || !name.trim()}
            className="ck-btn ck-btn-blue self-start disabled:opacity-60"
          >
            {detailsSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* — Borrar la familia — */}
      <div className="ck-card p-4 space-y-3">
        <h3 className="ck-marker text-2xl text-error">Zona peligrosa</h3>
        <p className="text-sm opacity-70">
          Borrar la familia elimina sus listas, tareas y datos para todos los miembros. Esta
          acción no se puede deshacer.
        </p>
        {deleteError && (
          <div role="alert">
            <p className="text-base text-error">{deleteError}</p>
          </div>
        )}
        <button
          type="button"
          disabled={deleteLoading}
          onClick={onDeleteFamily}
          className="ck-btn ck-btn-red self-start disabled:opacity-60"
        >
          {deleteLoading ? 'Borrando…' : 'Borrar la familia'}
        </button>
      </div>
    </section>
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
