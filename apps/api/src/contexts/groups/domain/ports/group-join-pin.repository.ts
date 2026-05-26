import type { GroupJoinPin } from '../group-join-pin';

export const GROUP_JOIN_PIN_REPOSITORY = Symbol('GROUP_JOIN_PIN_REPOSITORY');

/**
 * Puerto de persistencia de {@link GroupJoinPin}.
 *
 * El método clave es {@link consumeActiveByHash}: encapsula el consumo ATÓMICO
 * de un PIN (un único UPDATE condicional + RETURNING) para que el caso de uso
 * de "unirse" sea seguro frente a concurrencia sin conocer SQL.
 */
export interface GroupJoinPinRepository {
  /** Inserta un PIN nuevo (estado ACTIVE). */
  insert(pin: GroupJoinPin): Promise<void>;

  /**
   * Revoca (ACTIVE → REVOKED) el PIN activo de una peña, si lo hay. Operación
   * idempotente: si no había PIN activo no hace nada. Devuelve cuántos revocó.
   */
  revokeActiveByGroup(groupId: string, now: Date): Promise<number>;

  /**
   * Consume de forma ATÓMICA el PIN ACTIVE no caducado cuyo hash coincide:
   * `UPDATE group_join_pins SET status='CONSUMED', consumed_by, consumed_at
   *  WHERE code_hash = $hash AND status='ACTIVE' AND expires_at > $now
   *  RETURNING group_id`.
   *
   * Devuelve el `groupId` si lo consumió, o `null` si no había ninguno válido.
   * Garantiza single-use: dos peticiones concurrentes con el mismo código solo
   * verán éxito una vez.
   */
  consumeActiveByHash(params: {
    codeHash: string;
    userId: string;
    now: Date;
  }): Promise<{ groupId: string } | null>;
}
