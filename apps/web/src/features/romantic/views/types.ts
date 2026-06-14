/**
 * Contrato de props de las pantallas de la feature `romantic`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * El contrato parte del componente base del kit (`/screens/romantic.tsx`) pero se
 * reconcilia con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - `couple`     → `CoupleDto | null` (el kit usaba un tipo local `Couple`).
 *  - `members`    → `FamilyMemberDto[]` (el kit usaba `{ userId; displayName }[]`,
 *                   subconjunto del DTO; mantenemos el DTO completo).
 *  - `challenges` → `CoupleChallengeDto[]`.
 *  - `notes`      → `CoupleNoteDto[]` (el DTO NO trae `authorName`; la vista lo
 *                   resuelve a partir de `members` + `currentUserId`).
 *
 * Además del contrato del kit, exponemos lo que la lógica real necesita
 * (estados de envío, errores parciales por sección) para conservar TODA la
 * funcionalidad de los containers/subcomponentes actuales.
 */

import type {
  CoupleDto,
  CoupleNoteDto,
  CoupleChallengeDto,
  FamilyMemberDto,
} from '@cosasdecasa/contracts';
import type { RomanticTab } from '../types';

export interface RomanticViewProps {
  // ── Datos ──────────────────────────────────────────────────────────────────
  /** Pareja del usuario. `null` = 404 del backend (sin pareja) → render PairUp. */
  couple: CoupleDto | null;
  /** Miembros de la familia (candidatos a emparejar + resolución de nombres). */
  members: FamilyMemberDto[];
  challenges: CoupleChallengeDto[];
  notes: CoupleNoteDto[];
  /** userId del usuario actual (de `useAuthStore`): burbujas propias y excluir de candidatos. */
  currentUserId: string;

  // ── Estado del rincón (con pareja) ───────────────────────────────────────────
  /** Carga inicial de la pareja. */
  isLoading?: boolean;
  /** Error de carga de la pareja. */
  error?: string | null;
  tab: RomanticTab;
  /** Mensaje efímero tras una maldad (se borra a los 4 s en el container). */
  mischiefFeedback?: string | null;
  /** La mutación de maldad está en vuelo (deshabilita el botón). */
  isSendingMischief?: boolean;

  // ── Estado de la pestaña Retos ───────────────────────────────────────────────
  challengesLoading?: boolean;
  challengesError?: string | null;
  /** challengeKey que se está marcando como hecho (spinner por item). */
  markingChallengeKey?: string | null;

  // ── Estado de la pestaña Notas ───────────────────────────────────────────────
  notesLoading?: boolean;
  notesError?: string | null;
  /** La mutación de añadir nota está en vuelo. */
  isAddingNote?: boolean;
  /** Error al añadir una nota (se muestra junto al composer). */
  addNoteError?: string | null;

  // ── Estado del emparejamiento (sin pareja) ───────────────────────────────────
  /** La mutación de crear pareja está en vuelo. */
  isCreatingCouple?: boolean;
  /** Error al crear la pareja (mensaje del backend). */
  pairUpError?: string | null;

  // ── Callbacks ────────────────────────────────────────────────────────────────
  onChangeTab: (tab: RomanticTab) => void;
  onPairUp: (partnerUserId: string) => void;
  onToggleChallenge: (challengeKey: string) => void;
  onAddNote: (body: string) => void;
  onMischief: () => void;
}
