/**
 * FriendsView — vista presentacional `cozysitcom` de "Familias amigas".
 *
 * Reestilizado retro-sitcom 70s (madera, mostaza, granate, denim) sobre el
 * MISMO contrato `FriendsViewProps` que la vista base. Misma funcionalidad,
 * mismos callbacks y sub-flujos (copiar código con feedback efímero, quitar
 * familia con confirmación de dos pasos); solo cambia la estética.
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

/** Paleta de avatares del kit (denim, mostaza, granate, retro, madera). */
const AVATAR_COLORS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'];

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
    <div className="cz cz-wallpaper min-h-screen">
      <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 pb-24 pt-6">
        {/* ── Cabecera ─────────────────────────────────────────────────────── */}
        <header className="cz-pop">
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al inicio"
            className="mb-2 text-xs font-bold opacity-70 hover:opacity-100"
          >
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            Inicio
          </button>
          <div className="cz-wood mb-2 inline-block">
            <p className="cz-serif text-base">Familias amigas</p>
          </div>
          <h2 className="cz-serif text-4xl leading-none">
            <span aria-hidden="true">👫 </span>Familias amigas
          </h2>
          {friends ? (
            <p className="mt-1 text-sm opacity-70">{friends.length} familias</p>
          ) : null}
          <div className="cz-stripe mt-3" />
        </header>

        {/* ── Invitar una familia amiga ──────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="invite-heading">
          <h3 id="invite-heading" className="cz-serif text-xl">
            Invitar una familia amiga
          </h3>
          <button
            type="button"
            onClick={onGenerateInvite}
            disabled={isGenerating}
            className="cz-btn-denim w-fit disabled:opacity-60"
          >
            {isGenerating ? 'Generando…' : 'Generar código de invitación'}
          </button>

          {inviteError && (
            <div className="cz-frame !border-error text-sm text-error" role="alert">
              {inviteError}
            </div>
          )}

          {generatedCode && <InviteCodeShare code={generatedCode} onCopy={onCopy} />}
        </section>

        {/* ── ¿Tienes un código? ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="redeem-heading">
          <h3 id="redeem-heading" className="cz-serif text-xl">
            ¿Tienes un código?
          </h3>
          <button type="button" onClick={onGoRedeem} className="cz-btn-ghost w-fit">
            Canjear código de amistad
          </button>
        </section>

        {/* ── Lista de familias amigas ───────────────────────────────────────── */}
        <section className="flex flex-col gap-3" aria-labelledby="list-heading">
          <h3 id="list-heading" className="cz-serif text-xl">
            Tus familias amigas {friends ? `(${friends.length})` : ''}
          </h3>

          {removeError && (
            <div className="cz-frame !border-error text-sm text-error" role="alert">
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
                    color={AVATAR_COLORS[i % AVATAR_COLORS.length]!}
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
            <p className="text-center text-sm opacity-70">
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
    <div className="cz-paper cz-pop flex flex-col gap-3 p-4">
      <p className="text-sm opacity-70">Código de invitación</p>
      <div className="flex items-center gap-3">
        <span className="cz-serif text-2xl font-bold tracking-[0.15em]">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="cz-btn-mustard inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm"
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
      <p className="text-xs opacity-60">
        Comparte este código una sola vez. Caduca tras usarse.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cz-btn-ghost inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm !text-success"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir por WhatsApp
        </a>
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cz-btn-ghost inline-flex items-center gap-1.5 !px-3 !py-1.5 text-sm !text-info"
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
      <div className="cz-frame flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {friend.familyImageUrl ? (
            <img
              src={friend.familyImageUrl}
              alt={friend.familyName}
              className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover shadow"
            />
          ) : (
            <div
              className="cz-serif grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white text-lg font-extrabold text-white shadow"
              style={{ background: color }}
              aria-hidden="true"
            >
              {friend.familyName[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="cz-serif truncate">{friend.familyName}</p>
            <p className="text-xs opacity-60">Amigas desde {formatSince(friend.since)}</p>
          </div>
        </div>

        <div className="shrink-0">
          {confirmRemove ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemoveClick}
                disabled={removing}
                className="cz-btn-garnet !px-3 !py-1.5 text-sm disabled:opacity-60"
              >
                {removing ? 'Quitando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                disabled={removing}
                className="cz-btn-ghost !px-3 !py-1.5 text-sm disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRemoveClick}
              className="cz-btn-ghost !px-3 !py-1.5 text-sm !text-error"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
