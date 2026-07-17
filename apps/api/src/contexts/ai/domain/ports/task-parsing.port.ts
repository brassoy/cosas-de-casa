/**
 * Puerto de dominio para deducir los campos de una tarea a partir de una frase
 * en lenguaje natural (voz o texto dictado por el usuario).
 *
 * El adaptador usa la API de MiniMax (compatible con Anthropic SDK) con
 * `tool_choice` forzado. Recibe el instante de referencia `now` para resolver
 * expresiones relativas ("mañana", "el viernes", "en dos semanas") y devuelve
 * `recommendedDate` y `deadlineDate` en formato `YYYY-MM-DD` (fecha sin hora).
 *
 * Si la IA no está disponible, DEBE lanzar {@link AiUnavailableError}.
 */

/** Resultado estructurado del parseo de una tarea. Campos no inferidos → `null`. */
export interface ParsedTask {
  /** Título corto propuesto para la tarea, o `null`. */
  title: string | null;
  /** Descripción propuesta, o `null`. */
  description: string | null;
  /** Fecha recomendada para realizar la tarea (YYYY-MM-DD, sin hora), o `null`. */
  recommendedDate: string | null;
  /** Fecha límite (YYYY-MM-DD, sin hora), o `null`. */
  deadlineDate: string | null;
}

export interface TaskParsingPort {
  /**
   * Deduce los campos de la tarea a partir de la frase.
   * @param phrase Texto en lenguaje natural dicho o escrito por el usuario.
   * @param now Instante de referencia (ISO) para resolver expresiones relativas.
   */
  parseTask(phrase: string, now: string): Promise<ParsedTask>;
}

export const TASK_PARSING_PORT = Symbol('TaskParsingPort');
