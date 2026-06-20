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
 * Peña (grupo) creada por el usuario que se da de baja. Mismo patrón que
 * {@link CreatedFamilySummary}: si quedan otros miembros la peña sobrevive
 * (reasignando `created_by`); si era el único miembro se borra.
 */
export interface CreatedGroupSummary {
  groupId: string;
  /**
   * Otros miembros de la peña (sin contar al usuario que se va), ordenados por
   * preferencia para heredar la propiedad: primero los OWNER, luego el resto.
   * Vacío ⇒ el usuario era el único miembro ⇒ la peña se borra.
   */
  otherMembers: { userId: string; isOwner: boolean }[];
}

/**
 * Puerto de persistencia para la BAJA DE CUENTA del usuario autenticado.
 *
 * Vive en `identity-access` porque la baja la dispara este contexto, pero toca
 * tablas de otros contextos (`families`, `memberships`, `join_pins`, `groups`,
 * `plans`, `receipts`…) a nivel de INFRAESTRUCTURA. El dominio no menciona SQL:
 * solo expresa las operaciones que la política de baja necesita.
 *
 * Varias FK que apuntan a `app_users` son `ON DELETE RESTRICT`: borrar el
 * `app_user` directamente fallaría. Por eso primero hay que reasignar o borrar
 * esas filas (ver {@link DeleteAccountUseCase}). En concreto, son RESTRICT:
 * `families.created_by`, `join_pins.created_by`, `groups.created_by`,
 * `group_join_pins.created_by`, `friend_invite_pins.created_by`,
 * `plans.created_by`, `plan_messages.user_id` y `receipts.created_by`.
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
   * Peñas (grupos) cuyo `created_by` es el usuario, cada una con sus OTROS
   * miembros. El caso de uso decide, por peña, si reasignar la propiedad o
   * borrarla. Mismo patrón que {@link findFamiliesCreatedBy}.
   */
  findGroupsCreatedBy(userId: string): Promise<CreatedGroupSummary[]>;

  /** Reasigna `groups.created_by` de una peña a otro usuario. */
  reassignGroupCreator(groupId: string, newCreatorId: string): Promise<void>;

  /**
   * Borra una peña por id. La BD limpia en cascada sus dependientes
   * (group_memberships, group_join_pins…). Se usa cuando el usuario era el único
   * miembro de esa peña.
   */
  deleteGroup(groupId: string): Promise<void>;

  /**
   * Borra todos los `group_join_pins` creados por el usuario. Evita el
   * `RESTRICT` de `group_join_pins.created_by` al borrar el usuario.
   */
  deleteGroupJoinPinsCreatedBy(userId: string): Promise<void>;

  /**
   * Borra todos los `friend_invite_pins` creados por el usuario. Evita el
   * `RESTRICT` de `friend_invite_pins.created_by` al borrar el usuario.
   */
  deleteFriendInvitePinsCreatedBy(userId: string): Promise<void>;

  /**
   * Borra todos los `plan_messages` enviados por el usuario (en cualquier plan).
   * Evita el `RESTRICT` de `plan_messages.user_id` al borrar el usuario. Debe ir
   * ANTES de borrar los planes del propio usuario para no chocar con sus mensajes.
   */
  deletePlanMessagesByUser(userId: string): Promise<void>;

  /**
   * Borra todos los `plans` creados por el usuario. La BD limpia en cascada sus
   * dependientes (plan_shares, plan_participants, plan_messages de esos planes).
   * Evita el `RESTRICT` de `plans.created_by` al borrar el usuario.
   */
  deletePlansCreatedBy(userId: string): Promise<void>;

  /**
   * Borra todos los `receipts` creados por el usuario. La BD limpia en cascada
   * sus líneas (receipt_lines). Evita el `RESTRICT` de `receipts.created_by` al
   * borrar el usuario.
   */
  deleteReceiptsCreatedBy(userId: string): Promise<void>;

  /**
   * Borra el `app_user`. La BD limpia en cascada sus memberships y pone a null
   * las referencias `ON DELETE SET NULL` (listas/tareas/eventos creados, etc.).
   * Debe llamarse DESPUÉS de resolver familias, grupos, PINs, mensajes, planes y
   * recibos, o algún `RESTRICT` lo bloquea.
   */
  deleteAppUser(userId: string): Promise<void>;
}
