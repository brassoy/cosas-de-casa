/* ─── Vista presentacional cozy — family_manage ─────────────────────────────
 *
 * Theme `cozy` (estética "cuaderno de papel manuscrito"). Pantalla "Gestionar
 * familia", accesible a TODO miembro:
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

// Paleta de chinchetas/avatares del cuaderno (misma que la home).
const PINS: readonly string[] = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

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
    <div className="ck ck-page min-h-[80dvh] px-5 py-8">
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="ck-btn shrink-0 flex items-center gap-1 !px-3"
            aria-label="Volver a la familia"
          >
            <ArrowLeft className="h-4 w-4" />
            Familia
          </button>
          <h1 className="ck-marker text-4xl leading-none text-primary truncate">
            Gestionar familia
          </h1>
        </header>

        {/* ── Invitar miembros (solo OWNER) ─────────────────────────────── */}
        {invite && (
          <section className="ck-card p-4 space-y-3 relative">
            <span className="ck-tape" aria-hidden="true" />
            <div>
              <h2 className="ck-marker text-2xl text-primary">Invitar miembros</h2>
              <p className="text-sm opacity-70">Comparte un PIN de un solo uso.</p>
            </div>

            {invite.pinError && (
              <div role="alert">
                <p className="text-base text-error">{invite.pinError}</p>
              </div>
            )}
            {invite.pinRevokeError && (
              <div role="alert">
                <p className="text-base text-error">{invite.pinRevokeError}</p>
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
                className="ck-btn ck-btn-blue w-full"
              >
                {invite.pinLoading ? 'Generando…' : 'Generar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Miembros: lectura para todos; admin si es OWNER ───────────── */}
        <section>
          <h2 className="ck-marker text-2xl mb-3 text-primary">
            Quién vive aquí {members.length ? `(${members.length})` : ''}
          </h2>
          {manage?.memberError && (
            <div role="alert" className="mb-3">
              <p className="text-base text-error">{manage.memberError}</p>
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
                  color={PINS[i % PINS.length]!}
                  manage={manage}
                />
              ))}
            </ul>
          </ScreenState>
        </section>

        {/* ── Nombre/descripción + zona peligrosa (solo OWNER) ──────────── */}
        {manage && <OwnerAdminSection manage={manage} />}

        {/* ── Salir de la familia (todos) ───────────────────────────────── */}
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
    <li className="ck-card p-3 flex flex-wrap items-center gap-3">
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
      {showAdmin && manage ? (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            disabled={busy}
            onChange={(e) =>
              manage.onChangeRole(member.userId, e.target.value as FamilyMemberDto['role'])
            }
            className="ck-input !py-1 !px-2 text-sm disabled:opacity-50"
            aria-label={`Rol de ${member.displayName}`}
          >
            <option value="OWNER">Propietario</option>
            <option value="MEMBER">Miembro</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => manage.onRemoveMember(member.userId)}
            className="ck-marker text-xl text-error disabled:opacity-40 hover:opacity-80"
            aria-label={`Expulsar a ${member.displayName}`}
          >
            {manage.removingId === member.userId ? 'Expulsando…' : 'Expulsar'}
          </button>
        </div>
      ) : (
        <span className="ck-marker text-xl text-error">
          {member.role === 'OWNER' ? 'Propietario' : 'Miembro'}
        </span>
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
