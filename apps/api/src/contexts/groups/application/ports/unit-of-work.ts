import type { GroupRepository } from '../../domain/ports/group.repository';
import type { GroupJoinPinRepository } from '../../domain/ports/group-join-pin.repository';
import type { GroupMembershipRepository } from '../../domain/ports/group-membership.repository';

export const GROUP_UNIT_OF_WORK = Symbol('GROUP_UNIT_OF_WORK');

/** Repositorios ligados a una transacción concreta. */
export interface GroupTransactionalRepositories {
  groups: GroupRepository;
  groupMemberships: GroupMembershipRepository;
  groupJoinPins: GroupJoinPinRepository;
}

/**
 * Puerto de Unit of Work: ejecuta un bloque de trabajo dentro de UNA
 * transacción de base de datos, exponiendo repositorios transaccionales.
 *
 * Lo usan los casos de uso que deben ser atómicos (crear peña + membership;
 * consumir PIN + insertar membership). Si el callback lanza, se hace rollback.
 */
export interface GroupUnitOfWork {
  run<T>(
    work: (repos: GroupTransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T>;
}
