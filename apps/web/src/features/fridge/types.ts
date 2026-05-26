/**
 * Tipos de UI para la feature de la nevera.
 *
 * Los tipos de dominio (FridgeItemDto, FridgeLocation, AddFridgeItemInput,
 * UpdateFridgeItemInput, EatFridgeItemInput) vienen de @cosasdecasa/contracts.
 *
 * Este archivo solo re-exporta lo necesario para los consumidores internos de la
 * feature y expone los helpers de presentación propios de la UI.
 */

import type { FridgeLocation } from '@cosasdecasa/contracts';

export type { FridgeLocation, FridgeItemDto } from '@cosasdecasa/contracts';

// ── Constantes de UI ──────────────────────────────────────────────────────────

export const FRIDGE_LOCATION_LABELS: Record<FridgeLocation, string> = {
  FRIDGE: 'Nevera',
  FREEZER: 'Congelador',
  PANTRY: 'Despensa',
};

/**
 * Nivel de urgencia por caducidad.
 * - expired : ya ha caducado (incluye hoy)
 * - warning : caduca en 2 días o menos
 * - ok      : caduca en más de 2 días
 * - none    : sin fecha de caducidad
 */
export type ExpiryUrgency = 'expired' | 'warning' | 'ok' | 'none';

/** Calcula el nivel de urgencia a partir de la fecha de caducidad (YYYY-MM-DD). */
export function getExpiryUrgency(expiryDate: string | null): ExpiryUrgency {
  if (!expiryDate) return 'none';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00'); // evita desfase de zona horaria
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'expired';
  if (diffDays <= 2) return 'warning';
  return 'ok';
}

/** Devuelve el color CSS apropiado según el token de theming para cada urgencia. */
export function urgencyColor(urgency: ExpiryUrgency): string {
  switch (urgency) {
    case 'expired':
      return 'var(--color-error)';
    case 'warning':
      return 'var(--color-warning)';
    case 'ok':
      return 'var(--color-success)';
    case 'none':
      return 'var(--color-text-muted)';
  }
}

/** Etiqueta legible de la urgencia. */
export function urgencyLabel(urgency: ExpiryUrgency, expiryDate: string | null): string {
  if (!expiryDate) return '';
  switch (urgency) {
    case 'expired':
      return 'Caducado';
    case 'warning': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDate + 'T00:00:00');
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Caduca hoy';
      if (diffDays === 1) return 'Caduca mañana';
      return `Caduca en ${diffDays} días`;
    }
    case 'ok':
      return `Caduca el ${new Date(expiryDate + 'T00:00:00').toLocaleDateString('es-ES')}`;
    case 'none':
      return '';
  }
}
