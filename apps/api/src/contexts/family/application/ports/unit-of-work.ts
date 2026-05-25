import type { FamilyRepository } from '../../domain/ports/family.repository';
import type { JoinPinRepository } from '../../domain/ports/join-pin.repository';
import type { MembershipRepository } from '../../domain/ports/membership.repository';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/** Repositorios ligados a una transacción concreta. */
export interface TransactionalRepositories {
  families: FamilyRepository;
  memberships: MembershipRepository;
  joinPins: JoinPinRepository;
}

/**
 * Puerto de Unit of Work: ejecuta un bloque de trabajo dentro de UNA
 * transacción de base de datos, exponiendo repositorios transaccionales.
 *
 * Lo usan los casos de uso que deben ser atómicos (crear familia + membership;
 * consumir PIN + insertar membership). Si el callback lanza, se hace rollback.
 *
 * `actingUserId` permite al adaptador fijar el contexto de identidad de la
 * transacción (p. ej. `SET LOCAL request.jwt.claims` para RLS) antes de ejecutar.
 */
export interface UnitOfWork {
  run<T>(
    work: (repos: TransactionalRepositories) => Promise<T>,
    options?: { actingUserId?: string },
  ): Promise<T>;
}
