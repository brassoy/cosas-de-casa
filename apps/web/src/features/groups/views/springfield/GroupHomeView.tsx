/* ─── Vista presentacional springfield — group_home (detalle de peña) ────────
 *
 * Theme `springfield` ("Cómic pop": bordes gruesos de tinta, hard shadows con
 * offset, colores planos saturados). Reestiliza la vista base del detalle de
 * peña con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/springfield.tsx → Group): cabecera
 * `sf-card-y` con sticker "← Atrás" + Bangers, sección "Gente" en `sf-card` con
 * avatares de colores (`Avatar`) y `sf-tag` de rol, sección "Invitar" (solo
 * OWNER) con generación y compartición de PIN, y sección "Salir" con confirmación
 * en 2 toques.
 *
 * Reparto container ↔ vista (idéntico a la base):
 *  - El CONTAINER ejecuta las mutaciones (generar PIN, salir), resuelve el rol
 *    OWNER y el `groupName`, y pasa los datos/estados por props.
 *  - La VISTA mantiene el estado de UI puro: copiado al portapapeles, enlaces de
 *    compartir (WhatsApp/Telegram) y la confirmación de salida en 2 toques.
 *
 * Mismo contrato `GroupHomeViewProps`, misma funcionalidad y mismos callbacks que
 * la base. Reutiliza el componente compartido `ScreenState` (theme-agnóstico)
 * para los miembros. El sub-flujo de compartir PIN (`PinShare`) se reescribe con
 * la estética del theme manteniendo intacta su lógica (clipboard, enlaces wa/tg).
 *
 * Datos REALES: el kit usaba `mockGroupMembers`, un subtítulo "3 miembros · 1
 * plan activo" y una tarjeta de "plan" inventados; aquí los miembros y el rol
 * salen de `members`, el contador es real, y el back llama a `onBack`. La sección
 * "Planes de la peña" del kit NO existe en el contrato → se omite (no inventamos
 * datos); en su lugar van las secciones reales de Invitar y Salir.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupMemberDto, GroupRole } from '../../contracts';
import type { GroupHomeViewProps } from '../types';

// Paleta de avatares del kit (rotación por índice).
const AVATAR_COLORS = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'];

const INK = '#1A1A1A';

function buildShareText(pin: string): string {
  return `¡Únete a mi peña en Cosas de Casa! Usa el PIN: ${pin}`;
}

export default function GroupHomeView({
  groupName,
  isOwner,
  members,
  membersLoading,
  membersError,
  generatedPin,
  pinLoading,
  pinError,
  pinRevoking,
  pinRevokeError,
  onBack,
  onGeneratePin,
  onRevokePin,
  onOpenSettings,
  currentUserId,
  onChangeMemberRole,
  changingRoleUserId,
  onExpelMember,
  expellingUserId,
}: GroupHomeViewProps) {
  const canManage = isOwner && Boolean(onChangeMemberRole || onExpelMember);

  const membersCount = members?.length ?? 0;
  const sub = members
    ? `${membersCount} ${membersCount === 1 ? 'miembro' : 'miembros'}`
    : undefined;

  return (
    <div className="sf min-h-[100dvh] px-5 py-6" style={{ background: '#FFF3C4' }}>
      <div className="max-w-[520px] mx-auto">
        {/* ── Cabecera (sf-card-y + sticker "← Atrás" + Bangers) ── */}
        <header className="sf-card-y p-4 mb-5 relative sf-pop">
          <button
            type="button"
            onClick={onBack}
            className="sf-sticker"
            style={{ background: '#fff' }}
            aria-label="Volver a mis peñas"
          >
            ← Atrás
          </button>
          <h1 className="sf-bangers text-4xl leading-none mt-1">{groupName}</h1>
          {sub && <p className="sf-fredoka text-sm mt-1">{sub}</p>}
          <button
            type="button"
            onClick={onOpenSettings}
            className="sf-btn sf-btn-w !py-1.5 !px-3 text-xs mt-3"
          >
            ⚙️ Ajustes
          </button>
          <Lightning className="absolute -top-3 right-3 w-7 sf-wob" />
        </header>

        {/* ── Miembros ── */}
        <section aria-labelledby="members-heading">
          <p id="members-heading" className="sf-bangers text-xl mb-2">
            Gente {members ? `(${membersCount})` : ''}
          </p>
          <ScreenState
            isLoading={membersLoading}
            error={membersError ?? undefined}
            isEmpty={!membersLoading && !membersError && membersCount === 0}
            emptyTitle="Todavía no hay miembros en esta peña."
          >
            <div className="sf-card p-3 space-y-2 mb-4">
              <ul aria-label="Miembros de la peña">
                {members?.map((m, i) => (
                  <li key={m.userId}>
                    <MemberRow
                      member={m}
                      color={AVATAR_COLORS[i % AVATAR_COLORS.length]!}
                      canManage={canManage && m.userId !== currentUserId}
                      onChangeRole={onChangeMemberRole}
                      changingRole={changingRoleUserId === m.userId}
                      onExpel={onExpelMember}
                      expelling={expellingUserId === m.userId}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </ScreenState>
        </section>

        {/* ── Invitar (solo OWNER) ── */}
        {isOwner && (
          <section className="mb-4" aria-labelledby="invite-heading">
            <p id="invite-heading" className="sf-bangers text-xl mb-2">
              Invitar
            </p>
            <button
              type="button"
              onClick={onGeneratePin}
              disabled={pinLoading}
              className="sf-btn sf-btn-r disabled:opacity-60"
            >
              {pinLoading ? 'Generando…' : 'Generar PIN'}
            </button>
            {pinError && (
              <p
                role="alert"
                className="sf-card p-3 mt-3 text-sm font-bold"
                style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
              >
                {pinError}
              </p>
            )}
            {pinRevokeError && (
              <p
                role="alert"
                className="sf-card p-3 mt-3 text-sm font-bold"
                style={{ background: '#fff', borderColor: '#E53935', color: '#E53935' }}
              >
                {pinRevokeError}
              </p>
            )}
            {generatedPin && <PinShare pin={generatedPin} />}
            {onRevokePin && (
              <button
                type="button"
                onClick={onRevokePin}
                disabled={pinRevoking}
                className="sf-btn sf-btn-r mt-3 disabled:opacity-60"
              >
                {pinRevoking ? 'Revocando…' : 'Revocar PIN'}
              </button>
            )}
          </section>
        )}

      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

interface MemberRowProps {
  member: GroupMemberDto;
  color: string;
  canManage?: boolean;
  onChangeRole?: (userId: string, role: GroupRole) => void;
  changingRole?: boolean;
  onExpel?: (userId: string) => void;
  expelling?: boolean;
}

function MemberRow({
  member,
  color,
  canManage,
  onChangeRole,
  changingRole,
  onExpel,
  expelling,
}: MemberRowProps) {
  const roleLabel = member.role === 'OWNER' ? 'Propietario' : 'Miembro';
  const nextRole: GroupRole = member.role === 'OWNER' ? 'MEMBER' : 'OWNER';
  const roleActionLabel = member.role === 'OWNER' ? 'Hacer miembro' : 'Hacer propietario';

  return (
    <div className="flex flex-wrap items-center gap-3 p-2">
      <MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} color={color} />
      <p className="sf-fredoka flex-1 min-w-0 truncate">{member.displayName}</p>
      <span className="sf-tag">{roleLabel}</span>
      {canManage && (
        <div className="flex w-full gap-2 sm:w-auto">
          {onChangeRole && (
            <button
              type="button"
              onClick={() => onChangeRole(member.userId, nextRole)}
              disabled={changingRole || expelling}
              className="sf-btn sf-btn-w !py-1.5 !px-3 text-xs disabled:opacity-60"
            >
              {changingRole ? 'Guardando…' : roleActionLabel}
            </button>
          )}
          {onExpel && (
            <button
              type="button"
              onClick={() => onExpel(member.userId)}
              disabled={changingRole || expelling}
              className="sf-btn sf-btn-r !py-1.5 !px-3 text-xs disabled:opacity-60"
            >
              {expelling ? 'Expulsando…' : 'Expulsar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MemberAvatar({
  name,
  avatarUrl,
  color,
}: {
  name: string;
  avatarUrl?: string;
  color: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-12 h-12 shrink-0 rounded-full object-cover border-[3px]"
        style={{ borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}
      />
    );
  }
  return (
    <div
      className="w-12 h-12 shrink-0 rounded-full grid place-items-center sf-bangers text-xl border-[3px]"
      style={{ background: color, borderColor: INK, boxShadow: `3px 3px 0 ${INK}` }}
    >
      <span aria-hidden="true">{name[0]?.toUpperCase()}</span>
    </div>
  );
}

function PinShare({ pin }: { pin: string }) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(pin);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(
    window.location.origin,
  )}&text=${encodeURIComponent(text)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="sf-card-s p-4 mt-3 space-y-3 sf-pop">
      <p className="sf-fredoka text-sm">PIN generado</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="sf-bangers text-3xl tracking-[0.2em]">{pin}</span>
        <button type="button" className="sf-btn sf-btn-w !py-1.5 !px-3 text-xs" onClick={handleCopy}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="flex gap-4">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold underline"
        >
          Compartir por WhatsApp
        </a>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold underline"
        >
          Compartir por Telegram
        </a>
      </div>
    </div>
  );
}

function Lightning(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true" {...props}>
      <path
        d="M14 0 L2 18 H10 L8 32 L22 12 H14 Z"
        fill="#FFD90F"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
