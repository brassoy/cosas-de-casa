/**
 * ShoppingListsView — vista presentacional `base` (estética shadcn) del listado
 * de listas de la compra.
 *
 * Porta el JSX del componente base del kit (Lovable `shopping.tsx` → `ListsPage`)
 * a las primitivas shadcn de `@/shared/ui/*`, reconciliando los tipos con los DTOs
 * reales (`ShoppingListSummaryDto`). La lista MAIN se distingue por `type`, nunca
 * por su posición.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores. El estado offline-first (Dexie + outbox) vive en el container.
 */

import { useState } from 'react';
import { ChevronRight, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ScreenState } from '@/shared/components/ScreenState';
import type { ShoppingListsViewProps } from '../types';

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
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Listas de la compra</h1>
        <Button size="sm" className="shrink-0" onClick={onOpenCreate} aria-label="Crear lista">
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Crear
        </Button>
      </div>

      <ScreenState
        isLoading={isLoading}
        error={error}
        isEmpty={lists.length === 0}
        emptyIcon={<ShoppingCart className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="Aún no tienes listas."
        emptyCta={{ label: 'Crear tu primera lista', onClick: onOpenCreate }}
      >
        <ul className="space-y-2">
          {lists.map((l) => (
            <li
              key={l.id}
              className="flex min-h-[64px] items-center gap-1 rounded-card border border-border bg-background pr-2 transition-colors hover:bg-card"
            >
              <button
                type="button"
                onClick={() => onOpenList(l.id)}
                className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Actualizada {new Date(l.updatedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                {l.type === 'MAIN' && <Badge>Principal</Badge>}
                <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </button>
              {l.type !== 'MAIN' && onDeleteList && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Borrar lista ${l.name}`}
                  onClick={() => onDeleteList(l.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </ScreenState>

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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent aria-label="Crear lista">
        <DialogHeader>
          <DialogTitle>Nueva lista</DialogTitle>
          <DialogDescription>Pon un nombre que reconozcas fácil.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="list-name">Nombre de la lista</Label>
          <Input
            id="list-name"
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isCreating ? 'Creando…' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
