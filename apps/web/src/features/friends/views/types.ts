/**
 * Contrato de props de las pantallas de la feature `friends` (familias amigas).
 *
 * Una interface por pantalla. NO hay componente base en el kit de Lovable para
 * friends (ver plan §4, filas 26-27 y la observación transversal de GAPS), así
 * que el contrato lo DEFINIMOS nosotros a partir de los hooks reales y lo
 * materializamos primero en `base` como referencia para los themes alternativos.
 *
 * Tipos de datos derivados de `@cosasdecasa/contracts` (no tipos locales del kit):
 *  - `FriendFamilyDto` para la lista de familias amigas.
 *  - El código de invitación es `string` (el `FriendInviteResponse.code` que
 *    expone `useGenerateFriendInvite`).
 *
 * Presentacional puro: solo props in / callbacks out. La lógica (familyId del
 * store, mutaciones, clipboard, navegación, invalidaciones) vive en el container.
 */

import type { FriendFamilyDto } from '../contracts';

// ── friends (lista + invitar + canjear) ─────────────────────────────────────

export interface FriendsViewProps {
  /** Familias amigas actuales (o undefined mientras carga la primera vez). */
  friends?: FriendFamilyDto[];
  /** La query de familias amigas está en curso. */
  isLoading?: boolean;
  /** La query de familias amigas falló (error de carga). */
  error?: boolean;
  /** Código de invitación recién generado (o null si aún no se generó). */
  generatedCode?: string | null;
  /** La mutación de generar invitación está en curso. */
  isGenerating?: boolean;
  /** Mensaje de error al generar la invitación (null si no hay). */
  inviteError?: string | null;
  /** Mensaje de error al quitar una amistad (null si no hay). */
  removeError?: string | null;
  /** linkId de la amistad que se está quitando (para feedback por tarjeta). */
  removingLinkId?: string | null;
  /** Genera un nuevo código de invitación de un solo uso. */
  onGenerateInvite: () => void;
  /** Copia el código al portapapeles (el container posee `navigator.clipboard`). */
  onCopy: (code: string) => void;
  /** Quita una familia amiga por su `linkId` (tras confirmación en la vista). */
  onRemove: (linkId: string) => void;
  /** Navega a la pantalla de canjear código. */
  onGoRedeem: () => void;
  /** Navega atrás (inicio de la familia). */
  onBack: () => void;
}

// ── friends_redeem (canjear código) ─────────────────────────────────────────

export interface FriendRedeemViewProps {
  /** Valor controlado del campo de código. */
  code: string;
  /** Nombre de la familia activa que canjea (para el texto descriptivo). */
  familyName?: string | null;
  /** Mensaje de error (validación o respuesta del backend). */
  error?: string | null;
  /** La mutación de canje está en curso. */
  isSubmitting?: boolean;
  /** Actualiza el valor del campo de código. */
  onCodeChange: (value: string) => void;
  /** Envía el formulario de canje. */
  onSubmit: () => void;
  /** Navega atrás (familias amigas). */
  onBack: () => void;
}
