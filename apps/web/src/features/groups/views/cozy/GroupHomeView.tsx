/* ─── Vista presentacional cozy — group_home (detalle de peña) ───────────────
 *
 * Theme `cozy` ("Cuaderno de papel manuscrito": papel crema pautado, tinta
 * marrón, boli azul, notas con cinta y chinchetas, fuentes manuscritas).
 * Reestiliza la vista base del detalle de peña con la estética del kit estático
 * (/tmp/hogar-feliz/src/screens/themes/cozy.tsx → Group): cabecera con "← volver"
 * + titular Caveat (`ck-marker`), sección de miembros en una nota `ck-card` con
 * avatares de colores y `ck-tag` de rol, sección "invitar" (solo OWNER) con
 * generación y compartición de PIN, y sección "salir" con confirmación en 2
 * toques.
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

// Colores del kit para los avatares (rotación por índice).
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

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
  leaveLoading,
  leaveError,
  onBack,
  onGeneratePin,
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
    <div className="ck ck-page min-h-[100dvh]">
      <div className="max-w-[520px] mx-auto px-5 pt-8 pb-24 flex flex-col gap-6">
        {/* ── Cabecera ── */}
        <header className="text-center relative mb-2">
          <button
            type="button"
            onClick={onBack}
            className="ck-marker text-xl absolute left-0 top-0 text-accent hover:opacity-80"
            aria-label="Volver a mis peñas"
          >
            ← volver
          </button>
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker text-5xl leading-none mt-1 text-accent">{groupName}</h1>
        </header>

        {/* ── Miembros ── */}
        <section className="flex flex-col gap-3" aria-labelledby="members-heading">
          <h2 id="members-heading" className="ck-marker text-2xl text-accent">
            gente {members ? `(${members.length})` : ''}
          </h2>
          <ScreenState
            isLoading={membersLoading}
            error={membersError ?? undefined}
            isEmpty={!membersLoading && !membersError && (members?.length ?? 0) === 0}
            emptyTitle="Todavía no hay miembros en esta peña."
          >
            <div className="ck-card p-4">
              <ul aria-label="Miembros de la peña">
                {members?.map((m, i) => (
                  <li
                    key={m.userId}
                    className="border-b border-dashed border-[#d9c79a]/60 last:border-0"
                  >
                    <MemberRow member={m} color={PINS[i % PINS.length]!} />
                  </li>
                ))}
              </ul>
            </div>
          </ScreenState>
        </section>

        {/* ── Invitar (solo OWNER) ── */}
        {isOwner && (
          <section className="flex flex-col gap-3" aria-labelledby="invite-heading">
            <h2 id="invite-heading" className="ck-marker text-2xl text-accent">
              invitar a alguien
            </h2>
            <button
              type="button"
              onClick={onGeneratePin}
              disabled={pinLoading}
              className="ck-btn ck-btn-blue self-start disabled:opacity-60"
            >
              {pinLoading ? 'Generando…' : 'Generar PIN'}
            </button>
            {pinError && (
              <p
                role="alert"
                className="ck-card p-3 ck-marker text-xl"
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
              >
                {pinError}
              </p>
            )}
            {generatedPin && <PinShare pin={generatedPin} />}
          </section>
        )}

        {/* ── Salir de la peña ── */}
        <section className="flex flex-col gap-3" aria-labelledby="leave-heading">
          <h2 id="leave-heading" className="ck-marker text-2xl text-accent">
            salir de la peña
          </h2>
          {leaveError && (
            <p
              role="alert"
              className="ck-card p-3 ck-marker text-xl"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              {leaveError}
            </p>
          )}
          {confirmLeave ? (
            <div className="ck-card p-4 flex flex-col gap-3">
              <p className="text-base opacity-80">¿Seguro que quieres salir de esta peña?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ck-btn ck-btn-red disabled:opacity-60"
                  onClick={handleLeave}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? 'Saliendo…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  className="ck-btn disabled:opacity-60"
                  onClick={() => setConfirmLeave(false)}
                  disabled={leaveLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="ck-btn ck-btn-red self-start"
              onClick={handleLeave}
            >
              Salir de la peña
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ─────────────────────────────────────────

function MemberRow({ member, color }: { member: GroupMemberDto; color: string }) {
  const roleLabel = member.role === 'OWNER' ? 'Propietario' : 'Miembro';
  return (
    <div className="flex items-center gap-3 py-2">
      <MemberAvatar name={member.displayName} avatarUrl={member.avatarUrl} color={color} />
      <p className="text-lg flex-1 min-w-0 truncate">{member.displayName}</p>
      <span className="ck-tag">{roleLabel}</span>
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
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="ck-marker h-10 w-10 shrink-0 grid place-items-center rounded-full text-2xl text-white"
      style={{ background: color }}
      aria-hidden="true"
    >
      {name[0]?.toUpperCase()}
    </span>
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
    <div className="ck-card p-4 flex flex-col gap-3">
      <span className="ck-tape" />
      <p className="ck-marker text-xl opacity-70">PIN generado</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="ck-marker text-3xl tracking-[0.2em] text-accent">{pin}</span>
        <button type="button" className="ck-btn !text-base !py-1 !px-3" onClick={handleCopy}>
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="flex gap-4">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base underline"
        >
          Compartir por WhatsApp
        </a>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base underline"
        >
          Compartir por Telegram
        </a>
      </div>
    </div>
  );
}
