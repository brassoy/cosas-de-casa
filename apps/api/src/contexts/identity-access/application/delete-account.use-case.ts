import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_DELETION_REPOSITORY,
  type AccountDeletionRepository,
} from '../domain/ports/account-deletion.repository';
import {
  AUTH_USER_ADMIN,
  type AuthUserAdmin,
} from '../domain/ports/auth-user-admin.port';

export interface DeleteAccountCommand {
  /** uid del usuario autenticado (claim `sub` / `app_users.id`). */
  userId: string;
}

/**
 * Caso de uso: el usuario autenticado BORRA su cuenta de forma permanente.
 *
 * Política (respeta al resto de miembros de familias y peñas):
 *   1. Por cada FAMILIA que creó: si quedan otros miembros → reasigna `created_by`
 *      (OWNER preferente) para que SOBREVIVA; si era el único → la borra (cascade).
 *   2. Por cada PEÑA (grupo) que creó: mismo patrón (reasignar o borrar).
 *   3. Borra los PINs efímeros que creó (familias, peñas, amistades).
 *   4. Borra los `plan_messages` que envió y los `plans` que creó (cascade).
 *   5. Borra los `receipts` que creó (cascade limpia sus líneas).
 *   6. Borra el `app_user` (cascade borra sus memberships; SET NULL en lo demás).
 *   7. Borra el usuario de Supabase Auth (no-op si no hay service-role configurada).
 *
 * Los pasos 1-5 van ANTES del 6 porque esas FKs a `app_users` son `ON DELETE
 * RESTRICT` (`families`/`groups`/`*_pins`.created_by, `plans`.created_by,
 * `plan_messages`.user_id, `receipts`.created_by): borrar el usuario sin
 * resolverlas lo bloquearía a nivel de BD. El resto lo cubre la propia BD con
 * CASCADE y SET NULL.
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(ACCOUNT_DELETION_REPOSITORY)
    private readonly accountDeletion: AccountDeletionRepository,
    @Inject(AUTH_USER_ADMIN)
    private readonly authUserAdmin: AuthUserAdmin,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const { userId } = command;

    // 1. Familias creadas por el usuario: reasignar (si sobreviven) o borrar.
    const createdFamilies = await this.accountDeletion.findFamiliesCreatedBy(userId);
    for (const family of createdFamilies) {
      const heir = pickHeir(family.otherMembers);
      if (heir) {
        await this.accountDeletion.reassignFamilyCreator(family.familyId, heir);
      } else {
        await this.accountDeletion.deleteFamily(family.familyId);
      }
    }

    // 2. Peñas (grupos) creadas por el usuario: mismo patrón que las familias.
    const createdGroups = await this.accountDeletion.findGroupsCreatedBy(userId);
    for (const group of createdGroups) {
      const heir = pickHeir(group.otherMembers);
      if (heir) {
        await this.accountDeletion.reassignGroupCreator(group.groupId, heir);
      } else {
        await this.accountDeletion.deleteGroup(group.groupId);
      }
    }

    // 3. PINs efímeros creados por el usuario (familias, peñas, amistades).
    await this.accountDeletion.deleteJoinPinsCreatedBy(userId);
    await this.accountDeletion.deleteGroupJoinPinsCreatedBy(userId);
    await this.accountDeletion.deleteFriendInvitePinsCreatedBy(userId);

    // 4. Planes: primero los mensajes que ENVIÓ (en cualquier plan), luego los
    //    planes que CREÓ (cascade limpia shares/participants/messages restantes).
    await this.accountDeletion.deletePlanMessagesByUser(userId);
    await this.accountDeletion.deletePlansCreatedBy(userId);

    // 5. Recibos creados por el usuario (cascade limpia sus líneas).
    await this.accountDeletion.deleteReceiptsCreatedBy(userId);

    // 6. El app_user (cascade: memberships; set null: contenido creado).
    await this.accountDeletion.deleteAppUser(userId);

    // 7. La credencial en el proveedor de Auth (no-op sin service-role).
    await this.authUserAdmin.deleteAuthUser(userId);
  }
}

/**
 * Elige a quién hereda la propiedad (de una familia o una peña): primero un OWNER
 * distinto del usuario; si no hay otro OWNER, cualquier otro miembro. Devuelve
 * `undefined` si el usuario era el único miembro (se borra en ese caso).
 */
function pickHeir(
  otherMembers: { userId: string; isOwner: boolean }[],
): string | undefined {
  if (otherMembers.length === 0) {
    return undefined;
  }
  const owner = otherMembers.find((m) => m.isOwner);
  return (owner ?? otherMembers[0]!).userId;
}
