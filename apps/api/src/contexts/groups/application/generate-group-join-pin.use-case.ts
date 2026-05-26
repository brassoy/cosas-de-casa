import { Inject, Injectable } from '@nestjs/common';
import { GroupNotFoundError, NotAGroupOwnerError } from '../domain/group.errors';
import { GroupJoinPin } from '../domain/group-join-pin';
import { GROUP_REPOSITORY, type GroupRepository } from '../domain/ports/group.repository';
import { CLOCK, type Clock } from '../../family/application/ports/clock';
import { HASHER, type Hasher } from '../../family/application/ports/hasher';
import { ID_GENERATOR, type IdGenerator } from '../../family/application/ports/id-generator';
import { RANDOM_BYTES, type RandomBytes } from '../../family/application/ports/random-bytes';
import { GROUP_UNIT_OF_WORK, type GroupUnitOfWork } from './ports/unit-of-work';
import { JoinPinCode } from '../../family/domain/join-pin-code';

export interface GenerateGroupJoinPinCommand {
  actingUserId: string;
  groupId: string;
}

export interface GenerateGroupJoinPinResult {
  /** Código en claro, devuelto UNA sola vez. */
  code: string;
  expiresAt: Date;
}

/**
 * Caso de uso: generar un PIN de invitación para una peña (solo OWNER).
 *
 * Revoca de forma atómica el PIN ACTIVE previo (si lo hay) y emite uno nuevo,
 * de modo que como mucho exista un PIN activo por peña. Devuelve el código en
 * claro una vez; en la BD solo queda su hash.
 */
@Injectable()
export class GenerateGroupJoinPinUseCase {
  private static readonly ENTROPY_BYTES = 16;

  constructor(
    @Inject(GROUP_REPOSITORY) private readonly groups: GroupRepository,
    @Inject(GROUP_UNIT_OF_WORK) private readonly uow: GroupUnitOfWork,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM_BYTES) private readonly random: RandomBytes,
  ) {}

  async execute(command: GenerateGroupJoinPinCommand): Promise<GenerateGroupJoinPinResult> {
    const group = await this.groups.findById(command.groupId);
    if (!group) {
      throw new GroupNotFoundError();
    }
    if (!group.isOwner(command.actingUserId)) {
      throw new NotAGroupOwnerError();
    }

    const now = this.clock.now();
    const code = JoinPinCode.fromRandomBytes(
      this.random.bytes(GenerateGroupJoinPinUseCase.ENTROPY_BYTES),
    );
    const codeHash = await this.hasher.hash(code.value);

    const pin = GroupJoinPin.issue({
      id: this.ids.generate(),
      groupId: group.id,
      codeHash,
      createdBy: command.actingUserId,
      now,
    });

    await this.uow.run(
      async (repos) => {
        await repos.groupJoinPins.revokeActiveByGroup(group.id, now);
        await repos.groupJoinPins.insert(pin);
      },
      { actingUserId: command.actingUserId },
    );

    return { code: code.value, expiresAt: pin.expiresAt };
  }
}
