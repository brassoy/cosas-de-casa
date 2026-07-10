/* ─── Vista presentacional springfield — family_manage ──────────────────────
 *
 * Theme `springfield` (estética cómic pop). Pantalla "Gestionar familia",
 * accesible a TODO miembro:
 *  - Para todos: lista de miembros (solo lectura) y "Salir de la familia".
 *  - Solo OWNER (si llegan `invite`/`manage`): invitación por PIN, controles de
 *    rol/expulsión en la lista, edición de nombre/descripción y borrado.
 *
 * Toda la lógica (confirmaciones, llamadas a la API, navegación) vive en el
 * container; la vista solo pinta el estado y emite callbacks.
 *
 * Presentacional puro: solo props in / callbacks out.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import type { FamilyMemberDto, GeneratePinResponse } from '@cosasdecasa/contracts';
import { ScreenState, ListSkeleton } from '@/shared/components/ScreenState';
import type { FamilyManageProps, FamilyManageViewProps } from '../types';

// Paleta cómic para avatares (misma que la home).
const AVATAR_COLORS: readonly string[] = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'];

export default function FamilyManageView({
  manage,
  invite,
  members,
  membersLoading,
  membersError,
  onLeaveFamily,
  leaveLoading,
  leaveError,
  onBack,
}: FamilyManageViewProps) {
  return (
    <div className="sf sf-dot min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="sf-btn sf-btn-w shrink-0 flex items-center gap-1 !px-3"
            aria-label="Volver a la familia"
          >
            <ArrowLeft className="h-4 w-4" />
            Familia
          </button>
          <h1 className="sf-bangers text-4xl leading-none truncate">Gestionar familia</h1>
        </header>

        {/* ── Invitar miembros (solo OWNER) ─────────────────────────────── */}
        {invite && (
          <section className="sf-card p-4 space-y-3">
            <div>
              <h2 className="sf-bangers text-2xl">Invitar miembros</h2>
              <p className="text-xs opacity-70">Comparte un PIN de un solo uso.</p>
            </div>

            {invite.pinError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{invite.pinError}</p>
              </div>
            )}
            {invite.pinRevokeError && (
              <div role="alert" className="sf-card-p p-3">
                <p className="sf-fredoka text-sm">{invite.pinRevokeError}</p>
              </div>
            )}

            {invite.generatedPin ? (
              <InvitePinBox
                pin={invite.generatedPin}
                onCopy={invite.onCopyPin}
                onShare={invite.onShare}
                onRevoke={invite.onRevokePin}
                revoking={invite.pinRevoking}
              />
            ) : (
              <button
                type="button"
                onClick={invite.onGeneratePin}
                disabled={invite.pinLoading}
                className="sf-btn w-full text-lg"
              >
                {invite.pinLoading ? 'Generando…' : 'Generar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Separador cómic ───────────────────────────────────────────── */}
        <div className="sf-zig rounded" aria-hidden="true" />

        {/* ── Miembros: lectura para todos; admin si es OWNER ───────────── */}
        <section>
          <h2 className="sf-bangers text-2xl mb-3">
            Miembros {members.length ? `(${members.length})` : ''}
          </h2>
          {manage?.memberError && (
            <div role="alert" className="sf-card-p p-3 mb-3">
              <p className="sf-fredoka text-sm">{manage.memberError}</p>
            </div>
          )}
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
                  manage={manage}
                />
              ))}
            </ul>
          </ScreenState>
        </section>

        {/* ── Nombre/descripción + zona peligrosa (solo OWNER) ──────────── */}
        {manage && <OwnerAdminSection manage={manage} />}

        {/* ── Salir de la familia (todos) ───────────────────────────────── */}
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
      </div>
    </div>
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

// ── Subcomponente: fila de miembro (lectura + controles de admin si OWNER) ───

function MemberRow({
  member,
  color,
  manage,
}: {
  member: FamilyMemberDto;
  color: string;
  manage?: FamilyManageProps;
}) {
  const initial = member.displayName.charAt(0).toUpperCase();
  const isSelf = manage ? member.userId === manage.currentUserId : false;
  const busy = manage
    ? manage.roleChangingId === member.userId || manage.removingId === member.userId
    : false;
  const showAdmin = Boolean(manage) && !isSelf;

  return (
    <li className="sf-card p-3 flex flex-wrap items-center gap-3">
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
      {showAdmin && manage ? (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            disabled={busy}
            onChange={(e) =>
              manage.onChangeRole(member.userId, e.target.value as FamilyMemberDto['role'])
            }
            className="sf-input !py-1 !px-2 text-sm disabled:opacity-50"
            aria-label={`Rol de ${member.displayName}`}
          >
            <option value="OWNER">Propietario</option>
            <option value="MEMBER">Miembro</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => manage.onRemoveMember(member.userId)}
            className="sf-btn sf-btn-r !py-1 !px-3 text-sm disabled:opacity-40"
            aria-label={`Expulsar a ${member.displayName}`}
          >
            {manage.removingId === member.userId ? 'Expulsando…' : 'Expulsar'}
          </button>
        </div>
      ) : (
        <span className="sf-tag">{member.role === 'OWNER' ? 'Propietario' : 'Miembro'}</span>
      )}
    </li>
  );
}

// ── Subcomponente: administración del OWNER (nombre/descr. + borrado) ────────

function OwnerAdminSection({ manage }: { manage: FamilyManageProps }) {
  const {
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
    <section aria-labelledby="owner-admin-heading" className="space-y-4">
      <h2 id="owner-admin-heading" className="sr-only">
        Administración de la familia
      </h2>

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
