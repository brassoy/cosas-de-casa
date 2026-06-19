/**
 * Contrato de props de las pantallas de la feature `tasks`.
 *
 * Una interface por pantalla (`<Screen>ViewProps`), idéntica para los 4 themes.
 * Es el contrato del componente base del kit (Lovable `tasks.tsx`) reconciliado
 * con los DTOs reales de `@cosasdecasa/contracts`:
 *
 *  - El kit usaba tipos locales `Task` / `TaskDetail` / `TaskAssignee` /
 *    `TaskStatus`. Aquí se usan los DTOs reales que devuelven los hooks:
 *    `TaskDto`, `TaskStatus`, `TaskPhotoDto` y `FamilyMemberDto` (para el
 *    selector de asignados/miembros de la familia).
 *  - El kit unificaba lista y detalle en el mismo `TaskDto`. No hay un
 *    `TaskDetailDto` distinto: `GET /tasks/:id` devuelve el mismo `TaskDto` con
 *    `assignees[]` y `photos[]` poblados.
 *  - `TaskAssigneeDto.displayName` es **nullable** en el contrato; las vistas
 *    deben tolerar `null` (fallback a "—" / inicial vacía).
 *  - El kit pasaba a `PhotoGallery` URLs ya resueltas. Aquí el contrato expone
 *    `photos` como `TaskPhotoView[]` = `TaskPhotoDto` + `url` pública ya resuelta
 *    por el container (`getPhotoPublicUrl`). Así la vista es 100% presentacional
 *    y no toca Supabase Storage.
 *
 * CONTRATO AMPLIADO (plan §2.4 / §7 decisión A): el container computa y pasa el
 * estado de UX que la lógica real necesita —`isSubmitting`, `uploadingPhoto`,
 * `uploadError`, `editError`, `generateError`, `isGeneratingList`— para que la
 * vista refleje fielmente el flujo sin volver a derivarlo.
 *
 * Presentacional puro: solo props in / callbacks out. Sin fetch, sin hooks de
 * datos, sin stores, sin navegación.
 */

import type {
  TaskDto,
  TaskStatus,
  TaskPhotoDto,
  FamilyMemberDto,
} from '@cosasdecasa/contracts';

// ── Tipos derivados de presentación ──────────────────────────────────────────

/**
 * Foto de tarea con su URL pública ya resuelta por el container
 * (`getPhotoPublicUrl(storagePath)`). La vista solo pinta `url`.
 */
export interface TaskPhotoView extends TaskPhotoDto {
  url: string;
}

/**
 * Tarea para la vista: el `TaskDto` real pero con las fotos enriquecidas con su
 * URL pública (resuelta en el container). El resto de campos son del DTO.
 */
export interface TaskView extends Omit<TaskDto, 'photos'> {
  photos: TaskPhotoView[];
}

/** Valores que emite el formulario de creación al enviar. */
export interface CreateTaskFormValues {
  title: string;
  description?: string;
  recommendedDate?: string;
  deadlineDate?: string;
  assigneeIds: string[];
}

/** Valores que emite el formulario de edición al guardar (sin estado/asignados). */
export interface EditTaskFormValues {
  title: string;
  description?: string;
  recommendedDate?: string;
  deadlineDate?: string;
}

// ── tasks_list (listado + filtros + crear) ────────────────────────────────────

export interface TasksListViewProps {
  /** Tareas de la familia (ya filtradas por el container según los filtros). */
  tasks: TaskDto[];
  /** Miembros de la familia, para el selector de asignados/filtro. */
  members: FamilyMemberDto[];
  /** Carga del listado en curso. */
  isLoading?: boolean;
  /** Mensaje de error del listado; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** Filtro de estado activo (`'ALL'` = todos). */
  statusFilter: TaskStatus | 'ALL';
  /** Filtro de asignado activo (`'ALL'` = cualquiera). */
  assigneeFilter: string | 'ALL';
  /** Id del usuario actual (preselección por defecto en el diálogo de crear). */
  currentUserId: string;
  /**
   * El diálogo de crear está abierto. El container es dueño del estado para poder
   * cerrarlo SOLO al éxito de la mutación (en error se mantiene abierto con
   * `createError`), igual que el patrón de fridge.
   */
  createOpen: boolean;
  /** La creación de la tarea está en curso. */
  isCreating?: boolean;
  /** Error de la creación; `null`/`undefined` si no hay error. */
  createError?: string | null;
  /** Cambia el filtro de estado. */
  onChangeStatusFilter: (value: TaskStatus | 'ALL') => void;
  /** Cambia el filtro de asignado. */
  onChangeAssigneeFilter: (value: string | 'ALL') => void;
  /** Abre/cierra el diálogo de crear (apertura por el usuario, cierre por cancelar). */
  onChangeCreateOpen: (open: boolean) => void;
  /** Abre el detalle de una tarea por id. */
  onOpen: (id: string) => void;
  /** Crea una tarea con los valores del formulario. */
  onCreate: (values: CreateTaskFormValues) => void;
}

// ── tasks_detail (detalle + edición + estado + fotos + generar lista) ──────────

export interface TaskDetailViewProps {
  /** Tarea cargada, con las fotos enriquecidas con su URL pública. */
  task: TaskView;
  /** El formulario de edición está abierto. */
  isEditing: boolean;
  /** Miembros de la familia, para el selector de asignados. */
  members: FamilyMemberDto[];
  /** Carga del detalle en curso. */
  isLoading?: boolean;
  /** Mensaje de error del detalle; `null`/`undefined` si no hay error. */
  error?: string | null;
  /** El guardado de la edición está en curso. */
  isSaving?: boolean;
  /** Error al guardar la edición. */
  editError?: string | null;
  /** Hay un cambio de estado en curso. */
  isUpdatingStatus?: boolean;
  /** La subida de la foto está en curso (compresión + Storage + API). */
  uploadingPhoto?: boolean;
  /** Error al subir la foto. */
  uploadError?: string | null;
  /** La generación de la lista de la compra está en curso. */
  isGeneratingList?: boolean;
  /** Error al generar la lista. */
  generateError?: string | null;
  /** Vuelve al listado de tareas. */
  onBack: () => void;
  /** Alterna el modo edición (abrir / cancelar). */
  onToggleEdit: () => void;
  /** Guarda los cambios de la edición (campos, sin estado ni asignados). */
  onSave: (values: EditTaskFormValues) => void;
  /** Reemplaza la lista de asignados de la tarea. */
  onSetAssignees: (ids: string[]) => void;
  /** Cambia el estado de la tarea. */
  onSetStatus: (status: TaskStatus) => void;
  /** Sube una foto (compresión + Storage la maneja el container). */
  onUploadPhoto: (file: File) => void;
  /** Genera una lista de la compra a partir de la tarea (navega el container). */
  onGenerateShoppingList: () => void;
  /**
   * Borra la tarea (con confirmación en el container). Opcional para no romper
   * consumidores/tests existentes; si no se pasa, la vista oculta la acción.
   */
  onDeleteTask?: () => void;
  /** El borrado de la tarea está en curso. */
  isDeleting?: boolean;
  /** Error al borrar la tarea. */
  deleteError?: string | null;
  /**
   * Borra una foto de la tarea por id (con confirmación en el container).
   * Opcional para no romper consumidores/tests existentes; si no se pasa, la
   * galería no muestra el botón de borrar foto.
   */
  onDeletePhoto?: (photoId: string) => void;
  /** El borrado de alguna foto está en curso. */
  isDeletingPhoto?: boolean;
}

export type { TaskDto, TaskStatus, TaskPhotoDto, FamilyMemberDto };
