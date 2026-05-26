import { Inject, Injectable } from '@nestjs/common';
import { InvalidGroupJoinPinError } from '../domain/group.errors';
import { GroupMembership } from '../domain/group-membership';
import { GroupRole } from '../domain/group-role';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { HASHER, type Hasher } from '../../family/application/ports/hasher';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';
import { JoinPinCode } from '../../family/domain/join-pin-code';

export interface JoinGroupByPinCommand {
  actingUserId: string;
  /** Código en claro introducido por el usuario. */
  code: string;
}

export interface JoinGroupByPinResult {
  groupId: string;
  /** `false` si el usuario ya pertenecía a la peña (idempotente). */
  joined: boolean;
}

/**
 * Caso de uso: unirse a una peña con un PIN (un solo uso, ATÓMICO).
 *
 * Pasos dentro de UNA transacción:
 *  1. `consumeActiveByHash`: UPDATE condicional que pasa el PIN ACTIVE no
 *     caducado a CONSUMED y devuelve el `groupId`. Si no devuelve nada, el
 *     código es inválido/caducado/ya usado → {@link InvalidGroupJoinPinError}.
 *  2. INSERT de la membership (rol MEMBER) con ON CONFLICT DO NOTHING.
 *
 * La atomicidad garantiza el single-use frente a concurrencia.
 */
@Injectable()
export class JoinGroupByPinUseCase {
  constructor(
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: JoinGroupByPinCommand): Promise<JoinGroupByPinResult> {
    // Reutilizamos JoinPinCode porque el formato del PIN es idéntico.
    const code = JoinPinCode.fromString(command.code);
    const codeHash = await this.hasher.hash(code.value);
    const now = this.clock.now();

    return this.uow.run(
      async (repos) => {
        const consumed = await repos.groupJoinPins.consumeActiveByHash({
          codeHash,
          userId: command.actingUserId,
          now,
        });
        if (!consumed) {
          throw new InvalidGroupJoinPinError();
        }

        const membership = new GroupMembership({
          id: this.ids.generate(),
          groupId: consumed.groupId,
          userId: command.actingUserId,
          role: GroupRole.MEMBER,
          joinedAt: now,
        });
        const joined = await repos.groupMemberships.insert(membership);

        return { groupId: consumed.groupId, joined };
      },
      { actingUserId: command.actingUserId },
    );
  }
}
