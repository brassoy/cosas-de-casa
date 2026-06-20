export const ACCOUNT_DELETION_REPOSITORY = Symbol('ACCOUNT_DELETION_REPOSITORY');

/**
 * Familia creada por el usuario que se da de baja, con el dato mínimo necesario
 * para decidir la política de borrado: ¿sobrevive (reasignar `created_by`) o se
 * borra (era el único miembro)?
 */
export interface CreatedFamilySummary {
  familyId: string;
  /**
   * Otros miembros de la familia (sin contar al usuario que se va), ordenados
   * por preferencia para heredar la propiedad: primero los OWNER, luego el resto.
   * Vacío ⇒ el usuario era el único miembro ⇒ la familia se borra.
   */
  otherMembers: { userId: string; isOwner: boolean }[];
}

/**
 * Puerto de persistencia para la BAJA DE CUENTA del usuario autenticado.
 *
 * Vive en `identity-access` porque la baja la dispara este contexto, pero toca
 * tablas de otros contextos (`families`, `memberships`, `join_pins`) a nivel de
 * INFRAESTRUCTURA. El dominio no menciona SQL: solo expresa las operaciones que
 * la política de baja necesita.
 *
 * La FK `families.created_by` y `join_pins.created_by` son `ON DELETE RESTRICT`:
 * borrar el `app_user` directamente fallaría. Por eso primero hay que reasignar
 * o borrar esas filas (ver {@link DeleteAccountUseCase}).
 */
export interface AccountDeletionRepository {
  /**
   * Familias cuyo `created_by` es el usuario, cada una con sus OTROS miembros
   * (los que no son el propio usuario). El caso de uso decide, por familia, si
   * reasignar la propiedad o borrarla.
   */
  findFamiliesCreatedBy(userId: string): Promise<CreatedFamilySummary[]>;

  /** Reasigna `families.created_by` de una familia a otro usuario. */
  reassignFamilyCreator(familyId: string, newCreatorId: string): Promise<void>;

  /**
   * Borra una familia por id. La BD limpia en cascada sus dependientes
   * (memberships, PINs, listas, tareas…). Se usa cuando el usuario era el único
   * miembro de esa familia.
   */
  deleteFamily(familyId: string): Promise<void>;

  /**
   * Borra todos los `join_pins` creados por el usuario (códigos de invitación
   * efímeros). Evita el `RESTRICT` de `join_pins.created_by` al borrar el usuario.
   */
  deleteJoinPinsCreatedBy(userId: string): Promise<void>;

  /**
   * Borra el `app_user`. La BD limpia en cascada sus memberships y pone a null
   * las referencias `ON DELETE SET NULL` (listas/tareas/eventos creados, etc.).
   * Debe llamarse DESPUÉS de resolver familias y pins, o el `RESTRICT` lo bloquea.
   */
  deleteAppUser(userId: string): Promise<void>;
}
