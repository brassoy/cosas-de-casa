/**
 * FriendsView — vista presentacional `cozy` de "Familias amigas".
 *
 * Reestilizado "cuaderno de papel manuscrito": papel crema pautado (.ck-page),
 * notas de papel con chincheta (.ck-card + .ck-pin) y cinta (.ck-tape), tinta
 * marrón, bolígrafo azul, fuentes manuscritas (Caveat .ck-marker / Patrick Hand)
 * sobre el MISMO contrato `FriendsViewProps` que la vista base. Misma
 * funcionalidad, mismos callbacks y sub-flujos (copiar código con feedback
 * efímero, quitar familia con confirmación de dos pasos); solo cambia la estética.
 *
 * Presentacional pura: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. Estado de UI local permitido (copiado,
 * confirmación de borrado).
 *
 * Se conservan los nombres accesibles y textos que la suite de la feature
 * espera: heading h2 "Familias amigas", botón "Generar código de invitación",
 * estado vacío "Aún no tienes familias amigas", "Quitar"/"Confirmar", enlaces
 * de compartir WhatsApp/Telegram, "Canjear código de amistad".
 */

import { useState } from 'react';
import { ArrowLeft, Copy, Check, Send, Share2, Users } from 'lucide-react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { FriendFamilyDto } from '../../contracts';
import type { FriendsViewProps } from '../types';

// ── Helpers presentacionales ─────────────────────────────────────────────────

function buildShareText(code: string): string {
  return `¡Conecta tu familia con la mía en Cosas de Casa! Usa el código: ${code}`;
}

function formatSince(since: string): string {
  return new Date(since).toLocaleDateString('es-ES', { dateStyle: 'medium' });
}

/** Tintas de las chinchetas/avatares del cuaderno (rojo, azul, verde, ocre, morado). */
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

// ── Vista principal ───────────────────────────────────────────────────────────

export default function FriendsView({
  friends,
  isLoading,
  error,
  generatedCode,
  isGenerating,
  inviteError,
  removeError,
  removingLinkId,
  onGenerateInvite,
  onCopy,
  onRemove,
  onGoRedeem,
  onBack,
}: FriendsViewProps) {
  const list = friends ?? [];

  return (
    <div className="ck ck-page min-h-screen">
      <div className="mx-auto flex max-w-[520px] flex-col gap-7 px-5 pb-24 pt-8">
        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <header className="relative text-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al inicio"
            className="ck-marker absolute left-0 top-0 text-xl text-[#2d4a8a]"
          >
            <ArrowLeft className="mr-0.5 inline h-4 w-4" aria-hidden="true" />
            volver
          </button>
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h2 className="ck-marker mt-1 text-5xl leading-none text-[#2d4a8a]">
            <span aria-hidden="true">👫 </span>Familias amigas
          </h2>
          {friends ? (
            <p className="mt-2 text-base opacity-80">
              {friends.length} {friends.length === 1 ? 'familia conectada' : 'familias conectadas'}
            </p>
          ) : null}
        </header>

        {/* ── Invitar una familia amiga ──────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="invite-heading">
          <h3 id="invite-heading" className="ck-marker text-3xl text-[#c0392b]">
            Invitar una familia amiga
          </h3>
          <button
            type="button"
            onClick={onGenerateInvite}
            disabled={isGenerating}
            className="ck-btn ck-btn-blue w-fit disabled:opacity-60"
          >
            {isGenerating ? 'Generando…' : 'Generar código de invitación'}
          </button>

          {inviteError && (
            <div className="ck-card p-3 text-base text-[#c0392b]" role="alert">
              {inviteError}
            </div>
          )}

          {generatedCode && <InviteCodeShare code={generatedCode} onCopy={onCopy} />}
        </section>

        {/* ── ¿Tienes un código? ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="redeem-heading">
          <h3 id="redeem-heading" className="ck-marker text-3xl text-[#c0392b]">
            ¿Tienes un código?
          </h3>
          <button type="button" onClick={onGoRedeem} className="ck-btn w-fit">
            Canjear código de amistad
          </button>
        </section>

        {/* ── Lista de familias amigas ───────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="list-heading">
          <h3 id="list-heading" className="ck-marker text-3xl text-[#2d4a8a]">
            Tus familias amigas {friends ? `(${friends.length})` : ''}
          </h3>

          {removeError && (
            <div className="ck-card p-3 text-base text-[#c0392b]" role="alert">
              {removeError}
            </div>
          )}

          <ScreenState
            isLoading={isLoading}
            error={error ? 'No se han podido cargar las familias amigas.' : null}
            isEmpty={!isLoading && !error && list.length === 0}
            emptyIcon={<Users className="h-10 w-10" aria-hidden="true" />}
            emptyTitle="Aún no tienes familias amigas"
          >
            {list.length > 0 && (
              <ul className="flex list-none flex-col gap-3 p-0" aria-label="Familias amigas">
                {list.map((friend, i) => (
                  <FriendCard
                    key={friend.linkId}
                    friend={friend}
                    color={PINS[i % PINS.length]!}
                    removing={removingLinkId === friend.linkId}
                    onRemove={() => onRemove(friend.linkId)}
                  />
                ))}
              </ul>
            )}
          </ScreenState>

          {/* Refuerza el copy del estado vacío del kit base (ScreenState solo
              pinta el título; añadimos la guía de acción). */}
          {!isLoading && !error && list.length === 0 && (
            <p className="text-center text-base opacity-70">
              Genera un código de invitación y compártelo con otra familia.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Subcomponentes presentacionales ──────────────────────────────────────────

function InviteCodeShare({
  code,
  onCopy,
}: {
  code: string;
  onCopy: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(code);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(origin)}&text=${encodeURIComponent(text)}`;

  function handleCopy() {
    onCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="ck-card mt-2 flex flex-col gap-3 p-4">
      <span className="ck-tape" aria-hidden="true" />
      <p className="ck-marker text-xl text-[#c0392b]">código de invitación</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="ck-marker text-4xl tracking-[0.15em] text-[#2d4a8a]">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="ck-btn inline-flex items-center gap-1.5 !px-3 !py-1 !text-base"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar
            </>
          )}
        </button>
      </div>
      <p className="text-sm opacity-70">Comparte este código una sola vez. Caduca tras usarse.</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ck-btn inline-flex items-center gap-1.5 !px-3 !py-1 !text-base text-[#5b8a3a]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir por WhatsApp
        </a>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ck-btn inline-flex items-center gap-1.5 !px-3 !py-1 !text-base text-[#2d4a8a]"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Compartir por Telegram
        </a>
      </div>
    </div>
  );
}

function FriendCard({
  friend,
  color,
  removing,
  onRemove,
}: {
  friend: FriendFamilyDto;
  color: string;
  removing: boolean;
  onRemove: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  function handleRemoveClick() {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    onRemove();
  }

  return (
    <li>
      <div className="ck-card relative flex items-center justify-between gap-4 p-4">
        <span
          className="ck-pin"
          style={{ background: `radial-gradient(circle at 30% 30%, #fff, ${color})` }}
          aria-hidden="true"
        />
        <div className="flex min-w-0 items-center gap-3">
          {friend.familyImageUrl ? (
            <img
              src={friend.familyImageUrl}
              alt={friend.familyName}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="ck-marker grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl text-white"
              style={{ background: color }}
              aria-hidden="true"
            >
              {friend.familyName[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="ck-marker truncate text-xl text-[#2d4a8a]">{friend.familyName}</p>
            <p className="text-sm opacity-70">Amigas desde {formatSince(friend.since)}</p>
          </div>
        </div>

        <div className="shrink-0">
          {confirmRemove ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={removing}
                className="ck-btn ck-btn-red !px-3 !py-1 !text-base disabled:opacity-60"
              >
                {removing ? 'Quitando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                disabled={removing}
                className="ck-btn !px-3 !py-1 !text-base disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="ck-btn !px-3 !py-1 !text-base text-[#c0392b]"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
