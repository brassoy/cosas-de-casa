/* ─── Vista presentacional cozy — listado de listas de la compra ─────────────
 *
 * Theme `cozy` (estética cuaderno de papel manuscrito): papel crema pautado,
 * tinta marrón, notas pegadas con cinta/chinchetas, tipografía Caveat/Patrick
 * Hand, casillas y sellos a mano (clases .ck-* de shared/theme/themes/cozy.css).
 * MISMA funcionalidad que la vista base: listar, abrir detalle y crear lista
 * mediante diálogo controlado por el container.
 *
 * El diálogo de crear lista REUTILIZA el shell shadcn `Dialog` (focus-trap,
 * escape, portal) y solo reestiliza su contenido con clases .ck-*; así no se
 * pierde a11y.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. El estado offline-first (Dexie + outbox) vive en el
 * container.
 * ─────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import type { ShoppingListsViewProps } from '../types';

// Tonos de chincheta rotativos (paleta cruda del kit cozy: rojo, azul, verde,
// amarillo, morado). Matices decorativos sin var semántica, igual que el kit
// estático (PINS).
const PINS = ['#c0392b', '#2d4a8a', '#5b8a3a', '#e3a51a', '#8e44ad'];

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
    <div className="ck ck-page min-h-[80dvh]">
      <div className="mx-auto max-w-[520px] px-5 pb-24 pt-8">
        <header className="relative mb-6 text-center">
          <p className="ck-marker text-base opacity-70">— diario de la casa —</p>
          <h1 className="ck-marker mt-1 text-5xl leading-none text-accent">Listas</h1>
          <p className="mt-2 text-base opacity-80">
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
          <div className="space-y-4">
            {lists.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onOpenList(l.id)}
                className="ck-card relative w-full p-4 text-left"
                style={{ transform: `rotate(${((i % 3) - 1) * 0.5}deg)` }}
              >
                <span
                  className="ck-pin"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, #fff, ${PINS[i % PINS.length]!})`,
                  }}
                  aria-hidden="true"
                />
                <p className="ck-marker text-2xl text-accent">{l.name}</p>
                <p className="mt-1 text-sm opacity-70">
                  Actualizada {new Date(l.updatedAt).toLocaleDateString('es-ES')}
                </p>
                {l.type === 'MAIN' && <span className="ck-tag mt-2 inline-block">Principal</span>}
              </button>
            ))}
          </div>
        </ScreenState>

        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Crear lista"
          className="ck-btn ck-btn-red mt-6 w-full"
        >
          + nueva lista
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

// ── Diálogo de crear lista (shell shadcn reestilizado, controlado por el
//    container) ───────────────────────────────────────────────────────────────

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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent aria-label="Crear lista" className="ck ck-card">
        <span className="ck-tape" aria-hidden="true" />
        <DialogHeader>
          <DialogTitle className="ck-marker text-3xl leading-none text-accent">
            Nueva lista
          </DialogTitle>
          <DialogDescription className="text-sm opacity-70">
            Pon un nombre que reconozcas fácil.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="list-name" className="ck-marker block text-xl text-accent">
            nombre de la lista
          </label>
          <input
            id="list-name"
            className="ck-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) handleSubmit();
            }}
            placeholder="p. ej. Vacaciones, Mercado semanal…"
            maxLength={100}
            autoFocus
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="ck-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="ck-btn ck-btn-blue disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isCreating ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
