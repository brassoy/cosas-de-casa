/**
 * ShoppingListDetailView — vista presentacional `base` (estética shadcn) del
 * detalle de una lista de la compra. Es la pantalla MÁS DENSA de la app.
 *
 * Porta el JSX del componente base del kit (Lovable `shopping.tsx` →
 * `ListDetailPage`, `DedupConfirmDialog`, `ItemSheet`) a las primitivas shadcn de
 * `@/shared/ui/*`, y materializa TODOS los sub-flujos como subcomponentes
 * presentacionales props-driven, preservando el 100% de la funcionalidad real:
 *
 *  - AddSection: input + cantidad/unidad opcionales + botón de micro con 3 estados
 *    (🎙 idle / ⏹ listening / ⏳ processing), transcript interim en vivo, chips de
 *    confirmación de los ítems extraídos por IA, y barra de frecuentes ("añadir
 *    rápido").
 *  - DedupConfirmDialog: aparece cuando `dedupPending` no es null (decision
 *    SUGGEST). Confirmar → `onConfirmDedup` (reenvía con forceAdd).
 *  - ItemSheet: detalle (descripción + enlace de compra) + hilo de comentarios +
 *    input para comentar. Abierto cuando `openItem` no es null.
 *  - AddSuccessOverlay: overlay festivo con emoji animado, respeta
 *    `prefers-reduced-motion`; el `key` (successOverlay.key) fuerza remount.
 *  - Toast de AUTO_MERGE (autoMergeMessage), aviso de offline (isOffline).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin Dexie, sin Web Speech. El container computa todo el
 * estado (voiceState, isOffline, dedupPending, successOverlay, openItem…).
 */

import { useEffect, useRef, useState } from 'react';
import { Eye, Loader2, Mic, ShoppingCart, Square, WifiOff, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { ScreenState } from '@/shared/components/ScreenState';
import { cn } from '@/shared/lib/cn';
import { pickRandomPhrase } from '../../config/onadd.config';
import type {
  AddItemPayload,
  DedupPending,
  FrequentItemView,
  OpenItemState,
  ShoppingItemView,
  ShoppingListDetailViewProps,
  SuccessOverlayState,
  VoiceState,
} from '../types';

// ── Vista principal ───────────────────────────────────────────────────────────

export default function ShoppingListDetailView(props: ShoppingListDetailViewProps) {
  const {
    listName,
    items,
    frequentItems,
    isLoading,
    error,
    isOffline,
    voiceSupported = true,
    voiceState = 'idle',
    voiceInterim,
    voiceError,
    voiceCandidates,
    autoMergeMessage,
    dedupPending,
    successOverlay,
    openItem,
    onBack,
    onAddItem,
    onToggle,
    onDelete,
    onQuickAdd,
    onVoice,
    onConfirmVoice,
    onCancelVoice,
    onConfirmDedup,
    onCancelDedup,
    onCloseSuccess,
    onOpenItem,
    onCloseItem,
    onAddComment,
  } = props;

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="relative mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Volver a listas"
        >
          ‹ Listas
        </button>
        {isOffline && (
          <span className="flex items-center gap-1 text-xs text-warning">
            <WifiOff className="h-3 w-3" aria-hidden="true" />
            Sin conexión
          </span>
        )}
      </div>

      <h1 className="truncate text-2xl font-bold">{listName}</h1>

      <AddSection
        frequentItems={frequentItems}
        isOffline={isOffline}
        voiceSupported={voiceSupported}
        voiceState={voiceState}
        voiceInterim={voiceInterim}
        voiceError={voiceError}
        voiceCandidates={voiceCandidates}
        onAddItem={onAddItem}
        onQuickAdd={onQuickAdd}
        onVoice={onVoice}
        onConfirmVoice={onConfirmVoice}
        onCancelVoice={onCancelVoice}
      />

      {autoMergeMessage && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground"
        >
          {autoMergeMessage}
        </p>
      )}

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={items.length === 0}
        emptyIcon={<ShoppingCart className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="La lista está vacía. Añade lo primero."
      >
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Por comprar ({pending.length})
          </h2>
          <ul className="space-y-1.5">
            {pending.map((i) => (
              <ItemRow
                key={i.id}
                item={i}
                onToggle={onToggle}
                onDelete={onDelete}
                onOpen={onOpenItem}
              />
            ))}
            {pending.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">Nada pendiente. 🎉</p>
            )}
          </ul>
        </section>

        {done.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Comprado ({done.length})
            </h2>
            <ul className="space-y-1.5">
              {done.map((i) => (
                <ItemRow
                  key={i.id}
                  item={i}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onOpen={onOpenItem}
                />
              ))}
            </ul>
          </section>
        )}
      </ScreenState>

      {/* ── Sub-flujo: confirmación de dedup (decision SUGGEST) ── */}
      <DedupConfirmDialog
        pending={dedupPending ?? null}
        onConfirm={onConfirmDedup}
        onCancel={onCancelDedup}
      />

      {/* ── Sub-flujo: Sheet de detalle + comentarios ── */}
      <ItemSheet open={openItem ?? null} onClose={onCloseItem} onAddComment={onAddComment} />

      {/* ── Sub-flujo: overlay festivo de éxito ── */}
      <AddSuccessOverlay state={successOverlay} onClose={onCloseSuccess} />
    </div>
  );
}

// ── Fila de ítem ──────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ShoppingItemView;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

function ItemRow({ item, onToggle, onDelete, onOpen }: ItemRowProps) {
  const hasMeta = item.quantity != null || item.unit;
  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-background p-2.5">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(c) => onToggle(item.id, Boolean(c))}
        aria-label={
          item.checked ? `Marcar ${item.name} como pendiente` : `Marcar ${item.name} como comprado`
        }
        className="h-5 w-5"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', item.checked && 'text-muted-foreground line-through')}>
          {item.name}
        </p>
        {hasMeta && (
          <p className="text-xs text-muted-foreground">
            {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={`Ver detalle de ${item.name}`}
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-card"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`Eliminar ${item.name}`}
        className="grid h-9 w-9 place-items-center rounded-md text-destructive hover:bg-card"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

// ── Sección de añadir: texto + cantidad/unidad + voz + frecuentes ──────────────

interface AddSectionProps {
  frequentItems: FrequentItemView[];
  isOffline?: boolean;
  voiceSupported?: boolean;
  voiceState?: VoiceState;
  voiceInterim?: string;
  voiceError?: string | null;
  voiceCandidates?: string[];
  onAddItem: (payload: AddItemPayload) => void;
  onQuickAdd: (name: string) => void;
  onVoice: () => void;
  onConfirmVoice: (names: string[]) => void;
  onCancelVoice: () => void;
}

function AddSection({
  frequentItems,
  isOffline,
  voiceSupported = true,
  voiceState = 'idle',
  voiceInterim,
  voiceError,
  voiceCandidates,
  onAddItem,
  onQuickAdd,
  onVoice,
  onConfirmVoice,
  onCancelVoice,
}: AddSectionProps) {
  const [name, setName] = useState('');
  const [showUnit, setShowUnit] = useState(false);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');

  function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddItem({
      name: trimmed,
      quantity: qty ? Number(qty) : undefined,
      unit: unit.trim() || undefined,
    });
    setName('');
    setQty('');
    setUnit('');
    setShowUnit(false);
  }

  const micDisabled = !voiceSupported || Boolean(isOffline) || voiceState === 'processing';

  return (
    <Card className="space-y-2 p-3">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd();
          }}
          placeholder="¿Qué añades?"
          aria-label="Nombre del artículo"
          maxLength={200}
        />
        <Button onClick={submitAdd} disabled={!name.trim()}>
          Añadir
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={onVoice}
          disabled={micDisabled}
          aria-label={voiceState === 'listening' ? 'Detener reconocimiento de voz' : 'Añadir por voz'}
          title={
            isOffline
              ? 'Sin conexión. La voz requiere internet.'
              : !voiceSupported
                ? 'Tu navegador no soporta la entrada por voz'
                : voiceState === 'listening'
                  ? 'Escuchando… Pulsa para detener'
                  : 'Añadir artículos por voz'
          }
        >
          {voiceState === 'listening' ? (
            <Square className="h-4 w-4 text-destructive" aria-hidden="true" />
          ) : voiceState === 'processing' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {!voiceSupported && (
        <p role="status" className="text-xs text-muted-foreground">
          Tu navegador no es compatible con el reconocimiento de voz. Añade los artículos
          escribiéndolos.
        </p>
      )}

      {voiceInterim && (
        <p role="status" aria-live="polite" className="pl-1 text-sm italic text-muted-foreground">
          &quot;{voiceInterim}…&quot;
        </p>
      )}

      {voiceError && (
        <p role="alert" className="pl-1 text-sm text-destructive">
          {voiceError}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUnit((v) => !v)}
        className="text-xs text-primary hover:underline"
      >
        {showUnit ? 'Ocultar' : 'Unidad (opcional)'}
      </button>

      {showUnit && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Cantidad"
            aria-label="Cantidad"
          />
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidad (kg, L, ud.)"
            aria-label="Unidad"
            maxLength={50}
          />
        </div>
      )}

      {/* Chips de confirmación de los ítems extraídos por voz */}
      {voiceCandidates && voiceCandidates.length > 0 && (
        <VoiceCandidates
          candidates={voiceCandidates}
          onConfirm={onConfirmVoice}
          onCancel={onCancelVoice}
        />
      )}

      {/* Barra de frecuentes ("añadir rápido") */}
      {frequentItems.length > 0 && (
        <div className="-mx-1 overflow-x-auto" role="region" aria-label="Artículos frecuentes">
          <div className="flex gap-2 px-1 pt-1">
            {frequentItems.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => onQuickAdd(f.name)}
                aria-label={`Añadir ${f.name} rápidamente`}
                className="min-h-[36px] shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                + {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Chips de confirmación de voz ──────────────────────────────────────────────

interface VoiceCandidatesProps {
  candidates: string[];
  onConfirm: (names: string[]) => void;
  onCancel: () => void;
}

function VoiceCandidates({ candidates, onConfirm, onCancel }: VoiceCandidatesProps) {
  // Estado de selección LOCAL (UI pura). Arranca con todos seleccionados; el
  // remount lo controla el container vaciando `voiceCandidates` tras confirmar.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(candidates));

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const toAdd = candidates.filter((n) => selected.has(n));

  return (
    <div
      role="region"
      aria-label="Artículos detectados por voz"
      className="space-y-3 rounded-md border border-primary bg-card p-4"
    >
      <p className="m-0 text-sm text-muted-foreground">
        Artículos detectados — quita los que no quieras:
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((n) => {
          const isSel = selected.has(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              aria-pressed={isSel}
              aria-label={`${isSel ? 'Deseleccionar' : 'Seleccionar'} ${n}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-2 text-sm transition-colors',
                isSel
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              {isSel && <span aria-hidden="true">✓</span>}
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={toAdd.length === 0} onClick={() => onConfirm(toAdd)}>
          {toAdd.length === candidates.length ? 'Añadir todos' : `Añadir ${toAdd.length}`}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Sub-flujo: confirmación de dedup ──────────────────────────────────────────

interface DedupConfirmDialogProps {
  pending: DedupPending | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function DedupConfirmDialog({ pending, onConfirm, onCancel }: DedupConfirmDialogProps) {
  const open = pending != null;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent aria-label="Artículo similar">
        <DialogHeader>
          <DialogTitle>¿Ya lo tienes?</DialogTitle>
          <DialogDescription>
            Ya tienes algo parecido a «{pending?.pendingName ?? ''}». ¿Lo añades igualmente?
          </DialogDescription>
        </DialogHeader>
        {pending && pending.candidates.length > 0 && (
          <ul className="space-y-1">
            {pending.candidates.map((c) => (
              <li
                key={c.displayName}
                className="flex justify-between rounded bg-card px-2 py-1.5 text-sm"
              >
                <span>{c.displayName}</span>
                {c.similarity != null && (
                  <span className="text-muted-foreground">{Math.round(c.similarity * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Añadir igualmente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-flujo: Sheet de detalle + comentarios ─────────────────────────────────

interface ItemSheetProps {
  open: OpenItemState | null;
  onClose: () => void;
  onAddComment: (body: string) => void;
}

function ItemSheet({ open, onClose, onAddComment }: ItemSheetProps) {
  const item = open?.item ?? null;
  const comments = open?.comments ?? [];
  const isSending = open?.isSendingComment ?? false;
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del hilo cuando se abre o llega un comentario nuevo.
  useEffect(() => {
    if (item) scrollRef.current?.scrollTo({ top: 99999 });
  }, [item, comments.length]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setBody('');
  }

  return (
    <Sheet
      open={item != null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="bottom" className="flex h-[80vh] flex-col" aria-label={item?.name}>
        <SheetHeader>
          <SheetTitle>{item?.name}</SheetTitle>
        </SheetHeader>
        {item && (
          <div ref={scrollRef} className="mt-3 flex-1 space-y-4 overflow-y-auto">
            {item.description && <p className="text-sm">{item.description}</p>}
            {item.purchaseLink && (
              <a
                href={item.purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-primary hover:underline"
              >
                {item.purchaseLink}
              </a>
            )}
            {(item.quantity != null || item.unit) && (
              <p className="text-sm text-muted-foreground">
                {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
              </p>
            )}
            <div>
              <h3 className="mb-2 text-sm font-semibold">Comentarios ({comments.length})</h3>
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-md bg-card p-2.5">
                    <p className="text-xs text-muted-foreground">
                      {c.authorName} ·{' '}
                      {new Date(c.createdAt).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="text-sm">{c.body}</p>
                  </li>
                ))}
                {comments.length === 0 && (
                  <li className="text-sm text-muted-foreground">Aún no hay comentarios.</li>
                )}
              </ul>
            </div>
          </div>
        )}
        <div className="flex gap-2 border-t border-border pt-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Escribe un comentario"
            aria-label="Nuevo comentario"
          />
          <Button disabled={!body.trim() || isSending} onClick={submit}>
            {isSending ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-flujo: overlay festivo de éxito ───────────────────────────────────────

interface AddSuccessOverlayProps {
  state?: SuccessOverlayState;
  onClose: () => void;
}

/**
 * Wrapper que fuerza el remount con `key` (state.key) para obtener una frase
 * nueva en cada éxito, igual que el `AddSuccessOverlay` original. La frase se fija
 * en el lazy initializer del componente interno (solo corre al montar).
 */
function AddSuccessOverlay({ state, onClose }: AddSuccessOverlayProps) {
  if (!state?.visible) return null;
  return <SuccessOverlayInner key={state.key} onClose={onClose} />;
}

const AUTO_CLOSE_MS = 2000;

function SuccessOverlayInner({ onClose }: { onClose: () => void }) {
  // Lazy initializer: la frase se elige una vez al montar (el `key` del padre
  // garantiza una frase nueva por éxito).
  const [phrase] = useState<string>(() => pickRandomPhrase());

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Artículo añadido"
      onClick={onClose}
      className="pointer-events-auto fixed inset-x-0 bottom-24 z-40 grid cursor-pointer place-items-center"
    >
      <div className="flex items-center gap-2 rounded-full bg-success px-5 py-3 text-success-foreground shadow-lg animate-in fade-in zoom-in">
        <span className={cn('text-2xl', !reducedMotion && 'motion-safe:animate-bounce')} aria-hidden="true">
          🛒
        </span>
        <span className="font-medium">{phrase}</span>
      </div>
    </div>
  );
}
