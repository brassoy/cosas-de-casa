/**
 * ListDetailPage — CONTAINER del detalle de una lista de la compra.
 *
 * Es la pantalla MÁS DENSA: cablea TODA la lógica real una sola vez y delega el
 * render en `ThemeView` (vista presentacional del theme activo, fallback base).
 * No se pierde nada: offline-first Dexie+outbox, dedup SUGGEST/AUTO_MERGE, realtime
 * LWW, voz (Web Speech + extracción IA), comentarios offline-first y success overlay.
 *
 * Responsabilidades que viven AQUÍ (no en la vista):
 *  - `useShoppingListDetail` (Dexie liveQuery + seed) + `useToggleItem`,
 *    `useDeleteItem`, `useAddItemWithDedup` (con su estado: dedupState, autoMerge,
 *    successOverlay, successCount).
 *  - `useFrequentItems` (frecuentes de la familia) → barra de "añadir rápido".
 *  - `useRealtimeItems` (Supabase Realtime → merge LWW en Dexie respetando outbox).
 *  - `useShoppingStore` (ítem abierto en el Sheet) + comentarios del ítem abierto
 *    (`useItemComments` + `useAddComment`, instanciados para el ÚNICO ítem abierto,
 *    nunca en bucle).
 *  - Voz: `useVoiceRecognition` (Web Speech) + POST /ai/extract-items → chips de
 *    confirmación; estado expuesto como `voiceState`/`voiceInterim`/`voiceError`/
 *    `voiceCandidates` y callbacks `onVoice`/`onConfirmVoice`/`onCancelVoice`.
 *  - `isOffline` reactivo (navigator.onLine + eventos online/offline).
 *  - Mapeo `LocalItem`/`LocalComment` → DTOs de presentación (null → undefined).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ExtractItemsResponse } from '@cosasdecasa/contracts';
import { api } from '@/shared/lib/api';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  useShoppingListDetail,
  useToggleItem,
  useDeleteItem,
  useUpdateItem,
  useAddItemWithDedup,
  useItemComments,
  useAddComment,
} from '../hooks/useShopping';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { useRealtimeItems } from '../hooks/useRealtimeItems';
import { useVoiceRecognition } from '@/shared/hooks/useVoiceRecognition';
import { useShoppingStore } from '../store/shopping.store';
import type { LocalComment, LocalItem } from '../offline/db';
import type {
  AddItemPayload,
  ItemCommentView,
  ShoppingItemView,
  ShoppingListDetailViewProps,
} from '../views/types';

// ── Mapeos Dexie → DTO de presentación ────────────────────────────────────────

/** Normaliza el ítem local a `ShoppingItemDto`: `null`/`undefined` coherentes. */
function toItemView(i: LocalItem): ShoppingItemView {
  return {
    id: i.id,
    listId: i.listId,
    name: i.name,
    quantity: i.quantity ?? undefined,
    unit: i.unit ?? undefined,
    description: i.description ?? undefined,
    purchaseLink: i.purchaseLink ?? undefined,
    checked: i.checked,
    updatedAt: i.updatedAt,
    createdAt: i.createdAt,
  };
}

function toCommentView(c: LocalComment): ItemCommentView {
  return {
    id: c.id,
    body: c.body,
    authorName: c.authorName,
    createdAt: c.createdAt,
  };
}

// ── Container ─────────────────────────────────────────────────────────────────

export function ListDetailPage() {
  const { listId, familyId } = useParams({ strict: false }) as {
    listId: string;
    familyId: string;
  };
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { list, items, loading } = useShoppingListDetail(listId);
  const { toggleItem } = useToggleItem();
  const { deleteItem } = useDeleteItem();
  const { updateItem } = useUpdateItem();
  const {
    addItemWithDedup,
    dedupState,
    confirmDedup,
    cancelDedup,
    autoMergeMessage,
    showSuccessOverlay,
    successCount,
    hideSuccessOverlay,
  } = useAddItemWithDedup();

  const { items: frequentItems } = useFrequentItems(familyId);

  // Realtime: mergea cambios remotos en Dexie (LWW respetando outbox pending).
  useRealtimeItems(listId);

  // Ítem abierto en el Sheet (Zustand) + sus comentarios (un solo ítem, sin bucle).
  const openItemId = useShoppingStore((s) => s.openItemId);
  const openItem = useShoppingStore((s) => s.openItem);
  const closeItem = useShoppingStore((s) => s.closeItem);
  const { comments } = useItemComments(openItemId ?? undefined);
  const { addComment } = useAddComment(openItemId ?? '');
  const [isSendingComment, setIsSendingComment] = useState(false);

  // ── Estado online/offline reactivo ──────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Voz: reconocimiento + extracción de ítems por IA ────────────────────────
  const [voiceCandidates, setVoiceCandidates] = useState<string[]>([]);
  const [voiceExtractError, setVoiceExtractError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const handleFinalTranscript = useCallback(async (transcript: string) => {
    setVoiceExtractError(null);
    setExtracting(true);
    try {
      const response = await api.post<ExtractItemsResponse>('/ai/extract-items', {
        phrase: transcript,
      });
      const detected = response.items.filter((s) => s.trim().length > 0);
      if (detected.length === 0) {
        setVoiceExtractError('No se han detectado artículos en lo que has dicho. Inténtalo de nuevo.');
        return;
      }
      setVoiceCandidates(detected);
    } catch {
      setVoiceExtractError('No se ha podido extraer los artículos. Inténtalo de nuevo.');
    } finally {
      setExtracting(false);
    }
  }, []);

  const {
    supported: voiceSupported,
    state: rawVoiceState,
    interimTranscript,
    start: startVoice,
    stop: stopVoice,
    errorMessage: voiceRecogError,
  } = useVoiceRecognition(handleFinalTranscript);

  // El estado de voz del contrato fusiona el reconocimiento con la extracción IA.
  const voiceState =
    rawVoiceState === 'listening'
      ? ('listening' as const)
      : rawVoiceState === 'processing' || extracting
        ? ('processing' as const)
        : ('idle' as const);

  // ── Mapeos para la vista ─────────────────────────────────────────────────────
  const mappedItems = useMemo<ShoppingItemView[]>(() => items.map(toItemView), [items]);
  const openItemData = openItemId ? items.find((i) => i.id === openItemId) ?? null : null;

  // ── Acciones ─────────────────────────────────────────────────────────────────
  async function handleAdd(payload: AddItemPayload) {
    await addItemWithDedup(
      listId,
      {
        name: payload.name,
        quantity: payload.quantity,
        unit: payload.unit,
        description: payload.description,
        purchaseLink: payload.purchaseLink,
      },
      payload.forceAdd ? { forceAdd: true } : {},
    );
  }

  async function handleConfirmVoice(names: string[]) {
    setVoiceCandidates([]);
    for (const name of names) {
      await addItemWithDedup(listId, { name });
    }
  }

  function handleSubmitComment(body: string) {
    if (!user || !openItemId) return;
    setIsSendingComment(true);
    void addComment(
      body,
      user.id,
      (user.user_metadata?.['display_name'] as string) ?? user.email ?? 'Usuario',
    ).finally(() => setIsSendingComment(false));
  }

  if (!list && !loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60dvh',
        }}
      >
        <p style={{ color: 'var(--color-text-muted)' }}>Lista no encontrada.</p>
      </div>
    );
  }

  const props: ShoppingListDetailViewProps = {
    listName: list?.name ?? '…',
    items: mappedItems,
    frequentItems,
    isLoading: loading,
    error: null,
    isOffline,
    voiceSupported,
    voiceState,
    voiceInterim: interimTranscript,
    voiceError: voiceRecogError ?? voiceExtractError,
    voiceCandidates,
    autoMergeMessage,
    dedupPending: dedupState
      ? {
          pendingName: dedupState.itemData.name,
          candidates: [{ displayName: dedupState.existingName }],
        }
      : null,
    successOverlay: { visible: showSuccessOverlay, key: successCount },
    openItem: openItemData
      ? {
          item: toItemView(openItemData),
          comments: comments.map(toCommentView),
          isSendingComment,
        }
      : null,
    onBack: () => void navigate({ to: '/family/$familyId/lists', params: { familyId } }),
    onAddItem: (payload) => {
      void handleAdd(payload);
    },
    onToggle: (id, checked) => {
      void toggleItem(id, checked);
    },
    onDelete: (id) => {
      void deleteItem(id);
    },
    onQuickAdd: (name) => {
      void handleAdd({ name });
    },
    onVoice: () => {
      if (rawVoiceState === 'listening') stopVoice();
      else startVoice();
    },
    onConfirmVoice: (names) => {
      void handleConfirmVoice(names);
    },
    onCancelVoice: () => {
      setVoiceCandidates([]);
      setVoiceExtractError(null);
    },
    onConfirmDedup: () => {
      void confirmDedup();
    },
    onCancelDedup: cancelDedup,
    onCloseSuccess: hideSuccessOverlay,
    onOpenItem: openItem,
    onCloseItem: closeItem,
    onAddComment: handleSubmitComment,
    onEditItem: (id, changes) => {
      void updateItem(id, changes);
    },
  };

  return <ThemeView screen="shopping_list_detail" props={props} />;
}
