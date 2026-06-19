/* ─── Vista presentacional springfield — detalle de lista de la compra ───────
 *
 * Theme `springfield` (estética cómic pop: bordes gruesos de tinta, hard
 * shadows con offset, colores planos saturados, tipografía Bangers/Fredoka).
 * Es la pantalla MÁS DENSA de la app. Reescribe el JSX de la vista base con la
 * estética del theme (clases .sf-*) preservando el 100% de la funcionalidad
 * real y TODOS los sub-flujos props-driven:
 *
 *  - AddSection: input + cantidad/unidad opcionales + botón de micro con 3
 *    estados (idle / listening / processing), transcript interim en vivo, chips
 *    de confirmación de los ítems extraídos por IA, y barra de frecuentes.
 *  - DedupConfirmDialog: aparece cuando `dedupPending` no es null (SUGGEST).
 *  - ItemSheet: detalle (descripción + enlace) + hilo de comentarios + input.
 *  - AddSuccessOverlay: overlay festivo; respeta `prefers-reduced-motion`; el
 *    `key` (successOverlay.key) fuerza remount → frase nueva por éxito.
 *  - Toast de AUTO_MERGE (autoMergeMessage), aviso de offline (isOffline).
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin Dexie, sin Web Speech. El container computa todo el
 * estado (voiceState, isOffline, dedupPending, successOverlay, openItem…).
 * ─────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
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
    <div className="sf relative min-h-[80dvh]" style={{ background: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-[520px] px-5 pb-24 pt-6">
        <header className="sf-card-y sf-pop relative mb-5 p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="sf-sticker"
              aria-label="Volver a listas"
            >
              ← Atrás
            </button>
            {isOffline && (
              <span className="sf-tag" style={{ background: 'var(--color-warning)' }}>
                Sin conexión
              </span>
            )}
          </div>
          <h1 className="sf-bangers mt-2 truncate text-4xl leading-none">{listName}</h1>
          <p className="sf-fredoka mt-1 text-sm">
            {pending.length} pendientes · {done.length} hechas
          </p>
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
          <p role="status" aria-live="polite" className="sf-card-s sf-pop mt-3 p-3 text-sm">
            {autoMergeMessage}
          </p>
        )}

        <div className="mt-3">
          <ScreenState
            isLoading={isLoading}
            error={error}
            isEmpty={items.length === 0}
            emptyIcon={<span className="text-4xl">🛒</span>}
            emptyTitle="La lista está vacía. Añade lo primero."
          >
            <section className="space-y-2">
              <h2 className="sf-bangers text-2xl">Por comprar ({pending.length})</h2>
              <div className="sf-card space-y-1 p-3">
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
                  <p className="sf-fredoka py-2 text-sm opacity-70">Nada pendiente. 🎉</p>
                )}
              </div>
            </section>

            {done.length > 0 && (
              <section className="mt-4 space-y-2">
                <h2 className="sf-bangers text-2xl">Comprado ({done.length})</h2>
                <div className="sf-card space-y-1 p-3">
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
    <div className="flex items-center gap-3 rounded-xl p-2">
      <button
        type="button"
        onClick={() => onToggle(item.id, !item.checked)}
        className={cn('sf-check shrink-0 grid place-items-center', item.checked && 'on')}
        role="checkbox"
        aria-checked={item.checked}
        aria-label={
          item.checked
            ? `Marcar ${item.name} como pendiente`
            : `Marcar ${item.name} como comprado`
        }
      >
        {item.checked && (
          <svg viewBox="0 0 22 22" className="h-full w-full" aria-hidden="true">
            <path
              d="M5 12 L9 16 L17 7"
              stroke="#fff"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('sf-fredoka truncate', item.checked && 'opacity-50 line-through')}>
          {item.name}
        </p>
        {hasMeta && (
          <p className="text-xs opacity-60">
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
    <div className="sf-card sf-pop space-y-3 p-3">
      <div className="flex gap-2">
        <input
          className="sf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd();
          }}
          placeholder="Añadir producto…"
          aria-label="Nombre del artículo"
          maxLength={200}
        />
        <button
          type="button"
          className="sf-btn whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          onClick={submitAdd}
          disabled={!name.trim()}
        >
          + Va
        </button>
        <button
          type="button"
          className="sf-btn sf-btn-w grid h-[46px] w-[46px] shrink-0 place-items-center !px-0 !py-0 text-lg disabled:cursor-not-allowed disabled:opacity-50"
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
        <p role="status" className="text-xs opacity-70">
          Tu navegador no es compatible con el reconocimiento de voz. Añade los artículos
          escribiéndolos.
        </p>
      )}

      {voiceInterim && (
        <p role="status" aria-live="polite" className="pl-1 text-sm italic opacity-70">
          &quot;{voiceInterim}…&quot;
        </p>
      )}

      {voiceError && (
        <p role="alert" className="pl-1 text-sm font-bold" style={{ color: 'var(--color-error)' }}>
          {voiceError}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowUnit((v) => !v)}
        className="sf-fredoka text-xs uppercase hover:underline"
      >
        {showUnit ? 'Ocultar' : 'Unidad (opcional)'}
      </button>

      {showUnit && (
        <div className="grid grid-cols-2 gap-2">
          <input
            className="sf-input"
            type="number"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Cantidad"
            aria-label="Cantidad"
          />
          <input
            className="sf-input"
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
                className="sf-tag shrink-0 cursor-pointer whitespace-nowrap transition hover:-translate-y-0.5"
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
      className="sf-card-s space-y-3 p-4"
    >
      <p className="sf-fredoka m-0 text-sm">Artículos detectados — quita los que no quieras:</p>
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
              className="sf-tag inline-flex cursor-pointer items-center gap-1 transition"
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
          className="sf-btn sf-btn-g disabled:cursor-not-allowed disabled:opacity-50"
          disabled={toAdd.length === 0}
          onClick={() => onConfirm(toAdd)}
        >
          {toAdd.length === candidates.length ? 'Añadir todos' : `Añadir ${toAdd.length}`}
        </button>
        <button type="button" className="sf-btn sf-btn-w" onClick={onCancel}>
          Cancelar
        </button>
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
  if (pending == null) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-5"
      style={{ background: 'rgba(26, 26, 26, 0.45)' }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Artículo similar"
        onClick={(e) => e.stopPropagation()}
        className="sf sf-card sf-pop w-full max-w-[420px] p-5"
      >
        <h2 className="sf-bangers text-3xl leading-none">¿Ya lo tienes?</h2>
        <p className="sf-fredoka mb-3 mt-1 text-sm opacity-70">
          Ya tienes algo parecido a «{pending.pendingName}». ¿Lo añades igualmente?
        </p>
        {pending.candidates.length > 0 && (
          <ul className="space-y-1">
            {pending.candidates.map((c) => (
              <li
                key={c.displayName}
                className="flex justify-between rounded-xl px-2 py-1.5 text-sm"
                style={{ background: 'var(--color-surface)' }}
              >
                <span className="sf-fredoka">{c.displayName}</span>
                {c.similarity != null && (
                  <span className="opacity-60">{Math.round(c.similarity * 100)}%</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="sf-btn sf-btn-w" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="sf-btn sf-btn-r" onClick={onConfirm}>
            Añadir igualmente
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-flujo: Sheet de detalle + comentarios ─────────────────────────────────

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

  if (item == null) return null;

  const canEdit = onEditItem != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(26, 26, 26, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="sf sf-pop flex h-[80vh] w-full flex-col px-5 pb-5 pt-4"
        style={{
          background: 'var(--color-surface)',
          borderTop: '3px solid var(--color-border)',
          borderTopLeftRadius: 'var(--radius-card)',
          borderTopRightRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="sf-bangers truncate text-3xl leading-none">{item.name}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                className="sf-btn whitespace-nowrap"
                onClick={() => setEditing(true)}
                aria-label={`Editar ${item.name}`}
              >
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg font-bold opacity-60 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>

        {editing && onEditItem ? (
          <ItemEditForm
            item={item}
            onCancel={() => setEditing(false)}
            onSave={(changes) => {
              onEditItem(item.id, changes);
              setEditing(false);
            }}
          />
        ) : (
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto">
          {item.description && <p className="text-sm">{item.description}</p>}
          {item.purchaseLink && (
            <a
              href={item.purchaseLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm font-bold hover:underline"
              style={{ color: 'var(--color-error)' }}
            >
              {item.purchaseLink}
            </a>
          )}
          {(item.quantity != null || item.unit) && (
            <p className="text-sm opacity-70">
              {item.quantity != null ? item.quantity : ''} {item.unit ?? ''}
            </p>
          )}
          <div>
            <h3 className="sf-bangers mb-2 text-xl">Comentarios ({comments.length})</h3>
            <ul className="space-y-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl p-2.5"
                  style={{ background: 'var(--color-surface-raised)' }}
                >
                  <p className="text-xs opacity-60">
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
                <li className="text-sm opacity-70">Aún no hay comentarios.</li>
              )}
            </ul>
          </div>
        </div>
        )}

        {!editing && (
        <div
          className="mt-3 flex gap-2 pt-3"
          style={{ borderTop: '3px solid var(--color-border)' }}
        >
          <input
            className="sf-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Escribe un comentario"
            aria-label="Nuevo comentario"
          />
          <button
            type="button"
            className="sf-btn whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!body.trim() || isSending}
            onClick={submit}
          >
            {isSending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario de edición de ítem (springfield) ───────────────────────────────

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
      className="flex-1 space-y-3 overflow-y-auto"
      aria-label={`Editar ${item.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="block space-y-1">
        <span className="sf-bangers text-lg">Nombre</span>
        <input
          className="sf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del artículo a editar"
          maxLength={200}
        />
      </label>
      <label className="block space-y-1">
        <span className="sf-bangers text-lg">Descripción</span>
        <input
          className="sf-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notas, marca, detalle…"
          aria-label="Descripción del artículo"
          maxLength={500}
        />
      </label>
      <label className="block space-y-1">
        <span className="sf-bangers text-lg">Enlace de compra</span>
        <input
          className="sf-input"
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
          className="sf-btn sf-btn-g whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!trimmedName}
        >
          Guardar
        </button>
        <button
          type="button"
          className="sf-btn sf-btn-w whitespace-nowrap"
          onClick={onCancel}
        >
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
      <div className="sf-card-g sf-pop flex items-center gap-2 px-5 py-3 font-bold">
        <span
          className={cn('text-2xl', !reducedMotion && 'motion-safe:animate-bounce')}
          aria-hidden="true"
        >
          🛒
        </span>
        <span>{phrase}</span>
      </div>
    </div>
  );
}
