/**
 * Puerto de dominio para deducir los campos de un plan a partir de una frase
 * en lenguaje natural (voz o texto de la descripción).
 *
 * El adaptador usa la API de MiniMax (compatible con Anthropic SDK) con
 * `tool_choice` forzado. Recibe el instante de referencia `now` para resolver
 * expresiones relativas ("en dos horas") y devuelve `scheduledAt` en ISO.
 *
 * Si la IA no está disponible, DEBE lanzar {@link AiUnavailableError}.
 */

/** Resultado estructurado del parseo de un plan. Campos no inferidos → `null`. */
export interface ParsedPlan {
  /** Título corto propuesto para el plan, o `null`. */
  title: string | null;
  /** Descripción propuesta, o `null`. */
  description: string | null;
  /** Fecha/hora del plan en ISO 8601 (relativas ya resueltas), o `null`. */
  scheduledAt: string | null;
  /** Consulta de lugar buscable en mapas (sitio + ciudad), o `null`. */
  placeQuery: string | null;
}

export interface PlanParsingPort {
  /**
   * Deduce los campos del plan a partir de la frase.
   * @param phrase Texto en lenguaje natural dicho o escrito por el usuario.
   * @param now Instante de referencia (ISO) para resolver expresiones relativas.
   */
  parsePlan(phrase: string, now: string): Promise<ParsedPlan>;
}

export const PLAN_PARSING_PORT = Symbol('PlanParsingPort');
