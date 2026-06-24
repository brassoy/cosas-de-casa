/**
 * ImportFromShoppingDialog — diálogo para AÑADIR A LA NEVERA DESDE LA COMPRA.
 *
 * Cross-feature: lee las listas de la compra (feature `shopping`, offline-first
 * con Dexie) y permite importar a la nevera los productos marcados como
 * COMPRADOS (`checked === true`) de la lista elegida.
 *
 * Interacción (decisión de producto):
 *  - NO hay selección previa ni botón de confirmar. Se muestra el listado de
 *    productos comprados y, al hacer CLIC en uno, se añade al instante a la nevera
 *    y DESAPARECE del listado. Así se van pasando uno a uno de forma dinámica.
 *  - El diálogo permanece abierto para seguir añadiendo; se cierra con "Cerrar".
 *
 * Look & feel:
 *  - Se TEMATIZA según el theme activo (`useThemeName`) para verse igual que el
 *    modal "Añadir producto" (FridgeItemDialog): aplica la clase del theme al
 *    `DialogContent` (`sf` / `ck ck-card` / `cz`) y usa las clases de cada theme
 *    para título, labels, inputs y botones (`sf-input`/`ck-input`/`cz-input`,
 *    `sf-btn`/`ck-btn`/`cz-btn-*`, etc.). En `base` usa el estilo shadcn.
 *  - El selector de lista es un `<select>` NATIVO a propósito: el Radix Select
 *    dentro de un Dialog da problemas en táctil en esta app.
 *  - Por defecto se elige la lista PRINCIPAL (`type === 'MAIN'`).
 *
 * Las lecturas de la compra (hooks Dexie) viven en `ImportDialogBody`, que SOLO
 * se monta cuando el diálogo está abierto: así no arrastramos seeding ni queries
 * de Dexie cuando el diálogo está cerrado (y se respetan las reglas de hooks).
 *
 * La CREACIÓN del ítem en la nevera NO vive aquí: el diálogo emite cada producto
 * por `onAddItem` y el container hace el POST + feedback (toast). `onAddItem`
 * devuelve `true` si se añadió, para quitarlo del listado.
 */

import { useMemo, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { useThemeName } from '@/shared/theme/use-theme-name';
import type { ThemeName } from '@/shared/theme/theme-bootstrap';
import { useShoppingLists, useShoppingListDetail } from '@/features/shopping/hooks/useShopping';

/** Producto comprado listo para importar a la nevera. */
export interface ImportableItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

// ── Tokens de estilo por theme (espejo del FridgeItemDialog de cada theme) ──────

interface ThemeTokens {
  content: string;
  title: string;
  titleStyle?: React.CSSProperties;
  label: string;
  labelStyle?: React.CSSProperties;
  input: string;
  closeBtn: string;
  muted: string;
}

const BASE_INPUT =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm';

const THEME: Record<ThemeName, ThemeTokens> = {
  base: {
    content: '',
    title: 'flex items-center gap-2',
    label: 'text-sm font-medium leading-none',
    input: BASE_INPUT,
    closeBtn:
      'inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground',
    muted: 'text-sm text-muted-foreground',
  },
  springfield: {
    content: 'sf',
    title: 'sf-bangers text-3xl flex items-center gap-2',
    label: 'sf-fredoka text-xs uppercase opacity-70',
    input: 'sf-input',
    closeBtn: 'sf-btn sf-btn-w',
    muted: 'sf-fredoka text-sm opacity-70',
  },
  cozy: {
    content: 'ck ck-card',
    title: 'ck-marker text-4xl flex items-center gap-2',
    titleStyle: { color: '#2d4a8a' },
    label: 'ck-marker text-xl',
    labelStyle: { color: '#2d4a8a' },
    input: 'ck-input',
    closeBtn: 'ck-btn',
    muted: 'text-sm opacity-80',
  },
  cozysitcom: {
    content: 'cz',
    title: 'cz-serif text-2xl flex items-center gap-2',
    label: 'text-xs font-bold uppercase opacity-70',
    input: 'cz-input',
    closeBtn: 'cz-btn-ghost',
    muted: 'text-sm opacity-70',
  },
};

interface ImportFromShoppingDialogProps {
  open: boolean;
  familyId: string;
  /** Frase de destino ("a la nevera" / "al congelador" / "a la despensa"). */
  targetPhrase: string;
  onClose: () => void;
  /**
   * Añade UN producto a la ubicación destino. Devuelve `true` si se añadió
   * correctamente (entonces el diálogo lo quita del listado al instante).
   */
  onAddItem: (item: ImportableItem) => Promise<boolean>;
}

export function ImportFromShoppingDialog({
  open,
  familyId,
  targetPhrase,
  onClose,
  onAddItem,
}: ImportFromShoppingDialogProps) {
  const theme = useThemeName();
  const t = THEME[theme] ?? THEME.base;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent aria-label="Añadir desde la compra" className={t.content}>
        <DialogHeader>
          <DialogTitle className={t.title} style={t.titleStyle}>
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            Añadir desde la compra
          </DialogTitle>
        </DialogHeader>

        {/* El cuerpo (que lee de Dexie) solo se monta con el diálogo abierto. */}
        {open && (
          <ImportDialogBody
            familyId={familyId}
            targetPhrase={targetPhrase}
            onClose={onClose}
            onAddItem={onAddItem}
            t={t}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Cuerpo del diálogo (lecturas de la compra) ─────────────────────────────────

interface ImportDialogBodyProps {
  familyId: string;
  targetPhrase: string;
  onClose: () => void;
  onAddItem: (item: ImportableItem) => Promise<boolean>;
  t: ThemeTokens;
}

function ImportDialogBody({ familyId, targetPhrase, onClose, onAddItem, t }: ImportDialogBodyProps) {
  const { lists } = useShoppingLists(familyId);

  // Lista seleccionada: por defecto la PRINCIPAL (type === 'MAIN'); si no hay,
  // la primera disponible.
  const defaultListId = useMemo(() => {
    const main = lists.find((l) => l.type === 'MAIN');
    return main?.id ?? lists[0]?.id ?? '';
  }, [lists]);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const listId = selectedListId ?? defaultListId;

  const { items } = useShoppingListDetail(listId || undefined);

  // Productos ya añadidos a la nevera en esta sesión del diálogo: se ocultan del
  // listado al instante (la compra no se modifica, así que filtramos en local).
  const [added, setAdded] = useState<Set<string>>(new Set());
  // Producto cuyo POST está en curso (para deshabilitar su fila mientras tanto).
  const [addingId, setAddingId] = useState<string | null>(null);

  // Solo los productos comprados (checked === true) que aún no se han añadido,
  // ordenados por nombre.
  const purchased = useMemo(
    () => items.filter((i) => i.checked).sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );
  const visible = purchased.filter((i) => !added.has(i.id));

  async function handleAdd(item: (typeof purchased)[number]) {
    if (addingId) return;
    setAddingId(item.id);
    const ok = await onAddItem({
      name: item.name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
    });
    setAddingId(null);
    if (ok) {
      setAdded((prev) => new Set(prev).add(item.id));
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* ── Selector de lista (NATIVO, no Radix Select) ── */}
        <div className="space-y-1.5">
          <label htmlFor="import-list" className={t.label} style={t.labelStyle}>
            Lista de la compra
          </label>
          <select
            id="import-list"
            aria-label="Lista de la compra"
            className={t.input}
            value={listId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              setAdded(new Set()); // al cambiar de lista, reinicia lo ya añadido
            }}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.type === 'MAIN' ? `${l.name} (principal)` : l.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Productos comprados: clic = añadir y quitar del listado ── */}
        {purchased.length === 0 ? (
          <p className={t.muted}>
            No hay productos comprados en esta lista. Marca productos como comprados en la
            lista de la compra para poder añadirlos {targetPhrase}.
          </p>
        ) : visible.length === 0 ? (
          <p className={t.muted}>
            ¡Todo añadido {targetPhrase}! No quedan productos comprados por pasar.
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className={t.label} style={t.labelStyle}>
              Toca un producto para añadirlo {targetPhrase}
            </p>
            <ul
              className="max-h-64 space-y-1 overflow-y-auto rounded-card border-2 border-border p-2"
              style={{ background: 'var(--color-surface-raised, #ffffff)' }}
            >
              {visible.map((item) => {
                const qtyText = `${item.quantity != null ? item.quantity : ''}${
                  item.unit ? ` ${item.unit}` : ''
                }`.trim();
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={addingId === item.id}
                      onClick={() => void handleAdd(item)}
                      aria-label={`Añadir ${item.name} ${targetPhrase}`}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                      {qtyText && <span className="shrink-0 text-sm opacity-60">{qtyText}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter>
        <button type="button" className={t.closeBtn} onClick={onClose}>
          Cerrar
        </button>
      </DialogFooter>
    </>
  );
}
