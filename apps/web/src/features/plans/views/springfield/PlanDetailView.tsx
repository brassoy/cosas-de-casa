/**
 * PlanDetailView — vista presentacional `springfield` (cómic pop) del detalle de
 * un plan.
 *
 * Misma funcionalidad y contrato que la vista base (`PlanDetailViewProps`): RSVP,
 * participantes, compartir con familia amiga (solo owner), chat realtime (pinta
 * `messages`, auto-scroll, burbujas mías/ajenas) y borrado de dos toques. Todo
 * el estado de UI (familia a compartir, texto en redacción, confirmación de
 * borrado, ref de scroll) y los handlers son idénticos a la base; solo cambia la
 * estética con las clases `.sf-*`.
 *
 * El chat realtime (suscripción, dedup, resolución de nombres) vive en el
 * container: esta vista solo PINTA `messages` y emite `onSendMessage`. La lista
 * de `friendFamilies` ya viene filtrada por el container (sin las ya compartidas).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Send, Trash2 } from 'lucide-react';
import type { PlanRsvpStatus, PlanStatus } from '../../contracts';
import type { PlanDetailViewProps } from '../types';

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const STATUS_TAG: Record<PlanStatus, { background: string; color: string }> = {
  proposed: { background: 'var(--color-accent)', color: 'var(--color-text)' },
  confirmed: { background: 'var(--color-success)', color: 'var(--color-text-inverse)' },
  cancelled: { background: 'var(--color-error)', color: 'var(--color-text-inverse)' },
};

const RSVP_LABEL: Record<PlanRsvpStatus, string> = {
  going: 'Voy',
  maybe: 'Quizá',
  declined: 'No voy',
};

const RSVP_TAG: Record<PlanRsvpStatus, { background: string; color: string }> = {
  going: { background: 'var(--color-success)', color: 'var(--color-text-inverse)' },
  maybe: { background: 'var(--color-accent)', color: 'var(--color-text)' },
  declined: { background: 'var(--color-error)', color: 'var(--color-text-inverse)' },
};

const RSVP_OPTIONS: PlanRsvpStatus[] = ['going', 'maybe', 'declined'];

/** Clase modificadora de botón del theme para cada respuesta RSVP. */
const RSVP_BTN: Record<PlanRsvpStatus, string> = {
  going: 'sf-btn-g',
  maybe: 'sf-btn-w',
  declined: 'sf-btn-r',
};

/** Paleta de avatares del kit (cómic). Indexada cíclicamente por participante. */
const AVATAR_COLORS = [
  'var(--color-accent)',
  'var(--color-info)',
  '#f48fb1',
  'var(--color-success)',
  'var(--color-error)',
];

/** Color de avatar tipado a string (evita T|undefined con noUncheckedIndexedAccess). */
const avatarColor = (i: number): string => AVATAR_COLORS[i % AVATAR_COLORS.length]!;

export default function PlanDetailView(props: PlanDetailViewProps) {
  const {
    plan,
    messages,
    currentUserId,
    isOwner,
    friendFamilies,
    messagesLoading,
    isSavingRsvp,
    isSharing,
    isSendingMessage,
    isDeleting,
    rsvpError,
    shareError,
    deleteError,
    onBack,
    onRsvp,
    onShare,
    onSendMessage,
    onDelete,
  } = props;

  const myRsvp = plan.participants.find((p) => p.userId === currentUserId)?.status;
  const [shareWith, setShareWith] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llegan mensajes nuevos.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend() {
    const trimmed = msg.trim();
    if (!trimmed || isSendingMessage) return;
    setMsg('');
    onSendMessage(trimmed);
  }

  function handleShare() {
    if (!shareWith) return;
    onShare(shareWith);
    setShareWith('');
  }

  function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    onDelete();
  }

  return (
    <div className="sf space-y-4">
      {/* ── Cabecera amarilla de viñeta + pegatina de estado ───────────────── */}
      <div className="sf-card-y p-4 relative sf-pop">
        <button
          type="button"
          onClick={onBack}
          className="sf-sticker cursor-pointer"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          ← Planes
        </button>
        <div className="flex items-end justify-between gap-2 mt-2">
          <h1 className="sf-bangers text-4xl leading-none">{plan.title}</h1>
          <span className="sf-tag shrink-0" style={STATUS_TAG[plan.status]}>
            {STATUS_LABEL[plan.status]}
          </span>
        </div>
        {plan.description && <p className="sf-fredoka text-sm mt-2">{plan.description}</p>}
      </div>

      {/* ── Cuándo / dónde / cuántos ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-sm font-semibold opacity-80">
        {plan.scheduledAt && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(plan.scheduledAt).toLocaleString('es-ES')}
          </span>
        )}
        {plan.place && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {plan.place.name}
            {plan.place.address ? ` — ${plan.place.address}` : ''}
          </span>
        )}
        <span className="flex items-center gap-1">
          👥 {plan.participants.length}{' '}
          {plan.participants.length === 1 ? 'participante' : 'participantes'}
        </span>
      </div>

      {/* ── Mi respuesta (RSVP) ────────────────────────────────────────────── */}
      <div className="sf-card p-4 space-y-2">
        <p className="sf-bangers text-lg">Tu respuesta</p>
        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`sf-btn ${myRsvp === r ? RSVP_BTN[r] : 'sf-btn-w'}`}
              onClick={() => onRsvp(r)}
              disabled={isSavingRsvp}
            >
              {RSVP_LABEL[r]}
            </button>
          ))}
        </div>
        {rsvpError && (
          <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }} role="alert">
            {rsvpError}
          </p>
        )}
      </div>

      {/* ── Participantes ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="sf-bangers text-xl mb-2">Quién viene</h2>
        <div className="sf-card p-3 space-y-2">
          {plan.participants.map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 p-1">
              <div
                className="w-10 h-10 rounded-full grid place-items-center sf-bangers text-lg border-[3px] shrink-0"
                style={{
                  background: avatarColor(i),
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {p.displayName.charAt(0)}
              </div>
              <p className="sf-fredoka flex-1 truncate">{p.displayName}</p>
              <span className="sf-tag shrink-0" style={RSVP_TAG[p.status]}>
                {RSVP_LABEL[p.status]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compartir con familia amiga (solo owner) ───────────────────────── */}
      {isOwner && friendFamilies.length > 0 && (
        <div className="sf-card-s p-4 space-y-2">
          <h2 className="sf-bangers text-lg">Compartir con familia amiga</h2>
          <p className="text-xs font-semibold opacity-70">
            Ya compartido con {plan.sharedWithFamilyIds.length}{' '}
            {plan.sharedWithFamilyIds.length === 1 ? 'familia' : 'familias'}.
          </p>
          <div className="flex gap-2">
            <select
              className="sf-input"
              aria-label="Selecciona una familia amiga"
              value={shareWith}
              onChange={(e) => setShareWith(e.target.value)}
            >
              <option value="">Elige una familia</option>
              {friendFamilies.map((f) => (
                <option key={f.linkId} value={f.familyId}>
                  {f.familyName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="sf-btn whitespace-nowrap"
              disabled={!shareWith || isSharing}
              onClick={handleShare}
            >
              {isSharing ? 'Compartiendo…' : 'Compartir'}
            </button>
          </div>
          {shareError && (
            <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }} role="alert">
              {shareError}
            </p>
          )}
        </div>
      )}

      {/* ── Chat del plan ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="sf-bangers text-xl mb-2">Chat del plan</h2>
        <div
          className="sf-card sf-dot p-3 h-64 overflow-y-auto space-y-2"
          aria-live="polite"
          aria-label="Hilo de mensajes del plan"
        >
          {messagesLoading && (
            <p className="text-sm font-semibold opacity-70 text-center pt-8">Cargando mensajes…</p>
          )}

          {!messagesLoading && messages.length === 0 && (
            <p className="text-sm font-semibold opacity-70 text-center pt-8">
              Aún no hay mensajes. ¡Sé el primero en escribir!
            </p>
          )}

          {messages.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[78%] rounded-2xl px-3 py-2 text-sm font-semibold border-2"
                  style={
                    mine
                      ? {
                          background: 'var(--color-accent)',
                          color: 'var(--color-text)',
                          borderColor: 'var(--color-border)',
                        }
                      : {
                          background: 'var(--color-surface-raised)',
                          borderColor: 'var(--color-border)',
                        }
                  }
                >
                  {!mine && <p className="text-[10px] opacity-70 mb-0.5 font-extrabold">{m.displayName}</p>}
                  <p>{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 mt-2">
          <input
            className="sf-input"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Escribe un mensaje…"
            disabled={isSendingMessage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="sf-btn"
            onClick={handleSend}
            disabled={isSendingMessage || !msg.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Eliminar plan (solo owner, confirmación de dos toques) ─────────── */}
      {isOwner && (
        <div className="space-y-2">
          {deleteError && (
            <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }} role="alert">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            className={`sf-btn ${confirm ? 'sf-btn-r' : 'sf-btn-w'} w-full flex items-center justify-center gap-2`}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {confirm ? '¿Seguro? Pulsa de nuevo' : 'Eliminar plan'}
          </button>
        </div>
      )}
    </div>
  );
}
