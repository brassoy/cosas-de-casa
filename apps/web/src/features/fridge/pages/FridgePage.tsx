/**
 * FridgePage — CONTAINER de la pantalla de la nevera.
 *
 * Cablea la lógica real (queries + mutaciones + filtro Zustand) UNA sola vez y
 * delega el render en `ThemeView`, que monta la vista presentacional del theme
 * activo (con fallback a `base`).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useFamilyFridge` (query) + guard de familia activa.
 *  - Filtro de ubicación en Zustand (`useFridgeStore`).
 *  - Orden por caducidad y PRECÁLCULO de la urgencia (`getExpiryUrgency`):
 *    la vista recibe `item.urgency` + `item.urgencyLabel` listos para pintar
 *    (single source of truth, plan §4 fila 11 / §7 decisión A).
 *  - Mutaciones: crear, actualizar, eliminar (optimista + revert), comer
 *    (dual `{deleted}`), tirar, congelar (relocation a FREEZER).
 *  - CONFIRMACIÓN de acciones destructivas (tirar / eliminar) vía `window.confirm`
 *    (mismo patrón que listas/tickets) antes de disparar la mutación.
 *  - MANEJO DE ERROR de las acciones rápidas: las mutaciones son optimistas y
 *    hacen rollback al fallar; sin feedback el ítem reaparecía "solo". Aquí cada
 *    acción pasa un `onError` que muestra un `toast.error` para que el fallo se vea.
 *  - REALTIME (`useFridgeRealtime`): invalida la query cuando otro miembro de la
 *    familia consume/añade/tira un producto, refrescando la nevera en vivo.
 *  - Estado de los diálogos (añadir / editar): se cierran SOLO al éxito de la
 *    mutación; en error se mantienen abiertos con `submitError`.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { ApiRequestError } from '@/shared/lib/api';
import {
  useFamilyFridge,
  useCreateFridgeItem,
  useUpdateFridgeItemByFamily,
  useDeleteFridgeItemByFamily,
  useEatFridgeItemByFamily,
  useThrowFridgeItemByFamily,
  useFreezeFridgeItemByFamily,
  useThawFridgeItemByFamily,
} from '../hooks/useFridge';
import { useFridgeRealtime } from '../hooks/useFridgeRealtime';
import { useFridgeStore } from '../store/fridge.store';
import { getExpiryUrgency, urgencyLabel } from '../types';
import type { FridgeItemDto } from '../types';
import type { FridgeLocation } from '@cosasdecasa/contracts';
import type {
  FridgeListItem,
  FridgeListViewProps,
} from '../views/types';
import {
  ImportFromShoppingDialog,
  type ImportableItem,
} from '../components/ImportFromShoppingDialog';

// ── Helpers de presentación de datos ──────────────────────────────────────────

/** Ordena por caducidad: sin fecha al final, los que antes caducan primero. */
function sortByExpiry(items: FridgeItemDto[]): FridgeItemDto[] {
  return [...items].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });
}

/** Decora el DTO con la urgencia y su etiqueta precalculadas. */
function toListItem(item: FridgeItemDto): FridgeListItem {
  const urgency = getExpiryUrgency(item.expiryDate);
  return { ...item, urgency, urgencyLabel: urgencyLabel(urgency, item.expiryDate) };
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiRequestError ? err.body.message : fallback;
}

/** Frase de destino para los mensajes de "añadir a …" según la ubicación. */
const LOCATION_PHRASE: Record<FridgeLocation, string> = {
  FRIDGE: 'a la nevera',
  FREEZER: 'al congelador',
  PANTRY: 'a la despensa',
};

// ── Container ─────────────────────────────────────────────────────────────────

export function FridgePage() {
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const familyId = activeFamily?.id ?? '';

  const { data: allItems = [], isLoading, error } = useFamilyFridge(activeFamily?.id);

  // Realtime: invalida la query cuando otro miembro de la familia toca la nevera.
  useFridgeRealtime(activeFamily?.id);

  const locationFilter = useFridgeStore((s) => s.filters.location);
  const setLocationFilter = useFridgeStore((s) => s.setLocationFilter);

  // Ubicación destino al añadir (manual o desde la compra): la sección seleccionada
  // (Congelador/Despensa) o la Nevera por defecto cuando se ve "Todo".
  const importTarget: FridgeLocation = locationFilter === 'ALL' ? 'FRIDGE' : locationFilter;

  // Mutaciones (instanciadas una vez; el id viaja en cada `mutate`).
  const create = useCreateFridgeItem(familyId);
  const update = useUpdateFridgeItemByFamily(familyId);
  const remove = useDeleteFridgeItemByFamily(familyId);
  const eat = useEatFridgeItemByFamily(familyId);
  const discard = useThrowFridgeItemByFamily(familyId);
  const freeze = useFreezeFridgeItemByFamily(familyId);
  const thaw = useThawFridgeItemByFamily(familyId);

  // Estado de los diálogos.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeListItem | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Diálogo "Añadir desde la compra".
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Ítems ordenados + urgencia precalculada para la vista.
  const items = useMemo<FridgeListItem[]>(
    () => sortByExpiry(allItems).map(toListItem),
    [allItems],
  );

  function closeDialogs() {
    setIsAddOpen(false);
    setEditingItem(null);
    setSubmitError(null);
  }

  /**
   * Añade UN producto comprado a la nevera (POST reutilizando `useCreateFridgeItem`).
   * La cantidad de la compra es `number`; la nevera la espera como STRING numérico.
   * Si el producto no trae cantidad, entra con "1" (igual que el alta manual). El
   * hook ya invalida la query de la nevera al terminar. Devuelve `true` si se añadió,
   * para que el diálogo lo quite de la lista al instante.
   */
  async function handleImportOne(item: ImportableItem): Promise<boolean> {
    try {
      await create.mutateAsync({
        name: item.name,
        quantity: item.quantity != null ? String(item.quantity) : '1',
        unit: item.unit ?? undefined,
        location: importTarget,
      });
      toast.success(`${item.name} añadido ${LOCATION_PHRASE[importTarget]}.`);
      return true;
    } catch (err) {
      toast.error(toMessage(err, `No se ha podido añadir ${item.name}.`));
      return false;
    }
  }

  /** Nombre legible del ítem para los mensajes de confirmación/error. */
  function nameOf(id: string): string {
    return items.find((i) => i.id === id)?.name ?? 'el producto';
  }

  const props: FridgeListViewProps = {
    items,
    isLoading,
    error: error ? 'No se ha podido cargar el inventario. Inténtalo de nuevo.' : null,
    locationFilter,
    isAddOpen,
    editingItem,
    isSubmitting: create.isPending || update.isPending,
    submitError,
    onChangeFilter: setLocationFilter,
    onOpenAdd: () => {
      setSubmitError(null);
      setIsAddOpen(true);
    },
    onOpenImport: () => setIsImportOpen(true),
    onOpenEdit: (item) => {
      setSubmitError(null);
      setEditingItem(item);
    },
    onCloseDialogs: closeDialogs,
    onAdd: (input) => {
      setSubmitError(null);
      create.mutate(input, {
        onSuccess: () => closeDialogs(),
        onError: (err) => setSubmitError(toMessage(err, 'No se ha podido añadir el producto.')),
      });
    },
    onUpdate: (id, input) => {
      setSubmitError(null);
      update.mutate(
        { id, input },
        {
          onSuccess: () => closeDialogs(),
          onError: (err) =>
            setSubmitError(toMessage(err, 'No se ha podido actualizar el producto.')),
        },
      );
    },
    // Eliminar: DESTRUCTIVA → confirmación + feedback de error (la mutación es
    // optimista y revierte sola al fallar; sin el toast el ítem reaparecía sin
    // explicación).
    onDelete: (id) => {
      if (!window.confirm(`¿Seguro que quieres eliminar ${nameOf(id)}? Esta acción no se puede deshacer.`)) {
        return;
      }
      remove.mutate(id, {
        onError: (err) =>
          toast.error(toMessage(err, 'No se ha podido eliminar el producto. Inténtalo de nuevo.')),
      });
    },
    // Comer: no destructiva, pero también puede fallar en silencio → toast.
    onEat: (id) =>
      eat.mutate(id, {
        onError: (err) =>
          toast.error(toMessage(err, 'No se ha podido marcar como consumido. Inténtalo de nuevo.')),
      }),
    // Stepper +/−: ajusta la cantidad de 1 en 1. La cantidad de la nevera debe ser
    // un número POSITIVO (contrato), así que bajar de 1 con "−" deja la cantidad en
    // 0 → el producto se ELIMINA de la nevera (sin confirmación: es el gesto natural
    // de "ya no me queda"). En cualquier otro caso se persiste la nueva cantidad.
    onAdjustQuantity: (id, delta) => {
      const current = items.find((i) => i.id === id);
      if (!current) return;
      const base = current.quantity != null ? Number(current.quantity) : 0;
      const safeBase = Number.isFinite(base) ? base : 0;
      const next = safeBase + delta;
      if (next <= 0) {
        remove.mutate(id, {
          onSuccess: () => toast.success(`${current.name} eliminado de la nevera.`),
          onError: (err) =>
            toast.error(toMessage(err, 'No se ha podido eliminar el producto. Inténtalo de nuevo.')),
        });
        return;
      }
      update.mutate(
        { id, input: { quantity: String(next) } },
        {
          onError: (err) =>
            toast.error(toMessage(err, 'No se ha podido cambiar la cantidad. Inténtalo de nuevo.')),
        },
      );
    },
    // Tirar: DESTRUCTIVA → confirmación + feedback de error.
    onThrow: (id) => {
      if (!window.confirm(`¿Seguro que quieres tirar ${nameOf(id)}? Esta acción no se puede deshacer.`)) {
        return;
      }
      discard.mutate(id, {
        onError: (err) =>
          toast.error(toMessage(err, 'No se ha podido tirar el producto. Inténtalo de nuevo.')),
      });
    },
    // Congelar: no destructiva, pero el fallo también debe verse → toast.
    onFreeze: (id) =>
      freeze.mutate(id, {
        onError: (err) =>
          toast.error(toMessage(err, 'No se ha podido congelar el producto. Inténtalo de nuevo.')),
      }),
    // Descongelar: no destructiva, pero el fallo también debe verse → toast.
    onThaw: (id) =>
      thaw.mutate(id, {
        onError: (err) =>
          toast.error(toMessage(err, 'No se ha podido descongelar el producto. Inténtalo de nuevo.')),
      }),
  };

  if (!activeFamily) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60dvh',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>No hay ninguna familia activa.</p>
      </div>
    );
  }

  return (
    <>
      <ThemeView screen="fridge_list" props={props} />
      {/* Diálogo "Añadir desde la compra": estilo neutro, reutilizable por los 4
          themes. Su cuerpo (lecturas de la compra) solo se monta al abrirse. */}
      <ImportFromShoppingDialog
        open={isImportOpen}
        familyId={familyId}
        targetPhrase={LOCATION_PHRASE[importTarget]}
        onClose={() => setIsImportOpen(false)}
        onAddItem={handleImportOne}
      />
    </>
  );
}
