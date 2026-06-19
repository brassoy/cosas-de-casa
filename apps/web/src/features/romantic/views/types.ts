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
  ChallengeCatalogEntryDto,
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
  /** La mutación de disolver la pareja está en vuelo. */
  isDissolving?: boolean;

  // ── Estado de la pestaña Retos ───────────────────────────────────────────────
  challengesLoading?: boolean;
  challengesError?: string | null;
  /** challengeKey que se está marcando como hecho (spinner por item). */
  markingChallengeKey?: string | null;

  // ── Añadir reto (catálogo) ───────────────────────────────────────────────────
  /** Catálogo de retos disponibles (se carga al abrir el selector). */
  challengeCatalog: ChallengeCatalogEntryDto[];
  /** El catálogo se está cargando. */
  isLoadingCatalog?: boolean;
  /** Error al cargar el catálogo de retos. */
  catalogError?: string | null;
  /** Carga el catálogo bajo demanda (al abrir el selector de "añadir reto"). */
  onLoadCatalog: () => void;
  /** Añade un reto del catálogo a la pareja por su `key`. */
  onAddChallenge: (challengeKey: string) => void;
  /** `key` del reto del catálogo que se está añadiendo (spinner por item). */
  addingChallengeKey?: string | null;

  // ── Estado de la pestaña Notas ───────────────────────────────────────────────
  notesLoading?: boolean;
  notesError?: string | null;
  /** La mutación de añadir nota está en vuelo. */
  isAddingNote?: boolean;
  /** Error al añadir una nota (se muestra junto al composer). */
  addNoteError?: string | null;
  /** `id` de la nota que se está borrando (spinner por item). */
  deletingNoteId?: string | null;
  /** Borra una nota de la pareja por su `id`. */
  onDeleteNote: (noteId: string) => void;

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
  /** Disuelve la pareja (acción destructiva: la confirmación vive en la vista). */
  onDissolveCouple: () => void;
}
