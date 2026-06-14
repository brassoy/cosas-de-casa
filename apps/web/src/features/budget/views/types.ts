/**
 * Contrato de props de las pantallas de la feature `budget` (tickets y gasto).
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `budget.tsx`) reconciliado
 * con los DTOs reales de `@cosasdecasa/contracts` y AMPLIADO para cubrir los
 * sub-flujos que el kit no modelaba:
 *
 *  - El kit usaba tipos locales `Receipt` / `ReceiptLine` / `ReceiptSummary` /
 *    `SpendSummary` / `SpendCategory`. Aquí se usan los DTOs reales:
 *    `ReceiptDto`, `ReceiptLineDto`, `ReceiptSummaryDto`, `SpendSummaryDto`,
 *    `SpendCategory`.
 *  - CONTRATO AMPLIADO (plan §4 filas 16-17 / §7 decisión B): el kit base solo
 *    exponía la captura como 3 fases (`idle | extracting | ai-unavailable`) y un
 *    `onSave(lines)` que cubría solo líneas. El flujo real necesita un EDITOR DE
 *    BORRADOR a pantalla completa (datos del OCR o alta manual con borrador vacío)
 *    que edita merchant + fecha + divisa + líneas y emite un `CreateReceiptInput`
 *    completo. Por eso:
 *      · `capture` añade la fase `draft` y `manual`; el borrador editable viaja en
 *        `draft` (datos extraídos por OCR o vacío para alta manual).
 *      · El editor (`ReceiptDraftEditor`) es un sub-componente presentacional
 *        controlado por el container: su apertura/datos llegan por props y emite
 *        `onSaveDraft(input)` / `onCancelCapture`.
 *      · En el detalle, `onSave(input)` recibe el `CreateReceiptInput` completo
 *        (merchant + fecha + divisa + líneas), no solo las líneas.
 *  - El total es numérico (`number`), formateado con `Intl.NumberFormat('es-ES')`.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación. La máquina de estados de captura, la
 * compresión de imagen, el OCR (503 → IA no disponible) y las mutaciones viven
 * en el container.
 */

import type {
  ReceiptDto,
  ReceiptSummaryDto,
  SpendSummaryDto,
  ExtractReceiptResponse,
  CreateReceiptInput,
} from '../contracts';

// ── Estado del flujo de captura (sub-flujo del editor de borrador) ─────────────

/**
 * Estado de la máquina de captura, computado por el container.
 *
 *  - `idle`           — listo para capturar; lista visible.
 *  - `extracting`     — comprimiendo + llamando al OCR; botón en "Procesando…".
 *  - `ai-unavailable` — el OCR devolvió 503; se ofrece "Alta manual" / "Cancelar".
 *  - `draft`          — editor abierto con el borrador extraído por OCR.
 *  - `manual`         — editor abierto con borrador vacío (alta manual).
 *
 * En `draft` el `draft` trae los datos extraídos; en `manual` viene un borrador
 * vacío (lo provee el container). En el resto de fases `draft` es `undefined`.
 */
export type ReceiptCapturePhase =
  | 'idle'
  | 'extracting'
  | 'ai-unavailable'
  | 'draft'
  | 'manual';

export interface ReceiptCaptureState {
  /** Fase actual de la captura. */
  phase: ReceiptCapturePhase;
  /**
   * Borrador editable cuando `phase === 'draft' | 'manual'`. En `draft` trae los
   * datos del OCR; en `manual` un borrador vacío (`{ lines: [], currency: 'EUR' }`).
   */
  draft?: ExtractReceiptResponse;
}

// ── budget_receipts (lista + captura + editor) ─────────────────────────────────

export interface ReceiptsViewProps {
  /** Tickets de la familia activa. */
  receipts: ReceiptSummaryDto[];
  /** Carga del listado en curso. */
  isLoading?: boolean;
  /** Mensaje de error del listado; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Estado de la máquina de captura (lo computa el container). */
  capture: ReceiptCaptureState;
  /** Mensaje de error de la captura/guardado; `null` si no hay error. */
  captureError?: string | null;
  /** El guardado del borrador está en curso. */
  isSavingDraft?: boolean;
  /**
   * El usuario eligió un archivo de imagen para extraer (OCR).
   * El container comprime y llama al OCR.
   */
  onCapture: (file: File) => void;
  /** Abre el editor en modo alta manual (borrador vacío). */
  onManualEntry: () => void;
  /** Cierra el editor / cancela el flujo de captura y vuelve a `idle`. */
  onCancelCapture: () => void;
  /** Guarda el borrador (OCR o manual) → crea el ticket. */
  onSaveDraft: (input: CreateReceiptInput) => void;
  /** Abre el detalle de un ticket por id. */
  onOpen: (id: string) => void;
  /** Elimina un ticket (con confirmación en el container). */
  onDelete: (id: string) => void;
  /** Navega al resumen de gasto. */
  onGoSpend: () => void;
}

// ── budget_receipt_detail (detalle + edición) ──────────────────────────────────

export interface ReceiptDetailViewProps {
  /** Ticket cargado. */
  receipt: ReceiptDto;
  /** El editor de edición está abierto. */
  isEditing: boolean;
  /** Carga del detalle en curso. */
  isLoading?: boolean;
  /** Mensaje de error del detalle; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** El guardado de la edición está en curso. */
  isSaving?: boolean;
  /** La eliminación está en curso. */
  isDeleting?: boolean;
  /** Vuelve a la lista de tickets. */
  onBack: () => void;
  /** Abre/cierra el modo edición. */
  onToggleEdit: () => void;
  /**
   * Guarda los cambios del ticket. AMPLIADO respecto al kit (`onSave(lines)`):
   * emite el `CreateReceiptInput` completo (merchant + fecha + divisa + líneas).
   */
  onSave: (input: CreateReceiptInput) => void;
  /** Elimina el ticket. */
  onDelete: () => void;
}

// ── budget_spend (resumen de gasto) ────────────────────────────────────────────

export interface SpendViewProps {
  /** Resumen de gasto de la familia (total + por categoría + por mes). */
  summary: SpendSummaryDto;
  /** Carga del resumen en curso. */
  isLoading?: boolean;
  /** Mensaje de error del resumen; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Vuelve a la lista de tickets. */
  onBack: () => void;
}
