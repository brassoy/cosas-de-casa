import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_DELETION_REPOSITORY,
  type AccountDeletionRepository,
  type CreatedFamilySummary,
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
 * Política (respeta al resto de miembros de cada familia):
 *   1. Por cada familia que CREÓ el usuario:
 *        - Si tiene otros miembros → reasigna `created_by` a otro miembro
 *          (preferiblemente un OWNER) para que la familia SOBREVIVA.
 *        - Si era el único miembro → borra la familia (cascade limpia su contenido).
 *   2. Borra los `join_pins` que creó (códigos efímeros; evita el RESTRICT de la FK).
 *   3. Borra el `app_user` (cascade borra sus memberships; SET NULL en lo demás).
 *   4. Borra el usuario de Supabase Auth (no-op si no hay service-role configurada).
 *
 * Los pasos 1-2 deben ir ANTES del 3 porque `families.created_by` y
 * `join_pins.created_by` son `ON DELETE RESTRICT`: borrar el usuario antes de
 * resolverlos lo bloquearía a nivel de BD.
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
      const heir = pickHeir(family);
      if (heir) {
        await this.accountDeletion.reassignFamilyCreator(family.familyId, heir);
      } else {
        await this.accountDeletion.deleteFamily(family.familyId);
      }
    }

    // 2. PINs de invitación creados por el usuario (evita el RESTRICT de la FK).
    await this.accountDeletion.deleteJoinPinsCreatedBy(userId);

    // 3. El app_user (cascade: memberships; set null: contenido creado).
    await this.accountDeletion.deleteAppUser(userId);

    // 4. La credencial en el proveedor de Auth (no-op sin service-role).
    await this.authUserAdmin.deleteAuthUser(userId);
  }
}

/**
 * Elige a quién hereda la propiedad de la familia: primero un OWNER distinto del
 * usuario; si no hay otro OWNER, cualquier otro miembro. Devuelve `undefined` si
 * el usuario era el único miembro (la familia se borra en ese caso).
 */
function pickHeir(family: CreatedFamilySummary): string | undefined {
  if (family.otherMembers.length === 0) {
    return undefined;
  }
  const owner = family.otherMembers.find((m) => m.isOwner);
  return (owner ?? family.otherMembers[0]!).userId;
}
