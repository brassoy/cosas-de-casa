import { Inject, Injectable } from '@nestjs/common';
import { InvalidJoinPinError } from '../domain/family.errors';
import { JoinPinCode } from '../domain/join-pin-code';
import { Membership } from '../domain/membership';
import { MembershipRole } from '../domain/membership-role';
import { CLOCK, type Clock } from './ports/clock';
import { HASHER, type Hasher } from './ports/hasher';
import { ID_GENERATOR, type IdGenerator } from './ports/id-generator';
import { UNIT_OF_WORK, type UnitOfWork } from './ports/unit-of-work';

export interface JoinFamilyByPinCommand {
  actingUserId: string;
  /** Código en claro introducido por el usuario. */
  code: string;
}

export interface JoinFamilyByPinResult {
  familyId: string;
  /** `false` si el usuario ya pertenecía a la familia (idempotente). */
  joined: boolean;
}

/**
 * Caso de uso: unirse a una familia con un PIN (un solo uso, ATÓMICO).
 *
 * Pasos dentro de UNA transacción:
 *  1. `consumeActiveByHash`: UPDATE condicional que pasa el PIN ACTIVE no
 *     caducado a CONSUMED y devuelve el `familyId`. Si no devuelve nada, el
 *     código es inválido/caducado/ya usado → {@link InvalidJoinPinError}.
 *  2. INSERT de la membership (rol MEMBER) con ON CONFLICT DO NOTHING, por si
 *     el usuario ya pertenecía a la familia.
 *
 * La atomicidad del paso 1 garantiza el single-use frente a concurrencia: dos
 * peticiones simultáneas con el mismo código solo verán éxito una vez.
 */
@Injectable()
export class JoinFamilyByPinUseCase {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: JoinFamilyByPinCommand): Promise<JoinFamilyByPinResult> {
    const code = JoinPinCode.fromString(command.code);
    const codeHash = await this.hasher.hash(code.value);
    const now = this.clock.now();

    return this.uow.run(
      async (repos) => {
        const consumed = await repos.joinPins.consumeActiveByHash({
          codeHash,
          userId: command.actingUserId,
          now,
        });
        if (!consumed) {
          throw new InvalidJoinPinError();
        }

        const membership = new Membership({
          id: this.ids.generate(),
          familyId: consumed.familyId,
          userId: command.actingUserId,
          role: MembershipRole.MEMBER,
          joinedAt: now,
        });
        const joined = await repos.memberships.insert(membership);

        return { familyId: consumed.familyId, joined };
      },
      { actingUserId: command.actingUserId },
    );
  }
}
