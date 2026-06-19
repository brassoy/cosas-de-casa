/**
 * PlanDetailView — vista presentacional `base` (shadcn) del detalle de un plan.
 *
 * Porta el JSX del componente base del kit (Lovable `PlanDetailPage`) a las
 * primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con `PlanDto`,
 * `PlanMessageDto`, `PlanRsvpStatus` y `FriendFamilyDto` reales.
 *
 * El chat realtime (suscripción, dedup, resolución de nombres) vive en el
 * container: esta vista solo PINTA `messages` y emite `onSendMessage`. La lista
 * de `friendFamilies` ya viene filtrada por el container (sin las ya compartidas).
 *
 * El estado de UI presentacional (selección de familia a compartir, texto del
 * mensaje en redacción, confirmación de borrado de dos toques, auto-scroll del
 * chat) vive en la vista.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Pencil, Send, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/cn';
import type { PlanRsvpStatus, PlanStatus } from '../../contracts';
import type { PlanDetailViewProps } from '../types';
import { buildUpdatePlanBody, initialEditValues } from '../planDetail.helpers';

const STATUS_LABEL: Record<PlanStatus, string> = {
  proposed: 'Propuesto',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<PlanStatus, string> = {
  proposed: 'bg-warning/15 text-warning',
  confirmed: 'bg-success/15 text-success',
  cancelled: 'bg-error/15 text-error',
};

const RSVP_LABEL: Record<PlanRsvpStatus, string> = {
  going: 'Voy',
  maybe: 'Quizá',
  declined: 'No voy',
};

const RSVP_OPTIONS: PlanRsvpStatus[] = ['going', 'maybe', 'declined'];

const STATUS_OPTIONS: PlanStatus[] = ['proposed', 'confirmed', 'cancelled'];

export default function PlanDetailView(props: PlanDetailViewProps) {
  const {
    plan,
    messages,
    currentUserId,
    isOwner,
    friendFamilies,
    savedPlaces = [],
    messagesLoading,
    hasMoreMessages,
    isLoadingOlderMessages,
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
    onLoadOlderMessages,
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

  // Auto-scroll al final solo cuando llega un mensaje NUEVO (cambia el último).
  // Al cargar mensajes antiguos se prependen arriba: el último no cambia, así
  // que no saltamos al fondo y respetamos la posición de lectura del usuario.
  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMessageId]);

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
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <button type="button" onClick={onBack} className="text-sm text-muted-foreground cursor-pointer">
        ‹ Planes
      </button>

      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">{plan.title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              STATUS_COLOR[plan.status],
            )}
          >
            {STATUS_LABEL[plan.status]}
          </span>
          {isOwner && onUpdatePlan && !editing && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* ── Editar plan (solo owner) ───────────────────────────────────────── */}
      {isOwner && onUpdatePlan && editing && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Editar plan</h2>
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={edit.title}
              onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={edit.description}
              onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-scheduled-at">Cuándo</Label>
            <Input
              id="edit-scheduled-at"
              type="datetime-local"
              value={edit.scheduledAt}
              onChange={(e) => setEdit((s) => ({ ...s, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Estado</Label>
            <Select
              value={edit.status}
              onValueChange={(v) => setEdit((s) => ({ ...s, status: v as PlanStatus }))}
            >
              <SelectTrigger id="edit-status" aria-label="Estado del plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((st) => (
                  <SelectItem key={st} value={st}>
                    {STATUS_LABEL[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {updateError && (
            <Alert variant="destructive">
              <AlertDescription>{updateError}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} disabled={isUpdating || !edit.title.trim()}>
              {isUpdating ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={isUpdating}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {plan.description && !editing && <p className="text-muted-foreground">{plan.description}</p>}

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
      <Card className="p-4 space-y-2">
        <p className="font-semibold text-sm">Tu respuesta</p>
        <div className="grid grid-cols-3 gap-2">
          {RSVP_OPTIONS.map((r) => (
            <Button
              key={r}
              variant={myRsvp === r ? 'default' : 'outline'}
              onClick={() => onRsvp(r)}
              disabled={isSavingRsvp}
            >
              {RSVP_LABEL[r]}
            </Button>
          ))}
        </div>
        {rsvpError && (
          <Alert variant="destructive">
            <AlertDescription>{rsvpError}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* ── Participantes ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold mb-2">Participantes</h2>
        <ul className="space-y-1.5 list-none p-0 m-0">
          {plan.participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 p-2.5 rounded-md bg-muted">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-medium">
                {p.displayName.charAt(0)}
              </div>
              <span className="flex-1 truncate">{p.displayName}</span>
              <Badge variant="secondary">{RSVP_LABEL[p.status]}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Compartir con familia amiga (solo owner) ───────────────────────── */}
      {isOwner && friendFamilies.length > 0 && (
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Compartir con familia amiga</h2>
          <p className="text-xs text-muted-foreground">
            Ya compartido con {plan.sharedWithFamilyIds.length}{' '}
            {plan.sharedWithFamilyIds.length === 1 ? 'familia' : 'familias'}.
          </p>
          <div className="flex gap-2">
            <Select value={shareWith} onValueChange={setShareWith}>
              <SelectTrigger aria-label="Selecciona una familia amiga">
                <SelectValue placeholder="Elige una familia" />
              </SelectTrigger>
              <SelectContent>
                {friendFamilies.map((f) => (
                  <SelectItem key={f.linkId} value={f.familyId}>
                    {f.familyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!shareWith || isSharing} onClick={handleShare}>
              {isSharing ? 'Compartiendo…' : 'Compartir'}
            </Button>
          </div>
          {shareError && (
            <Alert variant="destructive">
              <AlertDescription>{shareError}</AlertDescription>
            </Alert>
          )}
        </Card>
      )}

      {/* ── Chat del plan ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold mb-2">Chat del plan</h2>
        <div
          className="bg-muted rounded-card p-3 h-64 overflow-y-auto space-y-2"
          aria-live="polite"
          aria-label="Hilo de mensajes del plan"
        >
          {messagesLoading && (
            <p className="text-sm text-muted-foreground text-center pt-8">Cargando mensajes…</p>
          )}

          {!messagesLoading && hasMoreMessages && onLoadOlderMessages && (
            <div className="flex justify-center pb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadOlderMessages}
                disabled={isLoadingOlderMessages}
              >
                {isLoadingOlderMessages ? 'Cargando…' : 'Cargar mensajes antiguos'}
              </Button>
            </div>
          )}

          {!messagesLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-8">
              Aún no hay mensajes. ¡Sé el primero en escribir!
            </p>
          )}

          {messages.map((m) => {
            const mine = m.userId === currentUserId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-background',
                  )}
                >
                  {!mine && <p className="text-[10px] opacity-70 mb-0.5">{m.displayName}</p>}
                  <p>{m.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 mt-2">
          <Input
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
          <Button
            onClick={handleSend}
            disabled={isSendingMessage || !msg.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Lugares guardados de la familia (solo owner, borrado) ──────────── */}
      {isOwner && onDeletePlace && savedPlaces.length > 0 && (
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Lugares guardados</h2>
          {deletePlaceError && (
            <Alert variant="destructive">
              <AlertDescription>{deletePlaceError}</AlertDescription>
            </Alert>
          )}
          <ul className="space-y-1.5 list-none p-0 m-0">
            {savedPlaces.map((sp) => (
              <li key={sp.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {sp.name}
                  {sp.address ? ` — ${sp.address}` : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-error shrink-0"
                  onClick={() => handleDeletePlace(sp.id)}
                  disabled={isDeletingPlace}
                  aria-label={`Borrar lugar ${sp.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar lugar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Eliminar plan (solo owner, confirmación de dos toques) ─────────── */}
      {isOwner && (
        <div className="space-y-2">
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <Button
            variant={confirm ? 'destructive' : 'outline'}
            className="w-full"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {confirm ? '¿Seguro? Pulsa de nuevo' : 'Eliminar plan'}
          </Button>
        </div>
      )}
    </div>
  );
}
