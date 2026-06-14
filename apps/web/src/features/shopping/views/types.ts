/**
 * Contrato de props de las pantallas de la feature `shopping`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `shopping.tsx`) reconciliado
 * con los DTOs reales de `@cosasdecasa/contracts` y con TODA la lógica real de la
 * feature (offline-first Dexie + outbox, dedup SUGGEST/AUTO_MERGE, realtime LWW,
 * voz por Web Speech, success overlay festivo, comentarios offline-first).
 *
 * Decisiones (plan §4 filas 7-8 + §7 decisión A — contrato AMPLIADO):
 *
 *  - Los tipos locales del kit (`ShoppingListSummary`, `ShoppingItem`,
 *    `FrequentItem`, `ItemComment`, `DedupCandidate`) se sustituyen por VISTAS de
 *    presentación derivadas de los DTOs reales y de los tipos Dexie (`LocalList`,
 *    `LocalItem`, `LocalComment`). El container mapea Dexie → estos shapes.
 *  - La urgencia/feedback NO aplica aquí; en su lugar el contrato expone el estado
 *    de los SUB-FLUJOS que la lógica real necesita y que el container COMPUTA:
 *      · `isOffline`           (navigator.onLine, reactivo)
 *      · `voiceSupported`      (SpeechRecognition disponible)
 *      · `voiceState`          ('idle' | 'listening' | 'processing')
 *      · `voiceInterim`        (transcript parcial en tiempo real)
 *      · `voiceError`          (error de reconocimiento o extracción)
 *      · `voiceCandidates`     (ítems extraídos por la IA, a confirmar con chips)
 *      · `dedupPending`        (candidates + pendingName cuando decision = SUGGEST)
 *      · `autoMergeMessage`    (toast AUTO_MERGE → SUGGEST: aviso de fusión)
 *      · `successOverlay`      ({ visible, key } para el overlay festivo)
 *  - Los SUB-FLUJOS (AddSection con micro y chips, DedupConfirmDialog, ItemSheet,
 *    AddSuccessOverlay) son subcomponentes PRESENTACIONALES dentro de la vista,
 *    todos props-driven (apertura/datos por props; emiten callbacks).
 *  - Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 *    datos, sin stores, sin Dexie, sin Web Speech.
 */

import type { ShoppingListSummaryDto, ShoppingItemDto } from '@cosasdecasa/contracts';

// ── shopping_lists ────────────────────────────────────────────────────────────

/**
 * Resumen de lista listo para pintar. Es el `ShoppingListSummaryDto` real (la
 * lista MAIN se distingue por `type`, no por su posición). El container lo mapea
 * desde `LocalList` (Dexie); `familyId`/`createdAt` se rellenan desde el dato
 * local.
 */
export type ShoppingListSummaryView = ShoppingListSummaryDto;

export interface ShoppingListsViewProps {
  /** Listas de la familia (Dexie liveQuery → mapeadas a DTO). */
  lists: ShoppingListSummaryView[];
  /** Carga inicial del listado (Dexie aún sin resolver). */
  isLoading?: boolean;
  /** Mensaje de error; normalmente `null` (Dexie no falla), opcional. */
  error?: string | null;
  /** El diálogo de "Crear lista" está abierto (controlado por el container). */
  isCreateOpen?: boolean;
  /** Una creación de lista está en curso. */
  isCreating?: boolean;
  /** Abre el diálogo de crear lista. */
  onOpenCreate: () => void;
  /** Cierra el diálogo de crear lista. */
  onCloseCreate: () => void;
  /** Abre el detalle de una lista. */
  onOpenList: (id: string) => void;
  /** Crea una lista nueva con el nombre dado (offline-first: Dexie + outbox). */
  onCreateList: (name: string) => void;
}

// ── shopping_list_detail ──────────────────────────────────────────────────────

/** Estado del micrófono de voz, expuesto por el container (Web Speech). */
export type VoiceState = 'idle' | 'listening' | 'processing';

/**
 * Ítem listo para pintar. Es el `ShoppingItemDto` real; el container lo mapea
 * desde `LocalItem` (Dexie) normalizando `null` → `undefined`.
 */
export type ShoppingItemView = ShoppingItemDto;

/** Entrada de la barra de "añadir rápido" (frecuentes de la familia). */
export interface FrequentItemView {
  /** Clave estable para el `key` del chip y para emitir el `onQuickAdd`. */
  name: string;
  /** Veces que se ha comprado (orden/peso; la vista puede ignorarlo). */
  count: number;
}

/** Comentario de un ítem, listo para pintar (mapeado desde `LocalComment`). */
export interface ItemCommentView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

/** Candidato de deduplicación similar al ítem que se intenta añadir. */
export interface DedupCandidateView {
  displayName: string;
  /** Similitud 0..1 (la vista la pinta como %). Opcional: el flujo real solo
   *  trae el nombre del candidato más parecido. */
  similarity?: number;
}

/**
 * Payload de añadir ítem que la vista emite hacia el container. Coincide con el
 * shape que consume `useAddItemWithDedup` (más `forceAdd` para "añadir igualmente").
 */
export interface AddItemPayload {
  name: string;
  quantity?: number;
  unit?: string;
  description?: string;
  purchaseLink?: string;
  forceAdd?: boolean;
}

/** Estado del diálogo de confirmación de dedup (decision = SUGGEST). */
export interface DedupPending {
  /** Nombre que el usuario intenta añadir. */
  pendingName: string;
  /** Candidatos similares (al menos el más parecido). */
  candidates: DedupCandidateView[];
}

/** Estado del overlay festivo de "¡Añadido!". */
export interface SuccessOverlayState {
  /** El overlay está visible. */
  visible: boolean;
  /** Clave que cambia con cada éxito → fuerza remount (frase/gif nuevos). */
  key: number;
}

/** Ítem cuyo Sheet de detalle está abierto, con sus comentarios. */
export interface OpenItemState {
  item: ShoppingItemView;
  comments: ItemCommentView[];
  /** Una publicación de comentario está en curso. */
  isSendingComment?: boolean;
}

export interface ShoppingListDetailViewProps {
  /** Nombre de la lista (cabecera). */
  listName: string;
  /** Ítems de la lista (Dexie liveQuery → mapeados a DTO). */
  items: ShoppingItemView[];
  /** Frecuentes de la familia para la barra de "añadir rápido". */
  frequentItems: FrequentItemView[];
  /** Carga inicial del detalle. */
  isLoading?: boolean;
  /** Mensaje de error de carga; `null` si no hay. */
  error?: string | null;

  // ── Estado de UX/sub-flujos (lo computa el container) ──────────────────────
  /** Sin conexión (navigator.onLine, reactivo). */
  isOffline?: boolean;
  /** La Web Speech API está disponible en este navegador. */
  voiceSupported?: boolean;
  /** Estado del micrófono. */
  voiceState?: VoiceState;
  /** Transcript parcial en tiempo real (feedback mientras se dicta). */
  voiceInterim?: string;
  /** Error de reconocimiento o de extracción de ítems por IA. */
  voiceError?: string | null;
  /** Ítems extraídos por la IA tras dictar; el usuario confirma cuáles añadir. */
  voiceCandidates?: string[];
  /** Toast de fusión automática (AUTO_MERGE → SUGGEST). */
  autoMergeMessage?: string | null;
  /** Confirmación de dedup pendiente (decision = SUGGEST), o `null`. */
  dedupPending?: DedupPending | null;
  /** Overlay festivo de éxito. */
  successOverlay?: SuccessOverlayState;
  /** Ítem abierto en el Sheet de detalle, o `null`. */
  openItem?: OpenItemState | null;

  // ── Callbacks ──────────────────────────────────────────────────────────────
  /** Vuelve al listado de listas. */
  onBack: () => void;
  /** Añade un ítem (offline-first + dedup; `forceAdd` para "añadir igualmente"). */
  onAddItem: (payload: AddItemPayload) => void;
  /** Marca/desmarca un ítem como comprado. */
  onToggle: (id: string, checked: boolean) => void;
  /** Elimina un ítem. */
  onDelete: (id: string) => void;
  /** Añade rápido un frecuente por su nombre. */
  onQuickAdd: (name: string) => void;
  /** Arranca/detiene el reconocimiento de voz (toggle según `voiceState`). */
  onVoice: () => void;
  /** Confirma los ítems de voz seleccionados (los añade todos). */
  onConfirmVoice: (names: string[]) => void;
  /** Descarta los ítems extraídos por voz sin añadirlos. */
  onCancelVoice: () => void;
  /** Confirma el añadido pese al duplicado (forceAdd). */
  onConfirmDedup: () => void;
  /** Cancela el añadido tras la sugerencia de duplicado. */
  onCancelDedup: () => void;
  /** Cierra el overlay festivo (por clic o timeout). */
  onCloseSuccess: () => void;
  /** Abre el Sheet de detalle de un ítem. */
  onOpenItem: (id: string) => void;
  /** Cierra el Sheet de detalle. */
  onCloseItem: () => void;
  /** Publica un comentario en el ítem abierto. */
  onAddComment: (body: string) => void;
}
