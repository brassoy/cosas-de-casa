import type { JoinPin } from '../join-pin';

export const JOIN_PIN_REPOSITORY = Symbol('JOIN_PIN_REPOSITORY');

/**
 * Puerto de persistencia de {@link JoinPin}.
 *
 * El método clave es {@link consumeActiveByHash}: encapsula el consumo ATÓMICO
 * de un PIN (un único UPDATE condicional + RETURNING) para que el caso de uso
 * de "unirse" sea seguro frente a concurrencia sin conocer SQL.
 */
export interface JoinPinRepository {
  /** Inserta un PIN nuevo (estado ACTIVE). */
  insert(pin: JoinPin): Promise<void>;

  /**
   * Revoca (ACTIVE → REVOKED) el PIN activo de una familia, si lo hay. Operación
   * idempotente: si no había PIN activo no hace nada. Devuelve cuántos revocó.
   */
  revokeActiveByFamily(familyId: string, now: Date): Promise<number>;

  /**
   * Consume de forma ATÓMICA el PIN ACTIVE no caducado cuyo hash coincide:
   * `UPDATE join_pins SET status='CONSUMED', consumed_by, consumed_at
   *  WHERE code_hash = $hash AND status='ACTIVE' AND expires_at > $now
   *  RETURNING family_id`.
   *
   * Devuelve el `familyId` si lo consumió, o `null` si no había ninguno válido
   * (inexistente, caducado, ya consumido o revocado). Garantiza single-use:
   * dos peticiones concurrentes con el mismo código solo verán éxito una vez.
   */
  consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    now: Date;
  }): Promise<{ familyId: string } | null>;
}
