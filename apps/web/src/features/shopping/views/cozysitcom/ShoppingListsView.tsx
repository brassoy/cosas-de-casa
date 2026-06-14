/* ─── Vista presentacional cozysitcom — listado de listas de la compra ───────
 *
 * Theme `cozysitcom` (estética retro de comedia familiar 70s: madera, mostaza
 * y papel crema). MISMA funcionalidad que la vista base: listar, abrir detalle
 * y crear lista mediante diálogo controlado por el container.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. El estado offline-first (Dexie + outbox) vive en el
 * container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { ScreenState } from '@/shared/components/ScreenState';
import type { ShoppingListsViewProps } from '../types';

// Acentos decorativos rotativos para los iconos de lista (paleta del theme).
const ACCENTS = ['#2F5D8C', '#E3B23C', '#A63A3A', '#5F7A4F', '#8B5E3C'];

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
  } = props;

  return (
    <div className="cz min-h-[80dvh] px-5 py-6" style={{ background: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-[520px]">
        <header className="mb-5 cz-pop">
          <div className="cz-wood mb-2 inline-block">
            <p className="cz-serif text-base">En esta casa</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <h1 className="cz-serif text-4xl leading-none">Listas</h1>
            <span className="cz-stamp">LA COMPRA</span>
          </div>
          <p className="mt-1 text-sm opacity-70">
            {lists.length} {lists.length === 1 ? 'lista' : 'listas'}
          </p>
          <div className="cz-stripe mt-3" />
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
              <button
                key={l.id}
                type="button"
                onClick={() => onOpenList(l.id)}
                className="cz-frame cz-pop flex w-full items-center gap-3 text-left transition hover:-translate-y-0.5"
              >
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl text-white"
                  style={{ background: ACCENTS[i % ACCENTS.length] }}
                  aria-hidden="true"
                >
                  🛒
                </div>
                <div className="min-w-0 flex-1">
                  <p className="cz-serif truncate text-lg">{l.name}</p>
                  <p className="text-xs opacity-70">
                    Actualizada {new Date(l.updatedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                {l.type === 'MAIN' && <span className="cz-tag">Principal</span>}
                <span aria-hidden="true" className="text-lg opacity-50">
                  ›
                </span>
              </button>
            ))}
          </div>
        </ScreenState>

        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Crear lista"
          className="cz-btn-denim mt-5 w-full"
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
      style={{ background: 'rgba(36, 36, 36, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear lista"
        onClick={(e) => e.stopPropagation()}
        className="cz cz-frame cz-pop w-full max-w-[420px]"
      >
        <h2 className="cz-serif text-2xl">Nueva lista</h2>
        <p className="mb-3 mt-1 text-sm opacity-70">Pon un nombre que reconozcas fácil.</p>
        <label htmlFor="list-name" className="mb-1.5 block text-sm font-bold">
          Nombre de la lista
        </label>
        <input
          id="list-name"
          className="cz-input"
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
          <button type="button" className="cz-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="cz-btn-denim disabled:cursor-not-allowed disabled:opacity-50"
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
