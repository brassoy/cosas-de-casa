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
 *  - Estado de los diálogos (añadir / editar): se cierran SOLO al éxito de la
 *    mutación; en error se mantienen abiertos con `submitError`.
 */

import { useMemo, useState } from 'react';
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
} from '../hooks/useFridge';
import { useFridgeStore } from '../store/fridge.store';
import { getExpiryUrgency, urgencyLabel } from '../types';
import type { FridgeItemDto } from '../types';
import type {
  FridgeListItem,
  FridgeListViewProps,
} from '../views/types';

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

// ── Container ─────────────────────────────────────────────────────────────────

export function FridgePage() {
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const familyId = activeFamily?.id ?? '';

  const { data: allItems = [], isLoading, error } = useFamilyFridge(activeFamily?.id);

  const locationFilter = useFridgeStore((s) => s.filters.location);
  const setLocationFilter = useFridgeStore((s) => s.setLocationFilter);

  // Mutaciones (instanciadas una vez; el id viaja en cada `mutate`).
  const create = useCreateFridgeItem(familyId);
  const update = useUpdateFridgeItemByFamily(familyId);
  const remove = useDeleteFridgeItemByFamily(familyId);
  const eat = useEatFridgeItemByFamily(familyId);
  const discard = useThrowFridgeItemByFamily(familyId);
  const freeze = useFreezeFridgeItemByFamily(familyId);

  // Estado de los diálogos.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridgeListItem | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    onDelete: (id) => remove.mutate(id),
    onEat: (id) => eat.mutate(id),
    onThrow: (id) => discard.mutate(id),
    onFreeze: (id) => freeze.mutate(id),
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

  return <ThemeView screen="fridge_list" props={props} />;
}
