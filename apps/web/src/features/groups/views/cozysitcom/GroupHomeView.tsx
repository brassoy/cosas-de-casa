/* ─── Vista presentacional cozysitcom — group_home (detalle de peña) ─────────
 *
 * Theme `cozysitcom` ("Sitcom Cozy 70s": retro cálido, madera y mostaza).
 * Reestiliza la vista base del detalle de peña con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozysitcom.tsx → Group): cabecera con
 * "← Volver" + placa de madera + titular serif + cinta, sección de miembros en
 * `cz-frame` con avatares de colores y `cz-tag` de rol, sección "invitar" (solo
 * OWNER) con generación y compartición de PIN, y sección "salir" con confirmación
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
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin stores.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { GroupMemberDto } from '../../contracts';
import type { GroupHomeViewProps } from '../types';

// Paleta de acento del kit para los avatares (rotación por índice).
const ACCENTS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'];

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
  leaveLoading,
  leaveError,
  onBack,
  onGeneratePin,
  onRevokePin,
  onLeave,
}: GroupHomeViewProps) {
  const [confirmLeave, setConfirmLeave] = useState(false);

  function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    onLeave();
  }

  return (
    <div className="cz min-h-[100dvh] px-4 py-8" style={{ background: 'var(--color-surface)' }}>
      <div className="w-full max-w-[520px] mx-auto flex flex-col gap-6">
        {/* ── Cabecera ── */}
        <header className="cz-pop">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold opacity-70 mb-2 hover:opacity-100"
            aria-label="Volver a mis peñas"
          >
            ← Mis peñas
          </button>
          <div className="cz-wood inline-block mb-2 block w-fit">
            <p className="cz-serif text-base">En la peña</p>
          </div>
          <h1 className="cz-serif text-4xl leading-none">{groupName}</h1>
          <div className="cz-stripe mt-3" />
        </header>

        {/* ── Miembros ── */}
        <section className="flex flex-col gap-3" aria-labelledby="members-heading">
          <h2 id="members-heading" className="cz-serif text-xl">
            Miembros {members ? `(${members.length})` : ''}
          </h2>
          <ScreenState
            isLoading={membersLoading}
            error={membersError ?? undefined}
            isEmpty={!membersLoading && !membersError && (members?.length ?? 0) === 0}
            emptyTitle="Todavía no hay miembros en esta peña."
          >
            <div className="cz-frame divide-y divide-[#F4E3C1]">
              <ul aria-label="Miembros de la peña">
                {members?.map((m, i) => (
                  <li key={m.userId} className="border-b border-[#F4E3C1] last:border-0">
                    <MemberRow member={m} accent={ACCENTS[i % ACCENTS.length]!} />
                  </li>
                ))}
              </ul>
            </div>
          </ScreenState>
        </section>

        {/* ── Invitar (solo OWNER) ── */}
        {isOwner && (
          <section className="flex flex-col gap-3" aria-labelledby="invite-heading">
            <h2 id="invite-heading" className="cz-serif text-xl">
              Invitar miembros
            </h2>
            <button
              type="button"
              onClick={onGeneratePin}
              disabled={pinLoading}
              className="cz-btn-denim self-start disabled:opacity-60"
            >
              {pinLoading ? 'Generando…' : 'Generar PIN'}
            </button>
            {pinError && (
              <p
                role="alert"
                className="cz-paper p-3 text-sm font-bold"
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
              >
                {pinError}
              </p>
            )}
            {pinRevokeError && (
              <p
                role="alert"
                className="cz-paper p-3 text-sm font-bold"
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
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
                className="text-sm font-bold underline self-start disabled:opacity-60"
                style={{ color: 'var(--color-error)' }}
              >
                {pinRevoking ? 'Revocando…' : 'Revocar PIN'}
              </button>
            )}
          </section>
        )}

        {/* ── Salir de la peña ── */}
        <section className="flex flex-col gap-3" aria-labelledby="leave-heading">
          <h2 id="leave-heading" className="cz-serif text-xl">
            Salir de la peña
          </h2>
          {leaveError && (
            <p
              role="alert"
              className="cz-paper p-3 text-sm font-bold"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {leaveError}
            </p>
          )}
          {confirmLeave ? (
            <div className="cz-frame flex flex-col gap-3">
              <p className="text-sm opacity-70">¿Seguro que quieres salir de esta peña?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="cz-btn-garnet disabled:opacity-60"
                  onClick={handleLeave}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Saliendo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="cz-btn-ghost disabled:opacity-60"
                  onClick={() => setConfirmLeave(false)}
                  disabled={leaveLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="cz-btn-garnet self-start" onClick={handleLeave}>
              Salir de la peña
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function MemberRow({ member, accent }: { member: GroupMemberDto; accent: string }) {
  const roleLabel = member.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <div className="flex items-center gap-3 py-2.5">
      <MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} accent={accent} />
      <p className="cz-serif flex-1 min-w-0 truncate">{member.displayName}</p>
      <span className="cz-tag">{roleLabel}</span>
    </div>
  );
}

function MemberAvatar({
  name,
  avatarUrl,
  accent,
}: {
  name: string;
  avatarUrl?: string;
  accent: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover border-2 border-white shadow"
      />
    );
  }
  return (
    <div
      className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-white text-lg font-extrabold border-2 border-white shadow"
      style={{ background: accent }}
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
    <div className="cz-frame flex flex-col gap-3 cz-pop">
      <p className="text-xs font-bold uppercase opacity-70">PIN generado</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="cz-serif text-3xl tracking-[0.2em]">{pin}</span>
        <button type="button" className="cz-btn-ghost !py-1.5 !px-3 text-xs" onClick={handleCopy}>
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
