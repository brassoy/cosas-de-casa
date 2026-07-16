import type { Routine } from '../routine';

export const ROUTINE_REPOSITORY = Symbol('ROUTINE_REPOSITORY');

export interface ListRoutinesFilter {
  /** Rutinas cuyo rango [startDate, endDate] solapa [from, to]. */
  from?: string;
  to?: string;
}

/**
 * Puerto de persistencia de rutinas. `findById`/`findByFamily` devuelven el
 * agregado HIDRATADO (selections + assignments + incidents).
 */
export interface RoutineRepository {
  /** Persiste una rutina nueva con todos sus hijos. */
  create(routine: Routine): Promise<void>;

  /** Busca una rutina por su id, hidratada. */
  findById(routineId: string): Promise<Routine | null>;

  /** Rutinas de una familia (hidratadas), opcionalmente filtradas por rango. */
  findByFamily(familyId: string, filter?: ListRoutinesFilter): Promise<Routine[]>;

  /**
   * Rutina de la familia cuya semana solapa la semana que empieza en
   * `startDate`, si existe. `excludeRoutineId` permite ignorarse a sí misma.
   */
  findOverlapping(
    familyId: string,
    startDate: string,
    excludeRoutineId?: string,
  ): Promise<Routine | null>;

  /**
   * Persiste los cambios de una rutina existente sincronizando los hijos por
   * diff (insert/update/delete), sin recrear filas que no cambian.
   */
  save(routine: Routine): Promise<void>;

  /** Elimina una rutina (hijos en cascade). */
  deleteById(routineId: string): Promise<void>;
}
