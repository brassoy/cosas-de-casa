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

import { useState } from 'react';
import { Bell, BellOff, Copy, Share2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyHomeViewProps, FamilyManageProps } from '../types';

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
    onRevokePin,
    pinRevoking,
    pinRevokeError,
    onLeaveFamily,
    leaveLoading,
    leaveError,
    manage,
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
            {pinRevokeError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{pinRevokeError}</p>
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

        {/* ── Gestionar familia (solo OWNER) ──────────────────────────────── */}
        {isOwner && manage && (
          <FamilyManageSection manage={manage} members={members} />
        )}

        {/* ── Salir de la familia ─────────────────────────────────────────── */}
        {onLeaveFamily && (
          <section className="sf-card p-4 space-y-3">
            <h2 className="sf-bangers text-2xl">Salir de la familia</h2>
            {leaveError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{leaveError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={onLeaveFamily}
              disabled={leaveLoading}
              className="sf-btn sf-btn-r text-lg disabled:opacity-60"
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
      {onRevoke && (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="sf-btn sf-btn-r disabled:opacity-60"
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
      <h2 id="manage-family-heading" className="sf-bangers text-3xl">
        Gestionar familia
      </h2>

      {/* — Gestión de miembros — */}
      <div className="sf-card p-4 space-y-3">
        <h3 className="sf-bangers text-2xl">Miembros</h3>
        {memberError && (
          <div role="alert" className="sf-card-p p-3">
            <p className="sf-fredoka text-sm">{memberError}</p>
          </div>
        )}
        <ul className="space-y-2 list-none p-0 m-0">
          {members.map((m) => {
            const isSelf = m.userId === currentUserId;
            const busy = roleChangingId === m.userId || removingId === m.userId;
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0 truncate sf-fredoka">{m.displayName}</span>
                <select
                  value={m.role}
                  disabled={isSelf || busy}
                  onChange={(e) =>
                    onChangeRole(m.userId, e.target.value as FamilyMemberDto['role'])
                  }
                  className="sf-input !py-1 !px-2 text-sm disabled:opacity-50"
                  aria-label={`Rol de ${m.displayName}`}
                >
                  <option value="OWNER">Propietario</option>
                  <option value="MEMBER">Miembro</option>
                </select>
                <button
                  type="button"
                  disabled={isSelf || busy}
                  onClick={() => onRemoveMember(m.userId)}
                  className="sf-btn sf-btn-r !py-1 !px-3 text-sm disabled:opacity-40"
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
      <div className="sf-card p-4 space-y-3">
        <h3 className="sf-bangers text-2xl">Nombre y descripción</h3>
        {detailsError && (
          <div role="alert" className="sf-card-p p-3">
            <p className="sf-fredoka text-sm">{detailsError}</p>
          </div>
        )}
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="family-name" className="sf-fredoka text-sm opacity-70">
              Nombre
            </label>
            <input
              id="family-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="sf-input w-full"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="family-description" className="sf-fredoka text-sm opacity-70">
              Descripción
            </label>
            <textarea
              id="family-description"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="sf-input w-full"
            />
          </div>
          <button
            type="submit"
            disabled={detailsSaving || !dirty || !name.trim()}
            className="sf-btn sf-btn-g text-lg disabled:opacity-60"
          >
            {detailsSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* — Borrar la familia — */}
      <div className="sf-card p-4 space-y-3">
        <h3 className="sf-bangers text-2xl" style={{ color: '#E53935' }}>
          Zona peligrosa
        </h3>
        <p className="text-xs opacity-70">
          Borrar la familia elimina sus listas, tareas y datos para todos los miembros. Esta
          acción no se puede deshacer.
        </p>
        {deleteError && (
          <div role="alert" className="sf-card-p p-3">
            <p className="sf-fredoka text-sm">{deleteError}</p>
          </div>
        )}
        <button
          type="button"
          disabled={deleteLoading}
          onClick={onDeleteFamily}
          className="sf-btn sf-btn-r text-lg disabled:opacity-60"
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
