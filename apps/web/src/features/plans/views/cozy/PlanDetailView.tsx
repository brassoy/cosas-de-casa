/**
 * PlanDetailView — vista presentacional `cozy` (cuaderno manuscrito) del detalle de
 * un plan.
 *
 * Misma funcionalidad y contrato que la vista base (`PlanDetailViewProps`): RSVP,
 * participantes, compartir con familia amiga (solo owner), chat realtime (pinta
 * `messages`, auto-scroll, burbujas mías/ajenas) y borrado de dos toques. Todo
 * el estado de UI (familia a compartir, texto en redacción, confirmación de
 * borrado, ref de scroll) y los handlers son idénticos a la base; solo cambia la
 * estética con las clases `.ck-*` (papel crema, cinta, chinchetas, sellos, boli).
 *
 * El chat realtime (suscripción, dedup, resolución de nombres) vive en el
 * container: esta vista solo PINTA `messages` y emite `onSendMessage`. La lista
 * de `friendFamilies` ya viene filtrada por el container (sin las ya compartidas).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Pencil, Send, Trash2 } from 'lucide-react';
import type { PlanRsvpStatus, PlanStatus } from '../../contracts';
import type { PlanDetailViewProps } from '../types';
import { buildUpdatePlanBody, initialEditValues } from '../planDetail.helpers';

const STATUS_OPTIONS: PlanStatus[] = ['proposed', 'confirmed', 'cancelled'];

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

/** Color de tinta del sello según estado (paleta del cuaderno). */
const STATUS_STAMP: Record<PlanStatus, string> = {
  proposed: 'var(--color-accent)',
  confirmed: 'var(--color-success)',
  cancelled: 'var(--color-error)',
};

const RSVP_LABEL: Record<PlanRsvpStatus, string> = {
  going: 'Voy',
  maybe: 'Quizá',
  declined: 'No voy',
};

const RSVP_OPTIONS: PlanRsvpStatus[] = ['going', 'maybe', 'declined'];

/**
 * Clase modificadora de botón del theme para cada respuesta RSVP activa.
 * Nota: `.ck-btn-blue`/`.ck-btn-red` SOLO redefinen color/fondo/borde; la forma
 * (pill, tipografía, sombra) la aporta `.ck-btn`, que SIEMPRE se compone aparte.
 */
const RSVP_BTN: Record<PlanRsvpStatus, string> = {
  going: 'ck-btn-blue',
  maybe: '',
  declined: 'ck-btn-red',
};

/** Tonos de avatar/chincheta del kit. Indexados cíclicamente por participante. */
const PIN_COLORS = [
  'var(--color-error)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  '#8e44ad',
];

/** Color tipado a string (evita T|undefined con noUncheckedIndexedAccess). */
const pinColor = (i: number): string => PIN_COLORS[i % PIN_COLORS.length]!;

export default function PlanDetailView(props: PlanDetailViewProps) {
  const {
    plan,
    messages,
    currentUserId,
    isOwner,
    friendFamilies,
    savedPlaces = [],
    messagesLoading,
    isSavingRsvp,
    isSharing,
    isSendingMessage,
    isDeleting,
    isUpdating,
    isDeletingPlace,
    rsvpError,
    shareError,
    deleteError,
    updateError,
    deletePlaceError,
    onBack,
    onRsvp,
    onShare,
    onSendMessage,
    onDelete,
    onUpdatePlan,
    onDeletePlace,
  } = props;

  const myRsvp = plan.participants.find((p) => p.userId === currentUserId)?.status;
  const [shareWith, setShareWith] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState(() => initialEditValues(plan));
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

  function openEdit() {
    setEdit(initialEditValues(plan));
    setEditing(true);
  }

  function handleSaveEdit() {
    if (!onUpdatePlan || !edit.title.trim()) return;
    onUpdatePlan(buildUpdatePlanBody(edit, plan));
    setEditing(false);
  }

  function handleDeletePlace(placeId: string) {
    if (!onDeletePlace) return;
    if (window.confirm('¿Seguro que quieres borrar este lugar?')) {
      onDeletePlace(placeId);
    }
  }

  return (
    <div className="ck ck-page min-h-[80dvh] space-y-5 px-5 py-8">
      {/* ── Cabecera del cuaderno + sello de estado ────────────────────────── */}
      <div className="text-center relative">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-0 top-0 ck-marker text-xl cursor-pointer"
          style={{ color: 'var(--color-accent)' }}
        >
          ← volver
        </button>
        <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
        <h1
          className="ck-marker text-5xl leading-none mt-1"
          style={{ color: 'var(--color-accent)' }}
        >
          {plan.title}
        </h1>
        <span
          className="ck-stamp mt-2 inline-block"
          style={{ color: STATUS_STAMP[plan.status], borderColor: STATUS_STAMP[plan.status] }}
        >
          {STATUS_LABEL[plan.status]}
        </span>
        {plan.description && !editing && (
          <p className="text-base mt-2 opacity-80">{plan.description}</p>
        )}
        {isOwner && onUpdatePlan && !editing && (
          <div className="mt-2">
            <button
              type="button"
              className="ck-btn ck-btn-blue inline-flex items-center gap-2 text-base"
              onClick={openEdit}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          </div>
        )}
      </div>

      {/* ── Editar plan (solo owner) ───────────────────────────────────────── */}
      {isOwner && onUpdatePlan && editing && (
        <div className="ck-card p-4 space-y-3">
          <span className="ck-pin" aria-hidden />
          <h2 className="ck-marker text-2xl" style={{ color: 'var(--color-accent)' }}>
            editar plan
          </h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="ck-edit-title">
              Título *
            </label>
            <input
              id="ck-edit-title"
              className="ck-input w-full"
              value={edit.title}
              onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="ck-edit-description">
              Descripción
            </label>
            <textarea
              id="ck-edit-description"
              className="ck-input w-full"
              rows={3}
              value={edit.description}
              onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="ck-edit-scheduled-at">
              Cuándo
            </label>
            <input
              id="ck-edit-scheduled-at"
              className="ck-input w-full"
              type="datetime-local"
              value={edit.scheduledAt}
              onChange={(e) => setEdit((s) => ({ ...s, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="ck-edit-status">
              Estado
            </label>
            <select
              id="ck-edit-status"
              className="ck-input w-full"
              aria-label="Estado del plan"
              value={edit.status}
              onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value as PlanStatus }))}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          </div>
          {updateError && (
            <p className="ck-marker text-lg" style={{ color: 'var(--color-error)' }} role="alert">
              {updateError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="ck-btn ck-btn-blue text-base"
              onClick={handleSaveEdit}
              disabled={isUpdating || !edit.title.trim()}
            >
              {isUpdating ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="ck-btn text-base"
              onClick={() => setEditing(false)}
              disabled={isUpdating}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Cuándo / dónde / cuántos ───────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-3 text-base opacity-80">
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
      <div className="ck-card p-4 space-y-2">
        <span className="ck-tape" aria-hidden />
        <p className="ck-marker text-2xl" style={{ color: 'var(--color-accent)' }}>
          tu respuesta
        </p>
        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`ck-btn ${myRsvp === r ? RSVP_BTN[r] : ''} text-base`}
              onClick={() => onRsvp(r)}
              disabled={isSavingRsvp}
            >
              {RSVP_LABEL[r]}
            </button>
          ))}
        </div>
        {rsvpError && (
          <p className="ck-marker text-lg" style={{ color: 'var(--color-error)' }} role="alert">
            {rsvpError}
          </p>
        )}
      </div>

      {/* ── Participantes ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="ck-marker text-2xl mb-2" style={{ color: 'var(--color-accent)' }}>
          quién viene
        </h2>
        <div className="ck-card p-3">
          {plan.participants.map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 py-2 border-b border-dashed last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span
                className="h-10 w-10 grid place-items-center rounded-full ck-marker text-xl shrink-0"
                style={{ background: pinColor(i), color: 'var(--color-text-inverse)' }}
              >
                {p.displayName.charAt(0)}
              </span>
              <p className="flex-1 truncate text-lg">{p.displayName}</p>
              <span className="ck-tag shrink-0">{RSVP_LABEL[p.status]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compartir con familia amiga (solo owner) ───────────────────────── */}
      {isOwner && friendFamilies.length > 0 && (
        <div className="ck-card p-4 space-y-2">
          <span className="ck-pin" aria-hidden />
          <h2 className="ck-marker text-2xl" style={{ color: 'var(--color-accent)' }}>
            compartir con familia amiga
          </h2>
          <p className="text-sm opacity-70">
            Ya compartido con {plan.sharedWithFamilyIds.length}{' '}
            {plan.sharedWithFamilyIds.length === 1 ? 'familia' : 'familias'}.
          </p>
          <div className="flex gap-2 items-end">
            <select
              className="ck-input"
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
              className="ck-btn whitespace-nowrap text-base"
              disabled={!shareWith || isSharing}
              onClick={handleShare}
            >
              {isSharing ? 'Compartiendo…' : 'Compartir'}
            </button>
          </div>
          {shareError && (
            <p className="ck-marker text-lg" style={{ color: 'var(--color-error)' }} role="alert">
              {shareError}
            </p>
          )}
        </div>
      )}

      {/* ── Chat del plan ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="ck-marker text-2xl mb-2" style={{ color: 'var(--color-accent)' }}>
          chat del plan
        </h2>
        <div
          className="ck-card ck-page p-3 h-64 overflow-y-auto space-y-2"
          aria-live="polite"
          aria-label="Hilo de mensajes del plan"
        >
          {messagesLoading && (
            <p className="text-base opacity-70 text-center pt-8">Cargando mensajes…</p>
          )}

          {!messagesLoading && messages.length === 0 && (
            <p className="text-base opacity-70 text-center pt-8">
              Aún no hay mensajes. ¡Sé el primero en escribir!
            </p>
          )}

          {messages.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[78%] rounded-2xl px-3 py-2 text-base border"
                  style={
                    mine
                      ? {
                          background: 'var(--color-accent)',
                          color: 'var(--color-text-inverse)',
                          borderColor: 'var(--color-accent)',
                        }
                      : {
                          background: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                        }
                  }
                >
                  {!mine && <p className="ck-marker text-sm opacity-80 mb-0.5">{m.displayName}</p>}
                  <p>{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 mt-2 items-end">
          <input
            className="ck-input"
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
            className="ck-btn ck-btn-blue"
            onClick={handleSend}
            disabled={isSendingMessage || !msg.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Lugares guardados de la familia (solo owner, borrado) ──────────── */}
      {isOwner && onDeletePlace && savedPlaces.length > 0 && (
        <div className="ck-card p-4 space-y-2">
          <h2 className="ck-marker text-2xl" style={{ color: 'var(--color-accent)' }}>
            lugares guardados
          </h2>
          {deletePlaceError && (
            <p className="ck-marker text-lg" style={{ color: 'var(--color-error)' }} role="alert">
              {deletePlaceError}
            </p>
          )}
          {savedPlaces.map((sp) => (
            <div
              key={sp.id}
              className="flex items-center gap-3 py-2 border-b border-dashed last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <MapPin className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1 truncate text-lg">
                {sp.name}
                {sp.address ? ` — ${sp.address}` : ''}
              </span>
              <button
                type="button"
                className="ck-btn ck-btn-red text-base flex items-center gap-1 shrink-0"
                onClick={() => handleDeletePlace(sp.id)}
                disabled={isDeletingPlace}
                aria-label={`Borrar lugar ${sp.name}`}
              >
                <Trash2 className="h-4 w-4" />
                Borrar lugar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Eliminar plan (solo owner, confirmación de dos toques) ─────────── */}
      {isOwner && (
        <div className="space-y-2">
          {deleteError && (
            <p className="ck-marker text-lg" style={{ color: 'var(--color-error)' }} role="alert">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            className={`ck-btn ${confirm ? 'ck-btn-red' : ''} w-full flex items-center justify-center gap-2`}
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
