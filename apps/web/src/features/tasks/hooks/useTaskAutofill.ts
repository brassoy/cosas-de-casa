/**
 * useTaskAutofill — autocompletado del formulario de tarea con IA.
 *
 * Llama a `POST /ai/parse-task` con el texto dictado y el `now` actual (la IA
 * resuelve expresiones relativas como "mañana" o "el viernes que viene" a fechas
 * `YYYY-MM-DD`). Espejo de `usePlanAutofill`, pero SIN geocoding: una tarea no
 * tiene lugar, solo título, descripción y dos fechas (recomendada y límite).
 *
 * Degradación graciosa (ADR 0014): un 503 de la IA se traduce a un mensaje
 * legible en español; el usuario siempre puede rellenar los campos a mano.
 */

import { useCallback, useState } from 'react';
import { api, ApiRequestError } from '@/shared/lib/api';
import type { ParseTaskResponse } from '@cosasdecasa/contracts';

/** Resultado del dictado: cada campo presente solo si la IA lo dedujo. */
export interface TaskAutofillResult {
  title?: string;
  description?: string;
  /** Fecha recomendada en formato "YYYY-MM-DD". */
  recommendedDate?: string;
  /** Fecha límite en formato "YYYY-MM-DD". */
  deadlineDate?: string;
}

export interface UseTaskAutofillReturn {
  /** Lanza el autocompletado a partir de una frase en lenguaje natural. */
  autofill: (phrase: string) => Promise<TaskAutofillResult>;
  /** El autocompletado está en curso. */
  isAutofilling: boolean;
  /** Mensaje de error legible del último intento, o `null`. */
  autofillError: string | null;
}

export function useTaskAutofill(): UseTaskAutofillReturn {
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  const autofill = useCallback(async (phrase: string): Promise<TaskAutofillResult> => {
    const trimmed = phrase.trim();
    if (!trimmed) return {};

    setAutofillError(null);
    setIsAutofilling(true);
    try {
      const parsed = await api.post<ParseTaskResponse>('/ai/parse-task', {
        phrase: trimmed,
        now: new Date().toISOString(),
      });

      const result: TaskAutofillResult = {};
      if (parsed.title) result.title = parsed.title;
      if (parsed.description) result.description = parsed.description;
      if (parsed.recommendedDate) result.recommendedDate = parsed.recommendedDate;
      if (parsed.deadlineDate) result.deadlineDate = parsed.deadlineDate;

      return result;
    } catch (err) {
      const message =
        err instanceof ApiRequestError && err.status === 503
          ? 'La IA no está disponible ahora mismo. Inténtalo de nuevo más tarde.'
          : 'No se ha podido dictar la tarea. Inténtalo de nuevo.';
      setAutofillError(message);
      throw new Error(message);
    } finally {
      setIsAutofilling(false);
    }
  }, []);

  return { autofill, isAutofilling, autofillError };
}
