/**
 * FriendsView — vista presentacional `base` (shadcn) de "Familias amigas".
 *
 * NO hay componente base del kit de Lovable para friends: esta vista define la
 * referencia estética (coherente con menu/stats) a partir del contrato real.
 *
 * Presentacional pura: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. El container (`FriendsPage`) cablea
 * familyId (del store), mutaciones, clipboard, navegación e invalidaciones.
 *
 * Se conservan los nombres accesibles y textos que la suite de la feature
 * espera: heading h2 "Familias amigas", botón "Generar código de invitación",
 * estado vacío "Aún no tienes familias amigas", "Quitar"/"Confirmar", enlaces
 * de compartir WhatsApp/Telegram, "Canjear código de amistad".
 */

import { useState } from 'react';
import { ArrowLeft, Copy, Check, Send, Share2, Users } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import type { FriendFamilyDto } from '../../contracts';
import type { FriendsViewProps } from '../types';

// ── Helpers presentacionales ─────────────────────────────────────────────────

function buildShareText(code: string): string {
  return `¡Conecta tu familia con la mía en Cosas de Casa! Usa el código: ${code}`;
}

function formatSince(since: string): string {
  return new Date(since).toLocaleDateString('es-ES', { dateStyle: 'medium' });
}

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
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <Button
          variant="link"
          onClick={onBack}
          aria-label="Volver al inicio"
          className="h-auto w-fit gap-1 p-0 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Inicio
        </Button>
        <h2 className="text-3xl font-bold">
          <span aria-hidden="true">👫 </span>Familias amigas
        </h2>
      </header>

      {/* ── Invitar una familia amiga ────────────────────────────────────── */}
      <section className="flex flex-col gap-4" aria-labelledby="invite-heading">
        <h3 id="invite-heading" className="text-lg font-semibold">
          Invitar una familia amiga
        </h3>
        <Button onClick={onGenerateInvite} disabled={isGenerating} className="w-fit">
          {isGenerating ? 'Generando…' : 'Generar código de invitación'}
        </Button>

        {inviteError && (
          <Alert variant="destructive">
            <AlertDescription>{inviteError}</AlertDescription>
          </Alert>
        )}

        {generatedCode && <InviteCodeShare code={generatedCode} onCopy={onCopy} />}
      </section>

      {/* ── ¿Tienes un código? ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-4" aria-labelledby="redeem-heading">
        <h3 id="redeem-heading" className="text-lg font-semibold">
          ¿Tienes un código?
        </h3>
        <Button variant="outline" onClick={onGoRedeem} className="w-fit">
          Canjear código de amistad
        </Button>
      </section>

      {/* ── Lista de familias amigas ─────────────────────────────────────── */}
      <section className="flex flex-col gap-4" aria-labelledby="list-heading">
        <h3 id="list-heading" className="text-lg font-semibold">
          Tus familias amigas {friends ? `(${friends.length})` : ''}
        </h3>

        {removeError && (
          <Alert variant="destructive">
            <AlertDescription>{removeError}</AlertDescription>
          </Alert>
        )}

        <ScreenState
          isLoading={isLoading}
          error={error ? 'No se han podido cargar las familias amigas.' : null}
          isEmpty={!isLoading && !error && list.length === 0}
          emptyIcon={<Users className="h-10 w-10" aria-hidden="true" />}
          emptyTitle="Aún no tienes familias amigas"
        >
          {list.length > 0 && (
            <ul className="flex list-none flex-col gap-2 p-0" aria-label="Familias amigas">
              {list.map((friend) => (
                <FriendCard
                  key={friend.linkId}
                  friend={friend}
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
          <p className="text-center text-sm text-muted-foreground">
            Genera un código de invitación y compártelo con otra familia.
          </p>
        )}
      </section>
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
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">Código de invitación</p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xl font-bold tracking-[0.15em]">{code}</span>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
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
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Comparte este código una sola vez. Caduca tras usarse.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-success">
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartir por WhatsApp
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-info">
          <a href={tgUrl} target="_blank" rel="noopener noreferrer">
            <Send className="h-4 w-4" aria-hidden="true" />
            Compartir por Telegram
          </a>
        </Button>
      </div>
    </Card>
  );
}

function FriendCard({
  friend,
  removing,
  onRemove,
}: {
  friend: FriendFamilyDto;
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
      <Card className="flex items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="bg-accent-subtle">
            {friend.familyImageUrl ? (
              <AvatarImage src={friend.familyImageUrl} alt={friend.familyName} />
            ) : null}
            <AvatarFallback className="bg-accent-subtle font-bold text-accent">
              {friend.familyName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{friend.familyName}</p>
            <p className="text-xs text-muted-foreground">
              Amigas desde {formatSince(friend.since)}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {confirmRemove ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveClick}
                disabled={removing}
              >
                {removing ? 'Quitando…' : 'Confirmar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRemove(false)}
                disabled={removing}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveClick}
              className={cn('text-destructive hover:text-destructive')}
            >
              Quitar
            </Button>
          )}
        </div>
      </Card>
    </li>
  );
}
