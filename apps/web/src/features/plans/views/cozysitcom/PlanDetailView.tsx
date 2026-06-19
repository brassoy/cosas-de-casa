/**
 * PlanDetailView — vista presentacional `cozysitcom` (sitcom retro 70s) del
 * detalle de un plan.
 *
 * Misma funcionalidad y contrato que la vista base (`PlanDetailViewProps`): RSVP,
 * participantes, compartir con familia amiga (solo owner), chat realtime (pinta
 * `messages`, auto-scroll, burbujas mías/ajenas) y borrado de dos toques. Todo
 * el estado de UI (familia a compartir, texto en redacción, confirmación de
 * borrado, ref de scroll) y los handlers son idénticos a la base; solo cambia la
 * estética con las clases `.cz-*`.
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

const STATUS_TAG: Record<PlanStatus, { background: string; color: string }> = {
  proposed: { background: 'var(--color-warning)', color: 'var(--color-text)' },
  confirmed: { background: 'var(--color-success)', color: '#fff' },
  cancelled: { background: 'var(--color-error)', color: '#fff' },
};

const RSVP_LABEL: Record<PlanRsvpStatus, string> = {
  going: 'Voy',
  maybe: 'Quizá',
  declined: 'No voy',
};

const RSVP_TAG: Record<PlanRsvpStatus, { background: string; color: string }> = {
  going: { background: 'var(--color-success)', color: '#fff' },
  maybe: { background: 'var(--color-warning)', color: 'var(--color-text)' },
  declined: { background: 'var(--color-error)', color: '#fff' },
};

const RSVP_OPTIONS: PlanRsvpStatus[] = ['going', 'maybe', 'declined'];

/** Clase de botón del theme para cada respuesta RSVP. */
const RSVP_BTN: Record<PlanRsvpStatus, string> = {
  going: 'cz-btn-denim',
  maybe: 'cz-btn-mustard',
  declined: 'cz-btn-garnet',
};

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
    <div className="cz min-h-[80dvh] space-y-4 px-5 py-8">
      {/* ── Cabecera de madera + sello de estado + cinta ───────────────────── */}
      <div className="cz-pop">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold mb-2 opacity-70 cursor-pointer"
        >
          ← Planes
        </button>
        <div className="cz-wood inline-block mb-2">
          <p className="cz-serif text-base">Plan</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <h1 className="cz-serif text-4xl leading-none">{plan.title}</h1>
          <span className="cz-tag shrink-0" style={STATUS_TAG[plan.status]}>
            {STATUS_LABEL[plan.status]}
          </span>
        </div>
        {plan.description && !editing && (
          <p className="text-sm opacity-70 mt-2">{plan.description}</p>
        )}
        {isOwner && onUpdatePlan && !editing && (
          <div className="mt-3">
            <button
              type="button"
              className="cz-btn-denim inline-flex items-center gap-2"
              onClick={openEdit}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          </div>
        )}
        <div className="cz-stripe mt-3" />
      </div>

      {/* ── Editar plan (solo owner) ───────────────────────────────────────── */}
      {isOwner && onUpdatePlan && editing && (
        <div className="cz-frame space-y-3">
          <h2 className="cz-serif text-lg">Editar plan</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="cz-edit-title">
              Título *
            </label>
            <input
              id="cz-edit-title"
              className="cz-input w-full"
              value={edit.title}
              onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="cz-edit-description">
              Descripción
            </label>
            <textarea
              id="cz-edit-description"
              className="cz-input w-full"
              rows={3}
              value={edit.description}
              onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="cz-edit-scheduled-at">
              Cuándo
            </label>
            <input
              id="cz-edit-scheduled-at"
              className="cz-input w-full"
              type="datetime-local"
              value={edit.scheduledAt}
              onChange={(e) => setEdit((s) => ({ ...s, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold" htmlFor="cz-edit-status">
              Estado
            </label>
            <select
              id="cz-edit-status"
              className="cz-input w-full"
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
            <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }} role="alert">
              {updateError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="cz-btn-denim"
              onClick={handleSaveEdit}
              disabled={isUpdating || !edit.title.trim()}
            >
              {isUpdating ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="cz-btn-ghost"
              onClick={() => setEditing(false)}
              disabled={isUpdating}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Cuándo / dónde / cuántos ───────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-sm opacity-80">
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
      <div className="cz-frame space-y-2">
        <p className="cz-serif text-lg">Tu respuesta</p>
        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={myRsvp === r ? RSVP_BTN[r] : 'cz-btn-ghost'}
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
        <h2 className="cz-serif text-xl mb-2">Quién viene</h2>
        <div className="cz-frame">
          {plan.participants.map((p, i) => (
            <div key={p.userId}>
              {i > 0 && <div className="cz-divider my-2" />}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full grid place-items-center text-white font-extrabold border-2 border-white"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {p.displayName.charAt(0)}
                </div>
                <p className="cz-serif flex-1 truncate">{p.displayName}</p>
                <span className="cz-tag shrink-0" style={RSVP_TAG[p.status]}>
                  {RSVP_LABEL[p.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Compartir con familia amiga (solo owner) ───────────────────────── */}
      {isOwner && friendFamilies.length > 0 && (
        <div className="cz-frame space-y-2">
          <h2 className="cz-serif text-lg">Compartir con familia amiga</h2>
          <p className="text-xs opacity-70">
            Ya compartido con {plan.sharedWithFamilyIds.length}{' '}
            {plan.sharedWithFamilyIds.length === 1 ? 'familia' : 'familias'}.
          </p>
          <div className="flex gap-2">
            <select
              className="cz-input"
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
              className="cz-btn-denim whitespace-nowrap"
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
        <h2 className="cz-serif text-xl mb-2">Chat del plan</h2>
        <div
          className="cz-paper p-3 h-64 overflow-y-auto space-y-2"
          aria-live="polite"
          aria-label="Hilo de mensajes del plan"
        >
          {messagesLoading && (
            <p className="text-sm opacity-70 text-center pt-8">Cargando mensajes…</p>
          )}

          {!messagesLoading && messages.length === 0 && (
            <p className="text-sm opacity-70 text-center pt-8">
              Aún no hay mensajes. ¡Sé el primero en escribir!
            </p>
          )}

          {messages.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[78%] rounded-2xl px-3 py-2 text-sm"
                  style={
                    mine
                      ? { background: 'var(--color-accent)', color: '#fff' }
                      : { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }
                  }
                >
                  {!mine && <p className="text-[10px] opacity-70 mb-0.5 font-bold">{m.displayName}</p>}
                  <p>{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 mt-2">
          <input
            className="cz-input"
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
            className="cz-btn-denim"
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
        <div className="cz-frame space-y-2">
          <h2 className="cz-serif text-lg">Lugares guardados</h2>
          {deletePlaceError && (
            <p className="text-sm font-bold" style={{ color: 'var(--color-error)' }} role="alert">
              {deletePlaceError}
            </p>
          )}
          {savedPlaces.map((sp, i) => (
            <div key={sp.id}>
              {i > 0 && <div className="cz-divider my-2" />}
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 opacity-70" />
                <span className="cz-serif flex-1 truncate">
                  {sp.name}
                  {sp.address ? ` — ${sp.address}` : ''}
                </span>
                <button
                  type="button"
                  className="cz-btn-garnet flex items-center gap-1 shrink-0"
                  onClick={() => handleDeletePlace(sp.id)}
                  disabled={isDeletingPlace}
                  aria-label={`Borrar lugar ${sp.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar lugar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            className={`${confirm ? 'cz-btn-garnet' : 'cz-btn-ghost'} w-full flex items-center justify-center gap-2`}
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
