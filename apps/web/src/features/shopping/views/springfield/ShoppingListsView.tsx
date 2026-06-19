/* ─── Vista presentacional springfield — listado de listas de la compra ──────
 *
 * Theme `springfield` (estética cómic pop: bordes gruesos de tinta, hard
 * shadows con offset, colores planos saturados, tipografía Bangers/Fredoka).
 * MISMA funcionalidad que la vista base: listar, abrir detalle y crear lista
 * mediante diálogo controlado por el container.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. El estado offline-first (Dexie + outbox) vive en el
 * container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { ShoppingListsViewProps } from '../types';

// Acentos decorativos rotativos para los iconos de lista (paleta cruda del kit:
// amarillo, celeste, rosa, verde, rojo). Son matices decorativos sin var
// semántica, igual que el kit estático (AVATAR_COLORS).
const ACCENTS = ['#FFD90F', '#70C5FF', '#F48FB1', '#7CB342', '#E53935'];

export default function ShoppingListsView(props: ShoppingListsViewProps) {
  const {
    lists,
    isLoading,
    error,
    isCreateOpen,
    isCreating,
    onOpenCreate,
    onCloseCreate,
    onOpenList,
    onCreateList,
    onDeleteList,
  } = props;

  return (
    <div className="sf min-h-[80dvh]" style={{ background: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-[520px] px-5 pb-24 pt-6">
        <header className="sf-card-y sf-pop relative mb-5 p-4">
          <span className="sf-sticker">La compra</span>
          <h1 className="sf-bangers mt-2 text-4xl leading-none">Listas</h1>
          <p className="sf-fredoka mt-1 text-sm">
            {lists.length} {lists.length === 1 ? 'lista' : 'listas'}
          </p>
        </header>

        <ScreenState
          isLoading={isLoading}
          error={error}
          isEmpty={lists.length === 0}
          emptyIcon={<span className="text-4xl">🛒</span>}
          emptyTitle="Aún no tienes listas."
          emptyCta={{ label: 'Crear tu primera lista', onClick: onOpenCreate }}
        >
          <div className="space-y-3">
            {lists.map((l, i) => (
              <div
                key={l.id}
                className="sf-card sf-wob flex items-center gap-3 p-4"
              >
                <button
                  type="button"
                  onClick={() => onOpenList(l.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] text-2xl"
                    style={{
                      background: ACCENTS[i % ACCENTS.length]!,
                      borderColor: 'var(--color-border)',
                      boxShadow: '3px 3px 0 var(--color-border)',
                    }}
                    aria-hidden="true"
                  >
                    🛒
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="sf-fredoka truncate text-lg">{l.name}</p>
                    <p className="text-xs opacity-60">
                      Actualizada {new Date(l.updatedAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  {l.type === 'MAIN' && (
                    <span className="sf-tag" style={{ background: 'var(--color-accent)' }}>
                      Principal
                    </span>
                  )}
                  <span aria-hidden="true" className="text-lg opacity-50">
                    ›
                  </span>
                </button>
                {l.type !== 'MAIN' && onDeleteList && (
                  <button
                    type="button"
                    onClick={() => onDeleteList(l.id)}
                    aria-label={`Borrar lista ${l.name}`}
                    className="shrink-0 rounded-xl px-2 py-1 text-xl opacity-70 transition hover:opacity-100"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScreenState>

        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Crear lista"
          className="sf-btn sf-btn-r mt-5 w-full text-lg"
        >
          + Nueva lista
        </button>
      </div>

      {/* `key` fuerza el remontado al abrir → el formulario arranca limpio. */}
      <CreateListDialog
        key={isCreateOpen ? 'create-open' : 'create-closed'}
        open={Boolean(isCreateOpen)}
        isCreating={isCreating}
        onClose={onCloseCreate}
        onCreate={onCreateList}
      />
    </div>
  );
}

// ── Diálogo de crear lista (presentacional, controlado por el container) ───────

interface CreateListDialogProps {
  open: boolean;
  isCreating?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

function CreateListDialog({ open, isCreating, onClose, onCreate }: CreateListDialogProps) {
  const [name, setName] = useState('');
  const canSubmit = name.trim().length > 0 && !isCreating;

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-5"
      style={{ background: 'rgba(26, 26, 26, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear lista"
        onClick={(e) => e.stopPropagation()}
        className="sf sf-card sf-pop w-full max-w-[420px] p-5"
      >
        <h2 className="sf-bangers text-3xl leading-none">Nueva lista</h2>
        <p className="sf-fredoka mb-3 mt-1 text-sm opacity-70">
          Pon un nombre que reconozcas fácil.
        </p>
        <label htmlFor="list-name" className="sf-fredoka mb-1.5 block text-xs uppercase">
          Nombre de la lista
        </label>
        <input
          id="list-name"
          className="sf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) handleSubmit();
          }}
          placeholder="p. ej. Vacaciones, Mercado semanal…"
          maxLength={100}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="sf-btn sf-btn-w" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="sf-btn sf-btn-r disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isCreating ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
