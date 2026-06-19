/**
 * ListsPage — CONTAINER del listado de listas de la compra.
 *
 * Cablea la lógica real (offline-first) UNA sola vez y delega el render en
 * `ThemeView`, que monta la vista presentacional del theme activo (fallback base).
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useShoppingLists` (Dexie liveQuery) + seed transparente desde la API
 *    (`seedFromApi`, dentro del hook) + guard de familia activa.
 *  - `useCreateList` (escritura optimista en Dexie + outbox).
 *  - Estado del diálogo de crear (se cierra SOLO al terminar la creación).
 *  - Mapeo `LocalList` → `ShoppingListSummaryDto` para la vista.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFamilyStore } from '@/features/family/store/family.store';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useShoppingLists, useCreateList, useDeleteList } from '../hooks/useShopping';
import type { LocalList } from '../offline/db';
import type { ShoppingListSummaryView, ShoppingListsViewProps } from '../views/types';

/** Mapea la lista local de Dexie al DTO de resumen que consume la vista. */
function toSummary(l: LocalList): ShoppingListSummaryView {
  return {
    id: l.id,
    familyId: l.familyId,
    name: l.name,
    type: l.type,
    updatedAt: l.updatedAt,
    createdAt: l.createdAt,
  };
}

export function ListsPage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { lists, loading } = useShoppingLists(activeFamily?.id);
  const { createList } = useCreateList();
  const { deleteList } = useDeleteList();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const mappedLists = useMemo<ShoppingListSummaryView[]>(() => lists.map(toSummary), [lists]);

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

  const props: ShoppingListsViewProps = {
    lists: mappedLists,
    isLoading: loading,
    error: null,
    isCreateOpen,
    isCreating,
    onOpenCreate: () => setIsCreateOpen(true),
    onCloseCreate: () => setIsCreateOpen(false),
    onOpenList: (id) =>
      void navigate({
        to: '/family/$familyId/lists/$listId',
        params: { familyId: activeFamily.id, listId: id },
      }),
    onCreateList: (name) => {
      setIsCreating(true);
      void createList(activeFamily.id, name)
        .then(() => setIsCreateOpen(false))
        .finally(() => setIsCreating(false));
    },
    onDeleteList: (id) => {
      // La vista solo ofrece esta acción para listas CUSTOM (nunca la MAIN).
      // Confirmación bloqueante: no hay un AlertDialog compartido en el repo.
      if (!window.confirm('¿Seguro que quieres borrar esta lista? Se borrarán también sus artículos.')) {
        return;
      }
      void deleteList(id);
    },
  };

  return <ThemeView screen="shopping_lists" props={props} />;
}
