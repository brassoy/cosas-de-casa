/**
 * Hooks de tareas — online-first con TanStack Query.
 *
 * Endpoints reales del backend:
 *   GET  /families/:familyId/tasks          → TaskDto[]
 *   POST /families/:familyId/tasks          → 201 TaskDto
 *   GET  /tasks/:taskId                     → TaskDto
 *   PATCH /tasks/:taskId                    → TaskDto
 *   PATCH /tasks/:taskId/assignees          → TaskDto  (body: AssigneesInput)
 *   POST /tasks/:taskId/photos              → 201 TaskDto  (photos[] actualizado)
 *   POST /tasks/:taskId/generate-list       → 201 ShoppingListSummaryDto
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShoppingListSummaryDto } from '@cosasdecasa/contracts';
import { api, ApiRequestError } from '@/shared/lib/api';
import { supabase } from '@/shared/lib/supabase';
import imageCompression from 'browser-image-compression';
import type {
  TaskDto,
  CreateTaskInput,
  UpdateTaskInput,
  AssigneesInput,
} from '../types';

export type { ApiRequestError };

// ── Claves de query ───────────────────────────────────────────────────────────

export const taskKeys = {
  all: ['tasks'] as const,
  byFamily: (familyId: string) => ['tasks', 'family', familyId] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFamilyTasks(familyId: string | undefined) {
  return useQuery<TaskDto[]>({
    queryKey: familyId ? taskKeys.byFamily(familyId) : ['tasks', 'none'],
    queryFn: () => api.get<TaskDto[]>(`/families/${familyId!}/tasks`),
    enabled: Boolean(familyId),
  });
}

export function useTaskDetail(taskId: string | undefined) {
  return useQuery<TaskDto>({
    queryKey: taskId ? taskKeys.detail(taskId) : ['tasks', 'detail', 'none'],
    queryFn: () => api.get<TaskDto>(`/tasks/${taskId!}`),
    enabled: Boolean(taskId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTask(familyId: string) {
  const qc = useQueryClient();
  return useMutation<TaskDto, ApiRequestError, CreateTaskInput>({
    mutationFn: (input) => api.post<TaskDto>(`/families/${familyId}/tasks`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.byFamily(familyId) });
    },
  });
}

export function useUpdateTask(taskId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<TaskDto, ApiRequestError, UpdateTaskInput>({
    mutationFn: (input) => api.patch<TaskDto>(`/tasks/${taskId}`, input),
    onSuccess: (updated) => {
      qc.setQueryData<TaskDto>(taskKeys.detail(taskId), updated);
      void qc.invalidateQueries({ queryKey: taskKeys.byFamily(familyId) });
    },
  });
}

export function useUpdateTaskAssignees(taskId: string, familyId: string) {
  const qc = useQueryClient();
  return useMutation<TaskDto, ApiRequestError, AssigneesInput>({
    mutationFn: (input) => api.patch<TaskDto>(`/tasks/${taskId}/assignees`, input),
    onSuccess: (updated) => {
      qc.setQueryData<TaskDto>(taskKeys.detail(taskId), updated);
      void qc.invalidateQueries({ queryKey: taskKeys.byFamily(familyId) });
    },
  });
}

// ── Foto: comprimir → subir a Storage → notificar a la API ───────────────────

const PHOTO_BUCKET = 'task-photos';

export interface UploadPhotoParams {
  taskId: string;
  file: File;
}

async function uploadPhotoToStorage(taskId: string, file: File): Promise<string> {
  // El bucket `task-photos` se aprovisiona como infraestructura (config.toml +
  // migración de Storage), NO desde el cliente: crear buckets con el anon key es
  // un anti-patrón y enmascara el error real. Si no existiera, el upload falla
  // con un mensaje claro.

  // Compresión: máx 1 MB, máx 1600 px en cualquier dimensión.
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });

  // Ruta única dentro del bucket: tasks/<taskId>/<timestamp>-<filename>
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `tasks/${taskId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, compressed, { contentType: compressed.type });

  if (error) throw new Error(`Error al subir la foto: ${error.message}`);

  return storagePath;
}

/**
 * POST /tasks/:taskId/photos → 201 TaskDto
 * La API devuelve la tarea completa con photos[] actualizado.
 */
export function useUploadTaskPhoto(taskId: string, familyId: string) {
  const qc = useQueryClient();

  return useMutation<TaskDto, Error, File>({
    mutationFn: async (file: File) => {
      const storagePath = await uploadPhotoToStorage(taskId, file);
      return api.post<TaskDto>(`/tasks/${taskId}/photos`, { storagePath });
    },
    onSuccess: (updatedTask) => {
      // Actualiza el cache directamente con la tarea devuelta por la API
      qc.setQueryData<TaskDto>(taskKeys.detail(taskId), updatedTask);
      void qc.invalidateQueries({ queryKey: taskKeys.byFamily(familyId) });
    },
  });
}

// ── Generar lista de la compra desde una tarea ─────────────────────────────────

/**
 * POST /tasks/:taskId/generate-list → 201 ShoppingListSummaryDto
 * Navegar con res.id y mostrar res.name.
 */
export function useGenerateShoppingList(taskId: string) {
  return useMutation<ShoppingListSummaryDto, ApiRequestError, void>({
    mutationFn: () =>
      api.post<ShoppingListSummaryDto>(`/tasks/${taskId}/generate-list`, {}),
  });
}

// ── URL pública de Storage ────────────────────────────────────────────────────

export function getPhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
