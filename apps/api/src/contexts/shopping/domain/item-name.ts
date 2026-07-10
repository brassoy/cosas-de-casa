/**
 * Normalización MÍNIMA de nombres de ítems para detectar duplicados dentro de
 * una misma lista de la compra.
 *
 * Es una réplica intencionadamente reducida de la normalización del contexto
 * `ai` (`ai/domain/item-normalizer.ts`) para NO acoplar el dominio shopping al
 * dominio ai: aquí solo necesitamos igualar "Leche" ↔ "leche " (mayúsculas,
 * unicode y espacios), no singularizar ni extraer atributos semánticos.
 */
export function normalizeItemNameForMatch(raw: string): string {
  return raw.toLowerCase().normalize('NFC').trim().replace(/\s+/g, ' ');
}
