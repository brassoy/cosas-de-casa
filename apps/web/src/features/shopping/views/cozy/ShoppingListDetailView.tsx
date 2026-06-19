/* ─── Vista presentacional cozy — detalle de lista de la compra ──────────────
 *
 * Theme `cozy` (estética cuaderno de papel manuscrito): papel crema pautado,
 * tinta marrón, cinta/chinchetas, casillas a mano, sellos inclinados y
 * tipografía Caveat/Patrick Hand (clases .ck-* de shared/theme/themes/cozy.css).
 * Es la pantalla MÁS DENSA de la app. Reescribe el JSX de la vista base con la
 * estética del theme preservando el 100% de la funcionalidad real y TODOS los
 * sub-flujos props-driven:
 *
 *  - AddSection: input + cantidad/unidad opcionales + botón de micro con 3
 *    estados (idle / listening / processing), transcript interim en vivo, chips
 *    de confirmación de los ítems extraídos por IA, y barra de frecuentes.
 *  - DedupConfirmDialog: aparece cuando `dedupPending` no es null (SUGGEST).
 *    Reutiliza el shell shadcn `Dialog` (focus-trap/escape/portal), reestilizado.
 *  - ItemSheet: detalle (descripción + enlace) + hilo de comentarios + input.
 *    Reutiliza el shell shadcn `Sheet` (side bottom), reestilizado con .ck-*.
 *  - AddSuccessOverlay: overlay festivo; respeta `prefers-reduced-motion`; el
 *    `key` (successOverlay.key) fuerza remount → frase nueva por éxito.
 *  - Toast de AUTO_MERGE (autoMergeMessage), aviso de offline (isOffline).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin Dexie, sin Web Speech. El container computa todo el
 * estado (voiceState, isOffline, dedupPending, successOverlay, openItem…).
 * ─────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  EditItemPayload,
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
    onEditItem,
  } = props;

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="ck ck-page relative min-h-[80dvh]">
      <div className="mx-auto max-w-[520px] px-5 pb-24 pt-8">
        <header className="relative mb-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="ck-marker absolute left-0 top-0 text-xl text-accent"
            aria-label="Volver a listas"
          >
            ← volver
          </button>
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker mt-1 truncate text-5xl leading-none text-accent">{listName}</h1>
          <p className="mt-2 text-base opacity-80">
            {pending.length} pendientes · {done.length} hechas
          </p>
          {isOffline && (
            <span className="ck-stamp mt-2 inline-block" aria-live="polite">
              sin conexión
            </span>
          )}
        </header>

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
          <p role="status" aria-live="polite" className="ck-card mt-3 p-3 text-sm">
            {autoMergeMessage}
          </p>
        )}

        <div className="mt-4">
          <ScreenState
            isLoading={isLoading}
            error={error}
            isEmpty={items.length === 0}
            emptyIcon={<span className="text-4xl">🛒</span>}
            emptyTitle="La lista está vacía. Añade lo primero."
          >
            <section className="space-y-2">
              <h2 className="ck-marker text-2xl text-accent">Por comprar ({pending.length})</h2>
              <div className="ck-card space-y-1 p-4">
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
                  <p className="py-2 text-sm opacity-70">Nada pendiente. 🎉</p>
                )}
              </div>
            </section>

            {done.length > 0 && (
              <section className="mt-4 space-y-2">
                <h2 className="ck-marker text-2xl text-accent">Comprado ({done.length})</h2>
                <div className="ck-card space-y-1 p-4">
                  {done.map((i) => (
                    <ItemRow
                      key={i.id}
                      item={i}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onOpen={onOpenItem}
                    />
                  ))}
                </div>
              </section>
            )}
          </ScreenState>
        </div>
      </div>

      {/* ── Sub-flujo: confirmación de dedup (decision SUGGEST) ── */}
      <DedupConfirmDialog
        pending={dedupPending ?? null}
        onConfirm={onConfirmDedup}
        onCancel={onCancelDedup}
      />

      {/* ── Sub-flujo: Sheet de detalle + comentarios ── */}
      <ItemSheet
        open={openItem ?? null}
        onClose={onCloseItem}
        onAddComment={onAddComment}
        onEditItem={onEditItem}
      />

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
    <div className="flex items-center gap-3 border-b border-dashed border-[#d9c79a]/60 py-2 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(item.id, !item.checked)}
        className={cn('ck-check grid shrink-0 place-items-center', item.checked && 'on')}
        role="checkbox"
        aria-checked={item.checked}
        aria-label={
          item.checked
            ? `Marcar ${item.name} como pendiente`
            : `Marcar ${item.name} como comprado`
        }
      >
        {item.checked && (
          <svg viewBox="0 0 18 18" className="h-full w-full" aria-hidden="true">
            <path
              d="M4 9 L8 13 L14 5"
              stroke="#fff"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-lg', item.checked && 'line-through opacity-50')}>
          {item.name}
        </p>
        {hasMeta && (
          <p className="text-sm opacity-60">
            {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={`Ver detalle de ${item.name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg opacity-60 transition hover:opacity-100"
      >
        👁
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`Eliminar ${item.name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg font-bold transition hover:opacity-100"
        style={{ color: 'var(--color-error)' }}
      >
        ✕
      </button>
    </div>
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
    <div className="ck-card space-y-3 p-4">
      <span className="ck-tape" aria-hidden="true" />
      <div className="flex items-end gap-2">
        <input
          className="ck-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd();
          }}
          placeholder="añadir…"
          aria-label="Nombre del artículo"
          maxLength={200}
        />
        <button
          type="button"
          className="ck-btn ck-btn-blue whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          onClick={submitAdd}
          disabled={!name.trim()}
        >
          +
        </button>
        <button
          type="button"
          className="ck-btn grid h-[46px] w-[46px] shrink-0 place-items-center !px-0 !py-0 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onVoice}
          disabled={micDisabled}
          aria-label={
            voiceState === 'listening' ? 'Detener reconocimiento de voz' : 'Añadir por voz'
          }
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
            <span style={{ color: 'var(--color-error)' }} aria-hidden="true">
              ⏹
            </span>
          ) : voiceState === 'processing' ? (
            <span className="motion-safe:animate-spin" aria-hidden="true">
              ⏳
            </span>
          ) : (
            <span aria-hidden="true">🎙</span>
          )}
        </button>
      </div>

      {!voiceSupported && (
        <p role="status" className="text-sm opacity-70">
          Tu navegador no es compatible con el reconocimiento de voz. Añade los artículos
          escribiéndolos.
        </p>
      )}

      {voiceInterim && (
        <p role="status" aria-live="polite" className="pl-1 text-base italic opacity-70">
          &quot;{voiceInterim}…&quot;
        </p>
      )}

      {voiceError && (
        <p role="alert" className="pl-1 text-base font-bold" style={{ color: 'var(--color-error)' }}>
          {voiceError}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUnit((v) => !v)}
        className="ck-marker text-lg text-accent hover:underline"
      >
        {showUnit ? 'ocultar' : 'unidad (opcional)'}
      </button>

      {showUnit && (
        <div className="grid grid-cols-2 gap-2">
          <input
            className="ck-input"
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="cantidad"
            aria-label="Cantidad"
          />
          <input
            className="ck-input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="unidad (kg, L, ud.)"
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
                className="ck-tag shrink-0 cursor-pointer whitespace-nowrap transition hover:-translate-y-0.5"
              >
                + {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
      className="ck-card space-y-3 p-4"
      style={{ background: '#fff9d6' }}
    >
      <p className="ck-marker m-0 text-lg text-accent">
        artículos detectados — quita los que no quieras:
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
              className="ck-tag inline-flex cursor-pointer items-center gap-1 transition"
              style={
                isSel
                  ? { background: 'var(--color-success)', color: 'var(--color-text-inverse)' }
                  : undefined
              }
            >
              {isSel && <span aria-hidden="true">✓</span>}
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ck-btn ck-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
          disabled={toAdd.length === 0}
          onClick={() => onConfirm(toAdd)}
        >
          {toAdd.length === candidates.length ? 'añadir todos' : `añadir ${toAdd.length}`}
        </button>
        <button type="button" className="ck-btn" onClick={onCancel}>
          cancelar
        </button>
      </div>
    </div>
  );
}

// ── Sub-flujo: confirmación de dedup (shell shadcn Dialog reestilizado) ────────

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
      <DialogContent aria-label="Artículo similar" className="ck ck-card">
        <span className="ck-tape" aria-hidden="true" />
        <DialogHeader>
          <DialogTitle className="ck-marker text-3xl leading-none text-accent">
            ¿Ya lo tienes?
          </DialogTitle>
          <DialogDescription className="text-sm opacity-70">
            Ya tienes algo parecido a «{pending?.pendingName ?? ''}». ¿Lo añades igualmente?
          </DialogDescription>
        </DialogHeader>
        {pending && pending.candidates.length > 0 && (
          <ul className="space-y-1">
            {pending.candidates.map((c) => (
              <li
                key={c.displayName}
                className="flex justify-between border-b border-dashed border-[#d9c79a]/60 px-2 py-1.5 text-base last:border-0"
              >
                <span>{c.displayName}</span>
                {c.similarity != null && (
                  <span className="opacity-60">{Math.round(c.similarity * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="ck-btn" onClick={onCancel}>
            cancelar
          </button>
          <button type="button" className="ck-btn ck-btn-red" onClick={onConfirm}>
            añadir igualmente
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-flujo: Sheet de detalle + comentarios (shell shadcn Sheet) ────────────

interface ItemSheetProps {
  open: OpenItemState | null;
  onClose: () => void;
  onAddComment: (body: string) => void;
  onEditItem?: (id: string, changes: EditItemPayload) => void;
}

function ItemSheet({ open, onClose, onAddComment, onEditItem }: ItemSheetProps) {
  const item = open?.item ?? null;
  const comments = open?.comments ?? [];
  const isSending = open?.isSendingComment ?? false;
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del hilo cuando se abre o llega un comentario nuevo.
  useEffect(() => {
    if (item) scrollRef.current?.scrollTo({ top: 99999 });
  }, [item, comments.length]);

  useEffect(() => {
    setEditing(false);
  }, [item?.id]);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setBody('');
  }

  const canEdit = onEditItem != null;

  return (
    <Sheet
      open={item != null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="ck ck-page flex h-[80vh] flex-col"
        aria-label={item?.name}
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="ck-marker truncate text-3xl leading-none text-accent">
              {item?.name}
            </SheetTitle>
            {item && canEdit && !editing && (
              <button
                type="button"
                className="ck-btn ck-btn-blue shrink-0 whitespace-nowrap"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${item.name}`}
              >
                Editar
              </button>
            )}
          </div>
        </SheetHeader>
        {item && editing && onEditItem ? (
          <ItemEditForm
            item={item}
            onCancel={() => setEditing(false)}
            onSave={(changes) => {
              onEditItem(item.id, changes);
              setEditing(false);
            }}
          />
        ) : null}
        {item && !editing && (
          <div ref={scrollRef} className="mt-3 flex-1 space-y-4 overflow-y-auto">
            {item.description && <p className="text-base">{item.description}</p>}
            {item.purchaseLink && (
              <a
                href={item.purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-base font-bold hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                {item.purchaseLink}
              </a>
            )}
            {(item.quantity != null || item.unit) && (
              <p className="text-base opacity-70">
                {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
              </p>
            )}
            <div>
              <h3 className="ck-marker mb-2 text-2xl text-accent">
                Comentarios ({comments.length})
              </h3>
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="ck-card p-3">
                    <p className="text-sm opacity-60">
                      {c.authorName} ·{' '}
                      {new Date(c.createdAt).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="text-base">{c.body}</p>
                  </li>
                ))}
                {comments.length === 0 && (
                  <li className="text-base opacity-70">Aún no hay comentarios.</li>
                )}
              </ul>
            </div>
          </div>
        )}
        {!editing && (
          <div className="mt-3 flex items-end gap-2 border-t border-dashed border-[#d9c79a] pt-3">
            <input
              className="ck-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="escribe un comentario"
              aria-label="Nuevo comentario"
            />
            <button
              type="button"
              className="ck-btn ck-btn-blue whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!body.trim() || isSending}
              onClick={submit}
            >
              {isSending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Formulario de edición de ítem (cozy) ──────────────────────────────────────

interface ItemEditFormProps {
  item: ShoppingItemView;
  onSave: (changes: EditItemPayload) => void;
  onCancel: () => void;
}

function ItemEditForm({ item, onSave, onCancel }: ItemEditFormProps) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? '');
  const [purchaseLink, setPurchaseLink] = useState(item.purchaseLink ?? '');

  const trimmedName = name.trim();

  function save() {
    if (!trimmedName) return;
    onSave({
      name: trimmedName,
      description: description.trim(),
      purchaseLink: purchaseLink.trim(),
    });
  }

  return (
    <form
      className="mt-3 flex-1 space-y-3 overflow-y-auto"
      aria-label={`Editar ${item.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="block space-y-1">
        <span className="ck-marker text-lg text-accent">Nombre</span>
        <input
          className="ck-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del artículo a editar"
          maxLength={200}
        />
      </label>
      <label className="block space-y-1">
        <span className="ck-marker text-lg text-accent">Descripción</span>
        <input
          className="ck-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="notas, marca, detalle…"
          aria-label="Descripción del artículo"
          maxLength={500}
        />
      </label>
      <label className="block space-y-1">
        <span className="ck-marker text-lg text-accent">Enlace de compra</span>
        <input
          className="ck-input"
          type="url"
          value={purchaseLink}
          onChange={(e) => setPurchaseLink(e.target.value)}
          placeholder="https://…"
          aria-label="Enlace de compra del artículo"
        />
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="ck-btn ck-btn-blue whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!trimmedName}
        >
          Guardar
        </button>
        <button type="button" className="ck-btn whitespace-nowrap" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Sub-flujo: overlay festivo de éxito ───────────────────────────────────────

interface AddSuccessOverlayProps {
  state?: SuccessOverlayState;
  onClose: () => void;
}

/**
 * Wrapper que fuerza el remount con `key` (state.key) para obtener una frase
 * nueva en cada éxito, igual que el `AddSuccessOverlay` original. La frase se
 * fija en el lazy initializer del componente interno (solo corre al montar).
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
      <div
        className="ck-card flex items-center gap-2 px-5 py-3"
        style={{ background: 'var(--color-success)', color: 'var(--color-text-inverse)' }}
      >
        <span
          className={cn('text-2xl', !reducedMotion && 'motion-safe:animate-bounce')}
          aria-hidden="true"
        >
          🛒
        </span>
        <span className="ck-marker text-xl">{phrase}</span>
      </div>
    </div>
  );
}
