/**
 * Helpers presentacionales compartidos por las 4 vistas de `PlanDetailView`.
 *
 * El formulario de edición de plan (título, descripción, fecha, estado) es
 * idéntico en las 4 estéticas: solo cambian las clases CSS. La conversión de
 * fecha (ISO ↔ `datetime-local`) y la construcción del body PATCH viven aquí
 * para no duplicar la lógica en cada theme.
 *
 * Sin JSX, sin dependencias de UI: solo transformaciones puras.
 */

import type { PlanDto, PlanStatus, UpdatePlanInput } from '../contracts';

/** Valores en redacción del formulario de edición (estado de UI de la vista). */
export interface EditPlanFormValues {
  title: string;
  description: string;
  /** Valor del input `datetime-local` (`YYYY-MM-DDTHH:mm`) o cadena vacía. */
  scheduledAt: string;
  status: PlanStatus;
}

/**
 * Convierte un ISO 8601 (`2026-06-15T12:00:00Z`) al formato que espera un input
 * `datetime-local` (`2026-06-15T12:00`), en hora LOCAL del navegador. Devuelve
 * cadena vacía si no hay fecha o si no es parseable.
 */
export function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Ajuste al huso local para que el input muestre la misma hora que se ve.
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Valores iniciales del formulario de edición a partir del plan cargado. */
export function initialEditValues(plan: PlanDto): EditPlanFormValues {
  return {
    title: plan.title,
    description: plan.description ?? '',
    scheduledAt: toDatetimeLocal(plan.scheduledAt),
    status: plan.status,
  };
}

/**
 * Construye el body PATCH a partir de los valores del formulario y el plan
 * actual. Solo incluye los campos que CAMBIARON respecto al plan (PATCH
 * parcial). La fecha se reenvía como ISO.
 *
 * Nota de contrato: `UpdatePlanInputSchema` declara `scheduledAt`/`description`
 * como `optional()` (no `nullable()`), así que el cliente NO puede "borrar" un
 * valor; vaciar el campo simplemente no envía nada (no-op en el servidor).
 */
export function buildUpdatePlanBody(
  values: EditPlanFormValues,
  plan: PlanDto,
): UpdatePlanInput {
  const body: UpdatePlanInput = {};

  const title = values.title.trim();
  if (title && title !== plan.title) body.title = title;

  const description = values.description.trim();
  if (description && description !== (plan.description ?? '')) {
    body.description = description;
  }

  if (values.scheduledAt) {
    const next = new Date(values.scheduledAt);
    // Compara por INSTANTE, no por cadena: el ISO del plan puede venir sin
    // milisegundos (`…00Z`) y el roundtrip los añade (`…00.000Z`), así que la
    // comparación textual daría falsos positivos.
    const prevTime = plan.scheduledAt ? new Date(plan.scheduledAt).getTime() : NaN;
    if (next.getTime() !== prevTime) body.scheduledAt = next.toISOString();
  }

  if (values.status !== plan.status) body.status = values.status;

  return body;
}
